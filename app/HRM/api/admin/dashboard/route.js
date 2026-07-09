import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import { getHrAdminDashboardSnapshot } from '@/utils/hr-admins';
import { deriveEmploymentFields } from '@/utils/hrm-employment';
import { getCurrentDateInTimeZone } from '@/utils/attendance';
import { isTicketClosedStatus } from '@/utils/tickets';

function getUpcomingBirthdays(employees = []) {
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return employees
    .filter((employee) => employee.date_of_birth)
    .map((employee) => {
      const birthDate = new Date(`${employee.date_of_birth}T00:00:00`);
      const nextBirthday = new Date(todayMidnight.getFullYear(), birthDate.getMonth(), birthDate.getDate());

      if (nextBirthday < todayMidnight) {
        nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
      }

      return {
        id: employee.id,
        name: employee.name,
        employee_id: employee.employee_id,
        date_of_birth: employee.date_of_birth,
        profile_picture_url: employee.profile_picture_url,
        daysUntilBirthday: Math.ceil((nextBirthday.getTime() - todayMidnight.getTime()) / 86400000),
      };
    })
    .sort((left, right) => left.daysUntilBirthday - right.daysUntilBirthday)
    .slice(0, 5);
}

function getUpcomingAnniversaries(employees = []) {
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return employees
    .filter((employee) => employee.date_of_joining)
    .map((employee) => {
      const joinDate = new Date(`${employee.date_of_joining}T00:00:00`);
      const nextAnniversary = new Date(todayMidnight.getFullYear(), joinDate.getMonth(), joinDate.getDate());

      if (nextAnniversary < todayMidnight) {
        nextAnniversary.setFullYear(nextAnniversary.getFullYear() + 1);
      }

      const completedYears = nextAnniversary.getFullYear() - joinDate.getFullYear();
      if (completedYears < 1) {
        return null;
      }

      return {
        id: employee.id,
        name: employee.name,
        employee_id: employee.employee_id,
        date_of_joining: employee.date_of_joining,
        profile_picture_url: employee.profile_picture_url,
        daysUntilAnniversary: Math.ceil((nextAnniversary.getTime() - todayMidnight.getTime()) / 86400000),
        completedYears,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.daysUntilAnniversary - right.daysUntilAnniversary)
    .slice(0, 5);
}

function toDateOnly(value) {
  return value ? String(value).slice(0, 10) : null;
}

function buildLifecycleReminders(employees = []) {
  const todayDate = new Date().toISOString().slice(0, 10);

  return employees
    .filter((employee) => {
      const employment = deriveEmploymentFields(employee);
      if (employment.currentStage === 'probation' && toDateOnly(employee.probation_ends_at)) {
        return toDateOnly(employee.probation_ends_at) < todayDate;
      }

      if (employment.currentStage === 'notice_period' && toDateOnly(employee.notice_ends_at)) {
        return toDateOnly(employee.notice_ends_at) < todayDate;
      }

      return false;
    })
    .map((employee) => {
      const employment = deriveEmploymentFields(employee);
      const isProbation = employment.currentStage === 'probation';
      const dueDate = isProbation ? toDateOnly(employee.probation_ends_at) : toDateOnly(employee.notice_ends_at);

      return {
        id: employee.id,
        employee_id: employee.employee_id,
        name: employee.name,
        profile_picture_url: employee.profile_picture_url || '',
        stage: employment.currentStage,
        dueDate,
        title: isProbation ? 'Probation completed' : 'Notice period completed',
        message: isProbation
          ? 'Remove probation manually when HR confirms the employee has completed probation.'
          : 'Review the employee notice period and update their stage manually.',
      };
    })
    .sort((left, right) => String(left.dueDate || '').localeCompare(String(right.dueDate || '')));
}

async function getEmployeesOnLeaveToday(employees = []) {
  const today = getCurrentDateInTimeZone();
  const employeeMap = new Map((employees || []).map((employee) => [employee.id, employee]));

  const { data, error } = await adminClient
    .from('hrm_leave_requests')
    .select('id, employee_id, start_date, end_date, status, total_days, approved_days, paid_days, lop_days, applied_session')
    .eq('status', 'approved')
    .lte('start_date', today)
    .gte('end_date', today)
    .order('start_date', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to load employees on leave');
  }

  return (data || [])
    .map((row) => {
      const employee = employeeMap.get(row.employee_id);
      if (!employee) {
        return null;
      }

      return {
        id: row.id,
        employeeId: employee.id,
        employeeCode: employee.employee_id || '',
        name: employee.name || 'Employee',
        profilePictureUrl: employee.profile_picture_url || '',
        designation: employee.designation?.title || '',
        department: employee.department?.name || '',
        startDate: row.start_date,
        endDate: row.end_date,
        session: row.applied_session || 'full_day',
        totalDays: Number(row.approved_days ?? row.total_days ?? 0),
      };
    })
    .filter(Boolean)
    .slice(0, 6);
}

async function getPendingTaskMetrics(authContext) {
  const today = getCurrentDateInTimeZone();

  const [leaveResult, regularizationResult, expensesResult, ticketsResult, halfDayAttendanceResult, allHrmTicketResult] = await Promise.all([
    adminClient
      .from('hrm_leave_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    adminClient
      .from('hrm_regularization_request_recipients')
      .select('id, request:hrm_regularization_requests!inner(id, status)', { count: 'exact' })
      .eq('recipient_type', 'approver')
      .eq('recipient_role', 'hr_admin')
      .eq('recipient_auth_user_id', authContext.userId)
      .eq('decision_status', 'pending')
      .eq('request.status', 'pending'),
    adminClient
      .from('hrm_expense_claims')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'submitted'),
    adminClient
      .from('hrm_tickets')
      .select('id, status')
      .eq('module_key', 'hrm')
      .eq('owner_auth_user_id', authContext.userId),
    adminClient
      .from('hrm_tickets')
      .select('id, status, is_late, is_sla_breached')
      .eq('module_key', 'hrm'),
    adminClient
      .from('hrm_attendance')
      .select('id', { count: 'exact', head: true })
      .eq('date', today)
      .in('status', ['halfday', 'half_day']),
  ]);

  if (leaveResult.error) {
    throw new Error(leaveResult.error.message || 'Failed to load leave task count');
  }
  if (regularizationResult.error) {
    throw new Error(regularizationResult.error.message || 'Failed to load regularization task count');
  }
  if (expensesResult.error) {
    throw new Error(expensesResult.error.message || 'Failed to load expense task count');
  }
  if (ticketsResult.error) {
    throw new Error(ticketsResult.error.message || 'Failed to load ticket task count');
  }
  if (allHrmTicketResult.error) {
    throw new Error(allHrmTicketResult.error.message || 'Failed to load HRM ticket metrics');
  }
  if (halfDayAttendanceResult.error) {
    throw new Error(halfDayAttendanceResult.error.message || 'Failed to load half day attendance count');
  }

  const openTickets = (ticketsResult.data || []).filter((ticket) => !isTicketClosedStatus(ticket.status)).length;
  const pendingTaskCount =
    (leaveResult.count || 0) +
    (regularizationResult.count || 0) +
    (expensesResult.count || 0) +
    openTickets;

  return {
    pendingTaskCount,
    todayHalfDayAttendanceCount: halfDayAttendanceResult.count || 0,
    openTicketCount: (allHrmTicketResult.data || []).filter((ticket) => !isTicketClosedStatus(ticket.status)).length,
    lateTicketCount: (allHrmTicketResult.data || []).filter((ticket) => ticket.is_late && !ticket.is_sla_breached && !isTicketClosedStatus(ticket.status)).length,
    breachedTicketCount: (allHrmTicketResult.data || []).filter((ticket) => ticket.is_sla_breached && !isTicketClosedStatus(ticket.status)).length,
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authContext = await resolveAuthenticatedUserContext(supabase, user);
    if (!authContext?.isHrAdmin || !authContext.hrAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [{ hrAdmins, employees, recentEmployees, departmentCount, designationCount }, taskMetrics] = await Promise.all([
      getHrAdminDashboardSnapshot(),
      getPendingTaskMetrics(authContext),
    ]);
    const employeesOnLeaveToday = await getEmployeesOnLeaveToday(employees);

    const activeEmployees = employees.filter(
      (employee) => deriveEmploymentFields(employee).employmentLifecycleStatus === 'active'
    );

    return NextResponse.json({
      success: true,
      admin: {
        name: authContext.hrAdmin.name,
        email: authContext.hrAdmin.email,
        department: authContext.hrAdmin.department?.name || '',
        designation: authContext.hrAdmin.designation?.title || '',
      },
      metrics: {
        hrAdminCount: hrAdmins.length,
        employeeCount: employees.length,
        activeEmployeeCount: activeEmployees.length,
        onLeaveEmployeeCount: employeesOnLeaveToday.length,
        departmentCount,
        designationCount,
        pendingTaskCount: taskMetrics.pendingTaskCount,
        todayHalfDayAttendanceCount: taskMetrics.todayHalfDayAttendanceCount,
        openTicketCount: taskMetrics.openTicketCount,
        lateTicketCount: taskMetrics.lateTicketCount,
        breachedTicketCount: taskMetrics.breachedTicketCount,
      },
      recentEmployees,
      employeesOnLeaveToday,
      recentHrAdmins: hrAdmins.slice(0, 5),
      upcomingBirthdays: getUpcomingBirthdays(activeEmployees),
      upcomingAnniversaries: getUpcomingAnniversaries(activeEmployees),
      lifecycleReminders: buildLifecycleReminders(employees),
    });
  } catch (error) {
    console.error('Error fetching HR admin dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch HR admin dashboard' }, { status: 500 });
  }
}
