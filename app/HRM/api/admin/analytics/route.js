import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import { getHrAdminDashboardData } from '@/utils/hr-admins';
import { deriveEmploymentFields } from '@/utils/hrm-employment';
import { getCurrentDateInTimeZone, getDateRangeForMonth, mapDbStatusToUiStatus } from '@/utils/attendance';
import { isTicketClosedStatus, normalizeTicketStatus } from '@/utils/tickets';

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

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function round(value, precision = 1) {
  const factor = 10 ** precision;
  return Math.round(toNumber(value) * factor) / factor;
}

function average(values = [], precision = 1) {
  if (!values.length) return 0;
  return round(values.reduce((sum, value) => sum + toNumber(value), 0) / values.length, precision);
}

function toDateOnly(value) {
  return value ? String(value).slice(0, 10) : null;
}

function getEmployeeDepartment(employee) {
  return Array.isArray(employee?.department)
    ? employee.department[0]?.name || 'Unassigned'
    : employee?.department?.name || 'Unassigned';
}

function getEmployeeDesignation(employee) {
  if (Array.isArray(employee?.designation)) {
    return employee.designation[0]?.title || employee?.resolved_designation_title || employee?.role || 'Team Member';
  }

  return employee?.designation?.title || employee?.resolved_designation_title || employee?.role || 'Team Member';
}

function yearsBetween(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null;
  }

  const yearMs = 365.25 * 24 * 60 * 60 * 1000;
  return (end.getTime() - start.getTime()) / yearMs;
}

function getEmployeeAge(dateOfBirth, nowDate) {
  return yearsBetween(dateOfBirth, nowDate);
}

function formatDateLabel(value) {
  if (!value) return '--';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

function formatServiceDuration(years) {
  const safeYears = toNumber(years, 0);
  const totalMonths = Math.max(0, Math.round(safeYears * 12));
  const yearPart = Math.floor(totalMonths / 12);
  const monthPart = totalMonths % 12;

  if (yearPart > 0 && monthPart > 0) {
    return `${yearPart}y ${monthPart}m`;
  }
  if (yearPart > 0) {
    return `${yearPart}y`;
  }
  return `${monthPart}m`;
}

function getTenureBucketLabel(years) {
  if (years === null || years === undefined) return null;
  if (years < 1) return '0-1';
  if (years < 3) return '1-3';
  if (years < 5) return '3-5';
  if (years < 7) return '5-7';
  if (years < 10) return '7-10';
  return '10+';
}

function buildAttendanceInsights(attendanceRows = []) {
  const summary = {
    present: 0,
    absent: 0,
    halfday: 0,
    onLeave: 0,
    totalRows: 0,
  };
  const byDate = new Map();
  const byEmployee = new Map();

  for (const row of attendanceRows) {
    const status = normalizeAttendanceStatus(row.status);
    const employeeId = row.employee_id || null;
    const dateKey = String(row.date || '');
    const dateEntry = byDate.get(dateKey) || {
      date: dateKey,
      present: 0,
      absent: 0,
      halfday: 0,
      onLeave: 0,
      total: 0,
    };
    const employeeEntry = byEmployee.get(employeeId) || {
      present: 0,
      absent: 0,
      halfday: 0,
      onLeave: 0,
      total: 0,
    };

    if (status === 'present') {
      summary.present += 1;
      dateEntry.present += 1;
      employeeEntry.present += 1;
    }
    if (status === 'absent') {
      summary.absent += 1;
      dateEntry.absent += 1;
      employeeEntry.absent += 1;
    }
    if (status === 'halfday') {
      summary.halfday += 1;
      dateEntry.halfday += 1;
      employeeEntry.halfday += 1;
    }
    if (status === 'on_leave') {
      summary.onLeave += 1;
      dateEntry.onLeave += 1;
      employeeEntry.onLeave += 1;
    }

    summary.totalRows += 1;
    dateEntry.total += 1;
    employeeEntry.total += 1;
    byDate.set(dateKey, dateEntry);
    byEmployee.set(employeeId, employeeEntry);
  }

  const averageAttendance =
    summary.totalRows > 0
      ? round(((summary.present + summary.halfday * 0.5) / summary.totalRows) * 100, 1)
      : 0;

  const dailyTrend = Array.from(byDate.values())
    .sort((left, right) => String(left.date).localeCompare(String(right.date)))
    .map((item) => ({
      label: formatDateLabel(item.date),
      attendanceRate: item.total ? round(((item.present + item.halfday * 0.5) / item.total) * 100, 1) : 0,
      present: item.present,
      absent: item.absent,
      halfday: item.halfday,
      onLeave: item.onLeave,
    }));

  return {
    averageAttendance,
    summary,
    dailyTrend,
    employeeStats: byEmployee,
  };
}

function buildDepartmentComposition(employees = []) {
  const departmentMap = new Map();
  const total = employees.length || 1;

  for (const employee of employees) {
    const department = getEmployeeDepartment(employee);
    const current = departmentMap.get(department) || { department, count: 0, share: 0 };
    current.count += 1;
    departmentMap.set(department, current);
  }

  return Array.from(departmentMap.values())
    .map((item) => ({
      ...item,
      share: round((item.count / total) * 100, 1),
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);
}

function buildLifecycleSpread(employees = []) {
  const bucketMap = new Map([
    ['active', { key: 'active', label: 'Active', count: 0 }],
    ['on_leave', { key: 'on_leave', label: 'On Leave', count: 0 }],
    ['probation', { key: 'probation', label: 'Probation', count: 0 }],
    ['notice_period', { key: 'notice_period', label: 'Notice Period', count: 0 }],
    ['separated', { key: 'separated', label: 'Separated', count: 0 }],
    ['other', { key: 'other', label: 'Other', count: 0 }],
  ]);

  for (const employee of employees) {
    const employment = deriveEmploymentFields(employee);
    const lifecycle = employment.employmentLifecycleStatus;
    const stage = employment.currentStage;

    let key = 'active';
    if (lifecycle === 'separated') {
      key = 'separated';
    } else if (stage === 'on_leave') {
      key = 'on_leave';
    } else if (stage === 'probation') {
      key = 'probation';
    } else if (stage === 'notice_period') {
      key = 'notice_period';
    } else if (lifecycle !== 'active') {
      key = 'other';
    }

    bucketMap.get(key).count += 1;
  }

  const total = employees.length || 1;
  return Array.from(bucketMap.values())
    .filter((item) => item.count > 0)
    .map((item) => ({
      ...item,
      share: round((item.count / total) * 100, 1),
    }))
    .sort((left, right) => right.count - left.count);
}

function buildGenderDistribution(employees = []) {
  const counts = {
    Male: 0,
    Female: 0,
    Others: 0,
  };

  for (const employee of employees) {
    const gender = String(employee?.gender || '').trim().toLowerCase();
    if (gender === 'male') counts.Male += 1;
    else if (gender === 'female') counts.Female += 1;
    else if (gender === 'others' || gender === 'other') counts.Others += 1;
  }

  return [
    { name: 'Male', value: counts.Male },
    { name: 'Female', value: counts.Female },
    { name: 'Others', value: counts.Others },
  ].filter((item) => item.value > 0);
}

function normalizeEmployeeState(value) {
  const state = String(value || '').trim();
  if (!state) return null;

  const normalizedKey = state
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[().,-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const stateMap = {
    'andaman and nicobar islands': 'Andaman and Nicobar Islands',
    'andhra pradesh': 'Andhra Pradesh',
    'arunachal pradesh': 'Arunachal Pradesh',
    assam: 'Assam',
    bihar: 'Bihar',
    chandigarh: 'Chandigarh',
    chhattisgarh: 'Chhattisgarh',
    'dadra and nagar haveli and daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
    delhi: 'Delhi',
    'new delhi': 'Delhi',
    'nct of delhi': 'Delhi',
    goa: 'Goa',
    gujarat: 'Gujarat',
    haryana: 'Haryana',
    'himachal pradesh': 'Himachal Pradesh',
    'jammu and kashmir': 'Jammu and Kashmir',
    jharkhand: 'Jharkhand',
    karnataka: 'Karnataka',
    kerala: 'Kerala',
    ladakh: 'Ladakh',
    lakshadweep: 'Lakshadweep',
    'madhya pradesh': 'Madhya Pradesh',
    maharashtra: 'Maharashtra',
    manipur: 'Manipur',
    meghalaya: 'Meghalaya',
    mizoram: 'Mizoram',
    nagaland: 'Nagaland',
    odisha: 'Odisha',
    orissa: 'Odisha',
    puducherry: 'Puducherry',
    pondicherry: 'Puducherry',
    punjab: 'Punjab',
    rajasthan: 'Rajasthan',
    sikkim: 'Sikkim',
    'tamil nadu': 'Tamil Nadu',
    telangana: 'Telangana',
    tripura: 'Tripura',
    'uttar pradesh': 'Uttar Pradesh',
    uttarakhand: 'Uttarakhand',
    uttaranchal: 'Uttarakhand',
    'west bengal': 'West Bengal',
  };

  return stateMap[normalizedKey] || state.replace(/\s+/g, ' ');
}

function buildStateDistribution(employees = []) {
  const stateMap = new Map();

  for (const employee of employees) {
    const state = normalizeEmployeeState(employee?.state);
    if (!state) continue;

    stateMap.set(state, (stateMap.get(state) || 0) + 1);
  }

  return Array.from(stateMap.entries())
    .map(([state, count]) => ({ state, count }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      return left.state.localeCompare(right.state);
    });
}

function buildAttritionByDepartment(employees = []) {
  const separatedEmployees = employees.filter(
    (employee) => deriveEmploymentFields(employee).employmentLifecycleStatus === 'separated'
  );
  const map = new Map();

  for (const employee of separatedEmployees) {
    const department = getEmployeeDepartment(employee);
    map.set(department, (map.get(department) || 0) + 1);
  }

  return Array.from(map.entries())
    .map(([department, terminated]) => ({ department, terminated }))
    .sort((left, right) => right.terminated - left.terminated)
    .slice(0, 8);
}

function buildAttritionByTenure(employees = [], today) {
  const buckets = ['0-1', '1-3', '3-5', '5-7', '7-10', '10+'].map((label) => ({
    tenure: label,
    terminated: 0,
  }));
  const bucketMap = new Map(buckets.map((item) => [item.tenure, item]));

  for (const employee of employees) {
    const employment = deriveEmploymentFields(employee);
    if (employment.employmentLifecycleStatus !== 'separated') continue;

    const start = toDateOnly(employee.date_of_joining) || toDateOnly(employee.created_at);
    const end = toDateOnly(employee.separated_at) || today;
    const years = yearsBetween(start, end);
    const bucketLabel = getTenureBucketLabel(years);
    if (!bucketLabel) continue;
    bucketMap.get(bucketLabel).terminated += 1;
  }

  return buckets;
}

function buildRatingMap(ratingRows = []) {
  const ratingsByEmployee = new Map();

  for (const row of ratingRows) {
    const employeeId = row.employee_id;
    if (!employeeId) continue;

    const current = ratingsByEmployee.get(employeeId) || {
      count: 0,
      total: 0,
      average: 0,
    };
    current.count += 1;
    current.total += toNumber(row.rating);
    current.average = current.count ? round(current.total / current.count, 1) : 0;
    ratingsByEmployee.set(employeeId, current);
  }

  return ratingsByEmployee;
}

function buildTopPerformers(employees = [], ratingRows = [], attendanceStats = new Map(), today) {
  const ratingsByEmployee = buildRatingMap(ratingRows);

  const rows = employees
    .filter((employee) => deriveEmploymentFields(employee).employmentLifecycleStatus !== 'separated')
    .map((employee) => {
      const rating = ratingsByEmployee.get(employee.id);
      const attendance = attendanceStats.get(employee.id) || {
        present: 0,
        absent: 0,
        halfday: 0,
        onLeave: 0,
        total: 0,
      };
      const start = toDateOnly(employee.date_of_joining) || toDateOnly(employee.created_at);
      const tenureYears = yearsBetween(start, today) || 0;
      const attendancePercent = attendance.total
        ? round(((attendance.present + attendance.halfday * 0.5) / attendance.total) * 100, 1)
        : 0;
      const nonWorkingDays = attendance.absent + attendance.halfday + attendance.onLeave;
      const ratingValue = rating?.average || 0;

      return {
        id: employee.id,
        employeeId: employee.employee_id || '--',
        name: employee.name || 'Employee',
        department: getEmployeeDepartment(employee),
        jobTitle: getEmployeeDesignation(employee),
        rating: ratingValue,
        attendancePercent,
        nonWorkingDays,
        salary: toNumber(employee.salary),
        promotion: ratingValue >= 4.8 && attendancePercent >= 92 && tenureYears >= 1.5 ? 'Yes' : 'No',
        ratingCount: rating?.count || 0,
      };
    })
    .sort((left, right) => {
      if (right.rating !== left.rating) return right.rating - left.rating;
      if (right.attendancePercent !== left.attendancePercent) return right.attendancePercent - left.attendancePercent;
      if (right.ratingCount !== left.ratingCount) return right.ratingCount - left.ratingCount;
      return right.salary - left.salary;
    });

  return rows.slice(0, 10);
}

function buildServiceDurationTable(employees = [], today) {
  return [...employees]
    .filter((employee) => deriveEmploymentFields(employee).employmentLifecycleStatus !== 'separated')
    .map((employee) => {
      const start = toDateOnly(employee.date_of_joining) || toDateOnly(employee.created_at);
      const years = yearsBetween(start, today) || 0;
      return {
        id: employee.id,
        employeeId: employee.employee_id || '--',
        name: employee.name || 'Employee',
        department: getEmployeeDepartment(employee),
        jobTitle: getEmployeeDesignation(employee),
        serviceDuration: formatServiceDuration(years),
        tenureYears: round(years, 2),
      };
    })
    .sort((left, right) => {
      if (right.tenureYears !== left.tenureYears) return right.tenureYears - left.tenureYears;
      return left.name.localeCompare(right.name);
    });
}

function buildExecutiveSummary(employees = [], attendance, today) {
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(
    (employee) => deriveEmploymentFields(employee).employmentLifecycleStatus === 'active'
  ).length;
  const terminatedEmployees = employees.filter(
    (employee) => deriveEmploymentFields(employee).employmentLifecycleStatus === 'separated'
  ).length;

  const tenureValues = employees
    .map((employee) => {
      const start = toDateOnly(employee.date_of_joining) || toDateOnly(employee.created_at);
      const end =
        deriveEmploymentFields(employee).employmentLifecycleStatus === 'separated'
          ? toDateOnly(employee.separated_at) || today
          : today;
      return yearsBetween(start, end);
    })
    .filter((value) => value !== null);

  const ageValues = employees
    .map((employee) => getEmployeeAge(toDateOnly(employee.date_of_birth), today))
    .filter((value) => value !== null);

  const salaryValues = employees
    .map((employee) => toNumber(employee.salary, null))
    .filter((value) => value !== null);

  return {
    totalEmployees,
    activeEmployees,
    terminatedEmployees,
    attritionRate: totalEmployees ? round((terminatedEmployees / totalEmployees) * 100, 1) : 0,
    averageTenure: average(tenureValues, 2),
    averageAttendance: attendance.averageAttendance,
    averageAge: average(ageValues, 2),
    averageSalary: average(salaryValues, 0),
  };
}

function buildTicketStatusSummary(tickets = []) {
  const summary = {
    total: tickets.length,
    open: 0,
    inProgress: 0,
    waiting: 0,
    completed: 0,
  };

  for (const ticket of tickets) {
    const status = normalizeTicketStatus(ticket?.status);
    if (status === 'ticket_raised' || status === 'open') {
      summary.open += 1;
      continue;
    }
    if (status === 'in_progress') {
      summary.inProgress += 1;
      continue;
    }
    if (status === 'waiting_on_requester') {
      summary.waiting += 1;
      continue;
    }
    if (isTicketClosedStatus(status)) {
      summary.completed += 1;
    }
  }

  return summary;
}

export async function GET(request) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) {
      return auth.error;
    }

    const url = new URL(request.url);
    const month = url.searchParams.get('month') || getCurrentDateInTimeZone().slice(0, 7);
    const today = getCurrentDateInTimeZone();
    const { start, end, startAt, endAt } = buildMonthTimestampRange(month);

    const [dashboardData, attendanceResult, ratingResult, ticketsResult] = await Promise.all([
      getHrAdminDashboardData(),
      adminClient
        .from('hrm_attendance')
        .select('employee_id, date, status')
        .gte('date', start)
        .lte('date', end),
      adminClient
        .from('task_employee_ratings')
        .select('id, employee_id, task_id, rating, created_at, updated_at'),
      adminClient
        .from('hrm_tickets')
        .select('id, status')
        .eq('module_key', 'hrm'),
    ]);

    if (attendanceResult.error) {
      throw new Error(attendanceResult.error.message || 'Failed to load attendance analytics');
    }
    if (ratingResult.error) {
      throw new Error(ratingResult.error.message || 'Failed to load performance analytics');
    }
    if (ticketsResult.error) {
      throw new Error(ticketsResult.error.message || 'Failed to load ticketing analytics');
    }

    const employees = dashboardData.employees || [];
    const attendance = buildAttendanceInsights(attendanceResult.data || []);
    const departmentComposition = buildDepartmentComposition(employees);
    const lifecycleSpread = buildLifecycleSpread(employees);
    const genderDistribution = buildGenderDistribution(employees);
    const executiveSummary = buildExecutiveSummary(employees, attendance, today);
    const attritionByTenure = buildAttritionByTenure(employees, today);
    const attritionByDepartment = buildAttritionByDepartment(employees);
    const stateDistribution = buildStateDistribution(employees);
    const ticketStatusSummary = buildTicketStatusSummary(ticketsResult.data || []);
    const topPerformers = buildTopPerformers(employees, ratingResult.data || [], attendance.employeeStats, today);
    const serviceDurationTable = buildServiceDurationTable(employees, today);

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
        recordsCount: employees.length,
        dashboard: {
          executiveSummary,
          attritionByTenure,
          attritionByDepartment,
          genderDistribution,
          attendanceTrend: attendance.dailyTrend,
          departmentComposition,
          lifecycleSpread,
          stateDistribution,
          ticketStatusSummary,
          topPerformers,
          serviceDurationTable,
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
