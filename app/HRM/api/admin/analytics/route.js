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
  if (normalized === 'notice_period') return 'Notice Period';
  return normalized
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDateLabel(value) {
  if (!value) return '--';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

function formatWeekdayLabel(value) {
  if (!value) return '--';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
  });
}

function formatDateLong(value) {
  if (!value) return '--';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function toDateOnly(value) {
  return value ? String(value).slice(0, 10) : null;
}

function getEmployeeDepartment(employee) {
  return Array.isArray(employee?.department)
    ? employee.department[0]?.name || 'Department not set'
    : employee?.department?.name || 'Department not set';
}

function getEmployeeDesignation(employee) {
  return Array.isArray(employee?.designation)
    ? employee.designation[0]?.title || 'Designation not set'
    : employee?.designation?.title || 'Designation not set';
}

function buildLifecycleDistribution(employees = []) {
  const bucketMap = new Map([
    ['active', { key: 'active', label: 'Active' }],
    ['on_leave', { key: 'on_leave', label: 'On Leave' }],
    ['probation', { key: 'probation', label: 'Probation' }],
    ['notice_period', { key: 'notice_period', label: 'Notice Period' }],
    ['separated', { key: 'separated', label: 'Separated' }],
    ['other', { key: 'other', label: 'Other' }],
  ]);

  employees.forEach((employee) => {
    const employment = deriveEmploymentFields(employee);
    const currentStage = String(employment.currentStage || '').trim().toLowerCase();
    const lifecycleStatus = String(employment.employmentLifecycleStatus || '').trim().toLowerCase();

    let bucketKey = 'active';
    if (lifecycleStatus === 'separated') {
      bucketKey = 'separated';
    } else if (currentStage === 'on_leave') {
      bucketKey = 'on_leave';
    } else if (currentStage === 'probation') {
      bucketKey = 'probation';
    } else if (currentStage === 'notice_period') {
      bucketKey = 'notice_period';
    } else if (lifecycleStatus !== 'active') {
      bucketKey = 'other';
    }

    const entry = bucketMap.get(bucketKey);
    entry.count = (entry.count || 0) + 1;
  });

  const total = employees.length || 1;
  return Array.from(bucketMap.values())
    .filter((item) => item.count)
    .map((item) => ({
      ...item,
      share: Math.round(((item.count || 0) / total) * 100),
    }))
    .sort((left, right) => right.count - left.count);
}

function buildDepartmentDistribution(employees = []) {
  const departmentMap = new Map();

  employees.forEach((employee) => {
    const department = getEmployeeDepartment(employee);
    const employment = deriveEmploymentFields(employee);
    const record = departmentMap.get(department) || {
      department,
      count: 0,
      activeCount: 0,
      onLeaveCount: 0,
    };

    record.count += 1;
    if (employment.employmentLifecycleStatus === 'active') {
      record.activeCount += 1;
    }
    if (employment.currentStage === 'on_leave') {
      record.onLeaveCount += 1;
    }

    departmentMap.set(department, record);
  });

  const total = employees.length || 1;
  return Array.from(departmentMap.values())
    .map((item) => ({
      ...item,
      share: Math.round((item.count / total) * 100),
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.department.localeCompare(right.department);
    })
    .slice(0, 8);
}

function buildRecentJoiners(employees = [], selectedMonth) {
  const today = new Date(`${getCurrentDateInTimeZone()}T00:00:00`);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const normalizedJoiners = employees
    .map((employee) => {
      const joinedOn = toDateOnly(employee.date_of_joining) || toDateOnly(employee.created_at);
      if (!joinedOn) return null;

      return {
        id: employee.id,
        employeeId: employee.employee_id || '--',
        name: employee.name || 'Employee',
        department: getEmployeeDepartment(employee),
        designation: getEmployeeDesignation(employee),
        joinedOn,
        profilePictureUrl: employee.profile_picture_url || '',
      };
    })
    .filter(Boolean)
    .sort((left, right) => String(right.joinedOn).localeCompare(String(left.joinedOn)));

  const joinedThisMonth = normalizedJoiners.filter((item) => String(item.joinedOn).slice(0, 7) === selectedMonth).length;
  const joinedLast30Days = normalizedJoiners.filter((item) => new Date(`${item.joinedOn}T00:00:00`) >= thirtyDaysAgo).length;

  return {
    joinedThisMonth,
    joinedLast30Days,
    cards: normalizedJoiners.slice(0, 6),
  };
}

function buildAttendanceInsights(attendanceRows = [], employeeMap = new Map()) {
  const attendanceCounts = {
    present: 0,
    late: 0,
    absent: 0,
    halfday: 0,
    on_leave: 0,
  };
  const lateByEmployee = new Map();
  const absentByEmployee = new Map();
  const byDate = new Map();
  const byWeekday = new Map();

  attendanceRows.forEach((row) => {
    const status = normalizeAttendanceStatus(row.status);
    if (status in attendanceCounts) {
      attendanceCounts[status] += 1;
    }

    if (status === 'late' && row.employee_id) {
      lateByEmployee.set(row.employee_id, (lateByEmployee.get(row.employee_id) || 0) + 1);
    }

    if (status === 'absent' && row.employee_id) {
      absentByEmployee.set(row.employee_id, (absentByEmployee.get(row.employee_id) || 0) + 1);
    }

    const dateKey = String(row.date || '');
    const dateRecord = byDate.get(dateKey) || {
      date: dateKey,
      present: 0,
      late: 0,
      absent: 0,
      halfday: 0,
      onLeave: 0,
      total: 0,
    };

    if (status === 'present') dateRecord.present += 1;
    if (status === 'late') dateRecord.late += 1;
    if (status === 'absent') dateRecord.absent += 1;
    if (status === 'halfday') dateRecord.halfday += 1;
    if (status === 'on_leave') dateRecord.onLeave += 1;
    dateRecord.total += 1;
    byDate.set(dateKey, dateRecord);

    const weekdayKey = formatWeekdayLabel(dateKey);
    const weekdayRecord = byWeekday.get(weekdayKey) || {
      key: weekdayKey,
      label: weekdayKey,
      present: 0,
      late: 0,
      absent: 0,
      onLeave: 0,
      total: 0,
    };

    if (status === 'present') weekdayRecord.present += 1;
    if (status === 'late') weekdayRecord.late += 1;
    if (status === 'absent') weekdayRecord.absent += 1;
    if (status === 'on_leave') weekdayRecord.onLeave += 1;
    weekdayRecord.total += 1;
    byWeekday.set(weekdayKey, weekdayRecord);
  });

  const totalRows = attendanceRows.length;
  const punctualityScore = totalRows ? Math.round(((attendanceCounts.present + attendanceCounts.halfday) / totalRows) * 100) : 0;
  const attentionRate = totalRows ? Math.round(((attendanceCounts.late + attendanceCounts.absent) / totalRows) * 100) : 0;

  const mapWatchlist = (sourceMap, keyName) =>
    Array.from(sourceMap.entries())
      .map(([employeeDbId, count]) => {
        const employee = employeeMap.get(employeeDbId);
        if (!employee) return null;

        return {
          id: employeeDbId,
          employeeId: employee.employeeId,
          name: employee.name,
          department: employee.department,
          designation: employee.designation,
          [keyName]: count,
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (right[keyName] !== left[keyName]) {
          return right[keyName] - left[keyName];
        }
        return left.name.localeCompare(right.name);
      })
      .slice(0, 6);

  const distribution = [
    { key: 'present', label: 'Present', count: attendanceCounts.present },
    { key: 'late', label: 'Late', count: attendanceCounts.late },
    { key: 'absent', label: 'Absent', count: attendanceCounts.absent },
    { key: 'halfday', label: 'Half Day', count: attendanceCounts.halfday },
    { key: 'on_leave', label: 'On Leave', count: attendanceCounts.on_leave },
  ].map((item) => ({
    ...item,
    statusLabel: formatStatusLabel(item.key),
    percentage: totalRows ? Math.round((item.count / totalRows) * 100) : 0,
  }));

  const dailyTrend = Array.from(byDate.values())
    .sort((left, right) => String(left.date).localeCompare(String(right.date)))
    .map((item) => ({
      ...item,
      label: formatDateLabel(item.date),
      punctualityScore: item.total ? Math.round(((item.present + item.halfday) / item.total) * 100) : 0,
    }));

  const weekdayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekdayTrend = Array.from(byWeekday.values()).sort(
    (left, right) => weekdayOrder.indexOf(left.key) - weekdayOrder.indexOf(right.key)
  );

  return {
    totalRows,
    punctualityScore,
    attentionRate,
    distribution,
    dailyTrend,
    weekdayTrend,
    topLateEmployees: mapWatchlist(lateByEmployee, 'lateCount'),
    topAbsentEmployees: mapWatchlist(absentByEmployee, 'absentCount'),
  };
}

function buildLeaveInsights(leaveRows = [], employeeMap = new Map()) {
  const summary = {
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    lopDaysTotal: 0,
  };
  const typeMap = new Map();

  leaveRows.forEach((row) => {
    const status = String(row.status || '').trim().toLowerCase();
    if (status === 'pending') summary.pendingCount += 1;
    if (status === 'approved') {
      summary.approvedCount += 1;
      summary.lopDaysTotal += Number(row.lop_days || 0);
    }
    if (status === 'rejected') summary.rejectedCount += 1;

    const leaveTypeName = row.leave_type?.name || 'Other';
    typeMap.set(leaveTypeName, (typeMap.get(leaveTypeName) || 0) + 1);
  });

  const typeDistribution = Array.from(typeMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);

  const today = getCurrentDateInTimeZone();
  const upcomingApproved = leaveRows
    .filter((row) => String(row.status || '').trim().toLowerCase() === 'approved')
    .filter((row) => String(row.end_date || '') >= today)
    .map((row) => {
      const employee = employeeMap.get(row.employee_id);
      if (!employee) return null;

      return {
        id: row.id,
        employeeId: employee.employeeId,
        name: employee.name,
        department: employee.department,
        designation: employee.designation,
        startDate: row.start_date,
        endDate: row.end_date,
        session: row.applied_session || row.session || 'full_day',
        leaveType: row.leave_type?.name || 'Leave',
      };
    })
    .filter(Boolean)
    .sort((left, right) => String(left.startDate).localeCompare(String(right.startDate)))
    .slice(0, 6);

  return {
    ...summary,
    typeDistribution,
    upcomingApproved,
  };
}

function buildNarratives({ attendance, workforce, queue }) {
  const narratives = [];

  if (workforce.departmentDistribution[0]) {
    const leadDepartment = workforce.departmentDistribution[0];
    narratives.push({
      id: 'department-footprint',
      eyebrow: 'Workforce Shape',
      title: `${leadDepartment.department} is the largest team footprint`,
      body: `${leadDepartment.count} employees sit in this department, which is ${leadDepartment.share}% of the visible workforce.`,
    });
  }

  narratives.push({
    id: 'attendance-quality',
    eyebrow: 'Attendance Quality',
    title: `${attendance.punctualityScore}% of monthly attendance is on-time or workable`,
    body: `${attendance.attentionRate}% of attendance rows need extra attention through late or absent marks.`,
  });

  const queueLabel =
    queue.pendingTaskCount >= 16 ? 'High focus workload'
    : queue.pendingTaskCount >= 8 ? 'Steady review workload'
    : 'Controlled review workload';
  narratives.push({
    id: 'queue-pressure',
    eyebrow: 'Operations Pulse',
    title: queueLabel,
    body: `${queue.pendingTaskCount} live HR action items are open across leave, regularization, expenses, and tickets.`,
  });

  narratives.push({
    id: 'hiring-momentum',
    eyebrow: 'Movement',
    title: `${workforce.joinedThisMonth} new joiners landed this month`,
    body: `${workforce.joinedLast30Days} people have joined in the last 30 days, which helps show current hiring momentum.`,
  });

  return narratives;
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

    const [
      dashboardData,
      attendanceResult,
      leaveMonthResult,
      leavePendingResult,
      regularizationResult,
      expensesResult,
      ticketsResult,
    ] = await Promise.all([
      getHrAdminDashboardData(),
      adminClient
        .from('hrm_attendance')
        .select('employee_id, date, status')
        .gte('date', start)
        .lte('date', end),
      adminClient
        .from('hrm_leave_requests')
        .select(`
          id,
          employee_id,
          start_date,
          end_date,
          status,
          lop_days,
          session,
          applied_session,
          reviewed_at,
          leave_type:hrm_leave_types (name)
        `)
        .lte('start_date', end)
        .gte('end_date', start),
      adminClient
        .from('hrm_leave_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
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
    ]);

    if (attendanceResult.error) {
      throw new Error(attendanceResult.error.message || 'Failed to load attendance analytics');
    }
    if (leaveMonthResult.error) {
      throw new Error(leaveMonthResult.error.message || 'Failed to load leave analytics');
    }
    if (leavePendingResult.error) {
      throw new Error(leavePendingResult.error.message || 'Failed to load pending leave analytics');
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

    const employees = dashboardData.employees || [];
    const employeeMap = new Map(
      employees.map((employee) => [
        employee.id,
        {
          id: employee.id,
          employeeId: employee.employee_id || '--',
          name: employee.name || 'Employee',
          department: getEmployeeDepartment(employee),
          designation: getEmployeeDesignation(employee),
          profilePictureUrl: employee.profile_picture_url || '',
        },
      ])
    );

    const attendance = buildAttendanceInsights(attendanceResult.data || [], employeeMap);
    const leave = buildLeaveInsights(leaveMonthResult.data || [], employeeMap);
    const workforce = {
      departmentDistribution: buildDepartmentDistribution(employees),
      lifecycleDistribution: buildLifecycleDistribution(employees),
      ...buildRecentJoiners(employees, month),
    };

    const openTicketCount = (ticketsResult.data || []).filter((ticket) => !isTicketClosedStatus(ticket.status)).length;
    const queue = {
      pendingRegularizationCount: regularizationResult.count || 0,
      pendingExpenseReviewCount: expensesResult.count || 0,
      openTicketCount,
      pendingLeaveCount: leavePendingResult.count || 0,
      pendingTaskCount:
        (leavePendingResult.count || 0) +
        (regularizationResult.count || 0) +
        (expensesResult.count || 0) +
        openTicketCount,
      pressureLabel:
        (leavePendingResult.count || 0) + (regularizationResult.count || 0) + (expensesResult.count || 0) + openTicketCount >= 16
          ? 'High focus'
          : (leavePendingResult.count || 0) + (regularizationResult.count || 0) + (expensesResult.count || 0) + openTicketCount >= 8
            ? 'Steady'
            : 'Calm',
    };

    const narratives = buildNarratives({ attendance, workforce, queue });

    return NextResponse.json(
      {
        success: true,
        filters: {
          month,
          start,
          end,
          startAt,
          endAt,
        },
        attendance,
        leave,
        workforce,
        queue,
        narratives,
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
