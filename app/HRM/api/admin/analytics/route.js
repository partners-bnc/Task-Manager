import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import { getHrAdminDashboardData } from '@/utils/hr-admins';
import { deriveEmploymentFields } from '@/utils/hrm-employment';
import { getCurrentDateInTimeZone, getDateRangeForMonth, mapDbStatusToUiStatus } from '@/utils/attendance';
import { isTicketClosedStatus } from '@/utils/tickets';

async function requireHrAdminAccess() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const authContext = await resolveAuthenticatedUserContext(supabase, user);
  if (!authContext?.isHrAdmin || !authContext.hrAdmin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { authContext };
}

function buildMonthTimestampRange(month) {
  const { start, end } = getDateRangeForMonth(month);
  return {
    start,
    end,
    startAt: `${start}T00:00:00.000Z`,
    endAt: `${end}T23:59:59.999Z`,
  };
}

function normalizeAttendanceStatus(status) {
  return mapDbStatusToUiStatus(status, false);
}

function formatStatusLabel(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) return '--';
  if (normalized === 'on_leave') return 'On Leave';
  if (normalized === 'halfday' || normalized === 'half_day') return 'Half Day';
  return normalized
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export async function GET(request) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) {
      return auth.error;
    }

    const url = new URL(request.url);
    const month = url.searchParams.get('month') || getCurrentDateInTimeZone().slice(0, 7);
    const { start, end, startAt, endAt } = buildMonthTimestampRange(month);
    const today = getCurrentDateInTimeZone();

    const [
      dashboardData,
      attendanceResult,
      leavePendingResult,
      leaveReviewedResult,
      regularizationResult,
      expensesResult,
      ticketsResult,
      lateTodayResult,
    ] = await Promise.all([
      getHrAdminDashboardData(),
      adminClient
        .from('hrm_attendance')
        .select('employee_id, date, status')
        .gte('date', start)
        .lte('date', end),
      adminClient
        .from('hrm_leave_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      adminClient
        .from('hrm_leave_requests')
        .select('id, status, lop_days, reviewed_at')
        .gte('reviewed_at', startAt)
        .lte('reviewed_at', endAt),
      adminClient
        .from('hrm_regularization_request_recipients')
        .select('id, request:hrm_regularization_requests!inner(id, status)', { count: 'exact' })
        .eq('recipient_type', 'approver')
        .eq('recipient_role', 'hr_admin')
        .eq('recipient_auth_user_id', auth.authContext.userId)
        .eq('decision_status', 'pending')
        .eq('request.status', 'pending'),
      adminClient
        .from('hrm_expense_claims')
        .select('id', { count: 'exact', head: true })
        .eq('reviewer_auth_user_id', auth.authContext.userId)
        .eq('status', 'submitted'),
      adminClient
        .from('hrm_tickets')
        .select('id, status')
        .eq('owner_auth_user_id', auth.authContext.userId),
      adminClient
        .from('hrm_attendance')
        .select('id', { count: 'exact', head: true })
        .eq('date', today)
        .eq('status', 'late'),
    ]);

    if (attendanceResult.error) {
      throw new Error(attendanceResult.error.message || 'Failed to load attendance analytics');
    }
    if (leavePendingResult.error) {
      throw new Error(leavePendingResult.error.message || 'Failed to load pending leave analytics');
    }
    if (leaveReviewedResult.error) {
      throw new Error(leaveReviewedResult.error.message || 'Failed to load leave analytics');
    }
    if (regularizationResult.error) {
      throw new Error(regularizationResult.error.message || 'Failed to load regularization analytics');
    }
    if (expensesResult.error) {
      throw new Error(expensesResult.error.message || 'Failed to load expense analytics');
    }
    if (ticketsResult.error) {
      throw new Error(ticketsResult.error.message || 'Failed to load ticket analytics');
    }
    if (lateTodayResult.error) {
      throw new Error(lateTodayResult.error.message || 'Failed to load late attendance analytics');
    }

    const employees = dashboardData.employees || [];
    const employeeMap = new Map(
      employees.map((employee) => [
        employee.id,
        {
          id: employee.id,
          employeeId: employee.employee_id || '--',
          name: employee.name || 'Employee',
          department: Array.isArray(employee.department)
            ? employee.department[0]?.name || 'Department not set'
            : employee.department?.name || 'Department not set',
          designation: Array.isArray(employee.designation)
            ? employee.designation[0]?.title || 'Designation not set'
            : employee.designation?.title || 'Designation not set',
        },
      ])
    );

    const activeEmployees = employees.filter(
      (employee) => deriveEmploymentFields(employee).employmentLifecycleStatus === 'active'
    );
    const onLeaveEmployees = employees.filter(
      (employee) => deriveEmploymentFields(employee).currentStage === 'on_leave'
    );

    const attendanceRows = attendanceResult.data || [];
    const attendanceCounts = {
      present: 0,
      late: 0,
      absent: 0,
      halfday: 0,
      on_leave: 0,
    };
    const lateByEmployee = new Map();

    for (const row of attendanceRows) {
      const status = normalizeAttendanceStatus(row.status);
      if (status in attendanceCounts) {
        attendanceCounts[status] += 1;
      }

      if (status === 'late' && row.employee_id) {
        lateByEmployee.set(row.employee_id, (lateByEmployee.get(row.employee_id) || 0) + 1);
      }
    }

    const reviewedLeaveRows = leaveReviewedResult.data || [];
    const leaveSummary = reviewedLeaveRows.reduce(
      (summary, row) => {
        const normalizedStatus = String(row.status || '').trim().toLowerCase();
        if (normalizedStatus === 'approved') {
          summary.approvedCount += 1;
          summary.lopDaysTotal += Number(row.lop_days || 0);
        }
        if (normalizedStatus === 'rejected') {
          summary.rejectedCount += 1;
        }
        return summary;
      },
      {
        approvedCount: 0,
        rejectedCount: 0,
        lopDaysTotal: 0,
      }
    );

    const openTicketCount = (ticketsResult.data || []).filter((ticket) => !isTicketClosedStatus(ticket.status)).length;
    const queue = {
      pendingRegularizationCount: regularizationResult.count || 0,
      pendingExpenseReviewCount: expensesResult.count || 0,
      openTicketCount,
      pendingTaskCount:
        (leavePendingResult.count || 0) +
        (regularizationResult.count || 0) +
        (expensesResult.count || 0) +
        openTicketCount,
    };

    const topLateEmployees = Array.from(lateByEmployee.entries())
      .map(([employeeDbId, lateCount]) => {
        const employee = employeeMap.get(employeeDbId);
        if (!employee) {
          return null;
        }

        return {
          id: employeeDbId,
          employeeId: employee.employeeId,
          name: employee.name,
          department: employee.department,
          designation: employee.designation,
          lateCount,
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (right.lateCount !== left.lateCount) {
          return right.lateCount - left.lateCount;
        }
        return left.name.localeCompare(right.name);
      })
      .slice(0, 8);

    const distribution = [
      { key: 'present', label: 'Present', count: attendanceCounts.present },
      { key: 'late', label: 'Late', count: attendanceCounts.late },
      { key: 'absent', label: 'Absent', count: attendanceCounts.absent },
      { key: 'halfday', label: 'Half Day', count: attendanceCounts.halfday },
      { key: 'on_leave', label: 'On Leave', count: attendanceCounts.on_leave },
    ].map((item) => ({
      ...item,
      statusLabel: formatStatusLabel(item.key),
    }));

    return NextResponse.json(
      {
        success: true,
        filters: {
          month,
          start,
          end,
        },
        snapshot: {
          totalEmployees: employees.length,
          activeEmployees: activeEmployees.length,
          employeesOnLeave: onLeaveEmployees.length,
          todayLateAttendance: lateTodayResult.count || 0,
        },
        attendance: {
          presentCount: attendanceCounts.present,
          lateCount: attendanceCounts.late,
          absentCount: attendanceCounts.absent,
          halfDayCount: attendanceCounts.halfday,
          totalRows: attendanceRows.length,
          distribution,
        },
        leave: {
          pendingCount: leavePendingResult.count || 0,
          approvedCount: leaveSummary.approvedCount,
          rejectedCount: leaveSummary.rejectedCount,
          lopDaysTotal: leaveSummary.lopDaysTotal,
        },
        queue,
        highlights: {
          topLateEmployees,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error loading HR admin analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load HR admin analytics' },
      { status: 500 }
    );
  }
}
