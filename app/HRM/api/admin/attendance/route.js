import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import { deriveEmploymentFields } from '@/utils/hrm-employment';
import {
  buildAttendanceUiRecord,
  buildHolidayUiRecord,
  getCurrentDateInTimeZone,
  getDateRangeForMonth,
  listDatesInRange,
} from '@/utils/attendance';
import { formatLeaveSession, getLeaveAttendanceCode, getLeaveTypeCode } from '@/utils/leave';

const isSuperAdminEntity = (emp) => {
  if (!emp) return false;
  if (emp.email && ['summit@bncglobal.in', 'gurvinder@bncglobal.in'].includes(emp.email.toLowerCase().trim())) {
    return true;
  }
  if (emp.employee_id) {
    const empIdUpper = String(emp.employee_id).toUpperCase().trim();
    if (empIdUpper.startsWith('SA-') || empIdUpper.startsWith('SA0') || ['SA01', 'SA02', 'SA-01', 'SA-02'].includes(empIdUpper)) {
      return true;
    }
  }
  return false;
};

const OPPOSITE_HALF_PRESENT_MARKER = '[hr_override_opposite_half_present]';
const APRIL_BACKFILL_CODE_MARKER = 'april_backfill_code';
const APRIL_BACKFILL_LABEL_MARKER = 'april_backfill_label';

function isAprilBackfillDate(date = '') {
  return String(date || '').startsWith('2026-04-');
}

function isMissingEmploymentColumnError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('employee_type') ||
    message.includes('employment_lifecycle_status') ||
    message.includes('current_stage') ||
    (message.includes('column') && message.includes('does not exist'))
  );
}

function isMissingAttendanceColumnError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('hrm_attendance') && message.includes('does not exist');
}

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
  if (!authContext?.isHrAdmin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { authContext };
}

async function loadEmployeeRows() {
  const preferred = await adminClient
    .from('hrm_employees')
    .select(`
      id,
      employee_id,
      name,
      city,
      email,
      employee_status,
      employee_type,
      employment_lifecycle_status,
      current_stage,
      date_of_joining,
      working_days,
      second_saturday_off,
      reporting_manager_id,
      department:hrm_departments (id, name),
      designation:hrm_designations (id, title)
    `)
    .order('name', { ascending: true });

  if (!preferred.error) {
    return preferred;
  }

  if (!isMissingEmploymentColumnError(preferred.error)) {
    return preferred;
  }

  return adminClient
    .from('hrm_employees')
    .select(`
      id,
      employee_id,
      name,
      city,
      email,
      employee_status,
      date_of_joining,
      working_days,
      second_saturday_off,
      reporting_manager_id,
      department:hrm_departments (id, name),
      designation:hrm_designations (id, title)
    `)
    .order('name', { ascending: true });
}

async function loadMonthlyAttendanceRows(employeeIds = [], range = null) {
  if (!range || !employeeIds.length) {
    return { data: [], error: null };
  }

  const preferred = await adminClient
    .from('hrm_attendance')
    .select(
      'employee_id, date, status, check_in, check_out, late_in_minutes, early_out_minutes, work_hours_minutes, source, checkout_source, is_auto_checkout, is_regularized, notes'
    )
    .in('employee_id', employeeIds)
    .gte('date', range.start)
    .lte('date', range.end)
    .order('date', { ascending: true });

  if (!preferred.error || !isMissingAttendanceColumnError(preferred.error)) {
    return preferred;
  }

  return adminClient
    .from('hrm_attendance')
    .select('employee_id, date, status, check_in, check_out, late_in_minutes, early_out_minutes, work_hours_minutes, source, notes')
    .in('employee_id', employeeIds)
    .gte('date', range.start)
    .lte('date', range.end)
    .order('date', { ascending: true });
}

function getRelationRecord(value) {
  if (Array.isArray(value)) return value[0] || null;
  return value && typeof value === 'object' ? value : null;
}

function formatStatusLabel(status = '') {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) return '--';
  if (normalized === 'missing') return '--';
  if (normalized === 'on_leave') return 'On Leave';
  if (normalized === 'late') return 'Half Day';
  if (normalized === 'halfday' || normalized === 'half_day') return 'Half Day';
  return normalized
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatAttendanceRow(baseRow, extras = {}) {
  return {
    ...baseRow,
    statusLabel: formatStatusLabel(baseRow.status),
    source: extras.source || '',
    notes: baseRow.notes || extras.notes || '',
  };
}

function mapMonthlyStatusToCode(status = '') {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'present') return 'P';
  if (normalized === 'late') return 'HD';
  if (normalized === 'absent') return 'A';
  if (normalized === 'halfday') return 'HD';
  if (normalized === 'on_leave') return 'L';
  if (normalized === 'holiday') return 'H';
  if (normalized === 'weekend') return 'OFF';
  return '--';
}

function readNoteMarker(noteText = '', markerName = '') {
  const match = String(noteText || '').match(new RegExp(`\\[${markerName}:([^\\]]+)\\]`, 'i'));
  return match?.[1]?.trim() || '';
}

function buildAttendanceBackfillCellDetails(rawAttendance) {
  const code = readNoteMarker(rawAttendance?.notes, APRIL_BACKFILL_CODE_MARKER);
  if (!code) {
    return null;
  }

  const label = readNoteMarker(rawAttendance?.notes, APRIL_BACKFILL_LABEL_MARKER) || formatStatusLabel(rawAttendance?.status);
  const normalizedCode = String(code).toUpperCase();
  let status = String(rawAttendance?.status || '').toLowerCase();

  if (normalizedCode === 'OFF') status = 'weekend';
  else if (normalizedCode.includes(':') || normalizedCode === 'HD') status = 'halfday';
  else if (['CL', 'SL', 'SP', 'LOP', 'CH', 'COFF', 'L'].includes(normalizedCode)) status = 'on_leave';
  else if (normalizedCode === 'H') status = 'holiday';
  else if (normalizedCode === 'P') status = 'present';
  else if (normalizedCode === 'A') status = 'absent';

  return {
    code: normalizedCode,
    status,
    label,
    notes: rawAttendance?.notes || '',
  };
}

function buildLeaveCellDetails(leaveRequest, rawAttendance) {
  const leaveTypeName = leaveRequest?.leave_type?.name || 'Leave';
  const leaveCode = getLeaveAttendanceCode(leaveRequest?.leave_type || leaveTypeName);
  const session = leaveRequest?.applied_session || leaveRequest?.session || 'full_day';
  const isHalfDay = session !== 'full_day';
  const attendanceMarked =
    Boolean(rawAttendance?.check_in || rawAttendance?.check_out || Number(rawAttendance?.work_hours_minutes || 0) > 0) ||
    String(rawAttendance?.attendance_status || rawAttendance?.status || '').toLowerCase() === 'present' ||
    String(rawAttendance?.notes || '').includes(OPPOSITE_HALF_PRESENT_MARKER);
  const sourceLabel = leaveRequest?.request_source === 'hr_override' ? 'HR Overwrite' : 'Approved Leave';

  if (isHalfDay) {
    const oppositeHalfCode = attendanceMarked ? 'P' : 'A';
    const code = session === 'first_half' ? `${leaveCode}:${oppositeHalfCode}` : `${oppositeHalfCode}:${leaveCode}`;

    return {
      code,
      status: 'halfday',
      label: `${leaveTypeName} (${formatLeaveSession(session)})`,
      notes: attendanceMarked
        ? `${sourceLabel}: ${leaveTypeName} approved for ${formatLeaveSession(session)}. Attendance was marked in the opposite half.`
        : `${sourceLabel}: ${leaveTypeName} approved for ${formatLeaveSession(session)}. Opposite-half attendance was not marked, so the remaining half is absent.`,
    };
  }

  return {
    code: leaveCode,
    status: 'on_leave',
    label: leaveTypeName,
    notes: `${sourceLabel}: ${leaveTypeName} approved for this date.`,
  };
}

function roundSummaryValue(value = 0) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function addSummaryContribution(summary, code, fraction = 1) {
  const normalized = String(code || '').trim().toUpperCase();
  if (normalized === 'P') summary.present += fraction;
  else if (normalized === 'A') summary.absent += fraction;
  else if (normalized === 'HD') summary.halfDay += fraction;
  else if (normalized === 'OFF') summary.off += fraction;
  else if (normalized === 'H') summary.holiday += fraction;
  else if (['L', 'CL', 'SL', 'SP', 'COFF', 'CH', 'LOP'].includes(normalized)) summary.leave += fraction;
}

function buildMonthlySummary(dailyStatuses = []) {
  const summary = dailyStatuses.reduce(
    (current, day) => {
      const code = String(day?.code || '--').trim().toUpperCase();
      current.totalDays += 1;

      if (code.includes(':')) {
        const parts = code.split(':').slice(0, 2).map((p) => p.trim());
        const hasPresent = parts.includes('P');
        const hasAbsent = parts.includes('A');
        const hasLop = parts.includes('LOP');

        if (hasPresent && !hasAbsent && !hasLop) {
          // e.g. CL:P, P:CL, P:CH, SL:P, P:SL — leave + worked half
          // Count as present day, leave gets credit too
          current.present += 1;
          const leavepart = parts.find((p) => p !== 'P');
          if (leavepart) addSummaryContribution(current, leavepart, 0.5);
        } else {
          // e.g. LOP:P, P:LOP, SL:A, A:LOP — one half is missing/lop
          current.halfDay += 1;
          parts.forEach((part) => addSummaryContribution(current, part, 0.5));
        }
        return current;
      }

      addSummaryContribution(current, code, 1);
      return current;
    },
    { present: 0, halfDay: 0, absent: 0, off: 0, holiday: 0, leave: 0, totalDays: 0 }
  );

  return {
    present: roundSummaryValue(summary.present),
    halfDay: roundSummaryValue(summary.halfDay),
    absent: roundSummaryValue(summary.absent),
    off: roundSummaryValue(summary.off),
    holiday: roundSummaryValue(summary.holiday),
    leave: roundSummaryValue(summary.leave),
    totalDays: roundSummaryValue(summary.totalDays),
  };
}

function summarizeSwipePattern(swipes = []) {
  if (!Array.isArray(swipes) || swipes.length === 0) {
    return {
      swipeCount: 0,
      sessionCount: 0,
      swipePattern: '--',
    };
  }

  const sortedSwipes = [...swipes].sort(
    (left, right) => new Date(left.swipe_time).getTime() - new Date(right.swipe_time).getTime()
  );

  let openCheckIn = false;
  let sessionCount = 0;

  for (const swipe of sortedSwipes) {
    const swipeType = String(swipe?.swipe_type || '').toLowerCase();
    if (swipeType === 'in') {
      openCheckIn = true;
      continue;
    }

    if (swipeType === 'out' && openCheckIn) {
      sessionCount += 1;
      openCheckIn = false;
    }
  }

  const swipeCount = sortedSwipes.length;
  let swipePattern = 'Single';

  if (swipeCount === 1 || openCheckIn) {
    swipePattern = 'Open';
  } else if (sessionCount > 1 || swipeCount > 2) {
    swipePattern = 'Multiple';
  }

  return {
    swipeCount,
    sessionCount,
    swipePattern,
  };
}

function buildCalendarDays(monthString) {
  const { start, end } = getDateRangeForMonth(monthString);
  return listDatesInRange(start, end).map((date) => {
    const parts = date.split('-');
    const dayNumber = Number(parts[2]);
    const weekdayShort = new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
    return {
      date,
      dayNumber,
      weekdayShort,
    };
  });
}

function clampRangeToToday(range, today) {
  if (range.start > today) {
    return null;
  }

  return {
    ...range,
    end: range.end > today ? today : range.end,
  };
}

function filterRows(rows = [], { search = '', status = '', department = '' } = {}) {
  const normalizedSearch = String(search || '').trim().toLowerCase();
  const normalizedStatus = String(status || '').trim().toLowerCase();
  const normalizedDepartment = String(department || '').trim().toLowerCase();

  return rows.filter((row) => {
    const matchesSearch =
      !normalizedSearch ||
      [
        row.employeeId,
        row.employeeName,
        row.department,
        row.designation,
        row.reportingTo,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));

    const matchesStatus = !normalizedStatus || String(row.status || '').toLowerCase() === normalizedStatus;
    const matchesDepartment =
      !normalizedDepartment || String(row.department || '').toLowerCase() === normalizedDepartment;

    return matchesSearch && matchesStatus && matchesDepartment;
  });
}

export async function GET(request) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) {
      return auth.error;
    }

    const url = new URL(request.url);
    const mode = String(url.searchParams.get('mode') || 'daily').toLowerCase();
    const selectedDate = url.searchParams.get('date') || getCurrentDateInTimeZone();
    const search = url.searchParams.get('search') || '';
    const statusFilter = url.searchParams.get('status') || '';
    const departmentFilter = url.searchParams.get('department') || '';
    const employeeId = url.searchParams.get('employeeId') || '';
    const month = url.searchParams.get('month') || getCurrentDateInTimeZone().slice(0, 7);
    const rangeStart = url.searchParams.get('start') || '';
    const rangeEnd = url.searchParams.get('end') || '';
    const today = getCurrentDateInTimeZone();

    const employeesResult = await loadEmployeeRows();
    if (employeesResult.error) {
      return NextResponse.json(
        { error: employeesResult.error.message || 'Failed to load employees' },
        { status: 500 }
      );
    }

    const employeeRows = (employeesResult.data || [])
      .filter((employee) => !isSuperAdminEntity(employee))
      .filter((employee) => {
        return deriveEmploymentFields(employee).employmentLifecycleStatus === 'active';
      });

    const managerIds = [...new Set(employeeRows.map((row) => row.reporting_manager_id).filter(Boolean))];
    let managerMap = new Map();

    if (managerIds.length) {
      const managersResult = await adminClient
        .from('hrm_employees')
        .select('id, employee_id, name')
        .in('id', managerIds);

      if (managersResult.error) {
        return NextResponse.json(
          { error: managersResult.error.message || 'Failed to load reporting managers' },
          { status: 500 }
        );
      }

      managerMap = new Map((managersResult.data || []).map((manager) => [manager.id, manager]));
    }

    const employeeOptions = employeeRows.map((employee) => ({
      id: employee.id,
      employeeId: employee.employee_id || '',
      name: employee.name || 'Employee',
      department: getRelationRecord(employee.department)?.name || '',
      designation: getRelationRecord(employee.designation)?.title || '',
      city: employee.city || '',
      joinDate: employee.date_of_joining || null,
    }));

    const departmentOptions = [...new Set(employeeOptions.map((employee) => employee.department).filter(Boolean))].sort();
    const statusOptions = [
      { value: 'present', label: 'Present' },
      { value: 'absent', label: 'Absent' },
      { value: 'halfday', label: 'Half Day' },
      { value: 'on_leave', label: 'On Leave' },
      { value: 'holiday', label: 'Holiday' },
      { value: 'weekend', label: 'Weekend / Off' },
      { value: 'missing', label: 'Missing / No Record' },
    ];

    if (mode === 'monthly') {
      const monthRange = getDateRangeForMonth(month);
      const range = clampRangeToToday(monthRange, today);
      const calendarDays = range ? buildCalendarDays(month).filter((day) => day.date <= range.end) : [];
      const selectedEmployees = employeeId
        ? employeeRows.filter((employee) => employee.id === employeeId)
        : employeeRows;

      const [attendanceResult, holidaysResult, leaveRequestsResult] = range
        ? await Promise.all([
            loadMonthlyAttendanceRows(
              selectedEmployees.map((employee) => employee.id),
              range
            ),
            adminClient
              .from('hrm_holidays')
              .select('*')
              .gte('date', range.start)
              .lte('date', range.end),
            adminClient
              .from('hrm_leave_requests')
              .select('id, employee_id, leave_type_id, start_date, end_date, applied_session, session, status, request_source, leave_type:hrm_leave_types (id, name)')
              .in('employee_id', selectedEmployees.map((employee) => employee.id))
              .eq('status', 'approved')
              .lte('start_date', range.end)
              .gte('end_date', range.start),
          ])
        : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];

      if (attendanceResult.error) {
        return NextResponse.json(
          { error: attendanceResult.error.message || 'Failed to load monthly attendance' },
          { status: 500 }
        );
      }
      if (holidaysResult.error) {
        return NextResponse.json(
          { error: holidaysResult.error.message || 'Failed to load monthly holidays' },
          { status: 500 }
        );
      }
      if (leaveRequestsResult.error) {
        return NextResponse.json(
          { error: leaveRequestsResult.error.message || 'Failed to load monthly leave requests' },
          { status: 500 }
        );
      }
      const holidayMap = new Map((holidaysResult.data || []).map((holiday) => [holiday.date, holiday]));
      const attendanceMap = new Map(
        (attendanceResult.data || []).map((row) => [`${row.employee_id}:${row.date}`, row])
      );
      const calendarDateSet = new Set(calendarDays.map((day) => day.date));
      const leaveRequestMap = new Map();
      for (const request of (range ? leaveRequestsResult?.data || [] : [])) {
        const requestStart = request.start_date < range.start ? range.start : request.start_date;
        const requestEnd = request.end_date > range.end ? range.end : request.end_date;
        for (const date of listDatesInRange(requestStart, requestEnd)) {
          if (!calendarDateSet.has(date)) continue;
          leaveRequestMap.set(`${request.employee_id}:${date}`, request);
        }
      }

      const rows = selectedEmployees
        .map((employee) => {
          const dailyStatuses = calendarDays.map((day) => {
            const isBeforeJoin = employee.date_of_joining && day.date < employee.date_of_joining;
            const holiday = holidayMap.get(day.date);
            const rawAttendance = attendanceMap.get(`${employee.id}:${day.date}`) || null;
            const leaveRequest = leaveRequestMap.get(`${employee.id}:${day.date}`) || null;
            const rendered = isBeforeJoin
              ? buildAttendanceUiRecord(day.date, null, {
                  workingDays: employee.working_days || [],
                  secondSaturdayOff: Boolean(employee.second_saturday_off),
                  joinDate: employee.date_of_joining,
                })
              : holiday
              ? buildHolidayUiRecord(day.date, holiday)
              : buildAttendanceUiRecord(day.date, rawAttendance, {
                  workingDays: employee.working_days || [],
                  secondSaturdayOff: Boolean(employee.second_saturday_off),
                  joinDate: employee.date_of_joining,
                });
            const backfillDetails =
              !holiday && rawAttendance
                ? buildAttendanceBackfillCellDetails(rawAttendance)
                : null;
            const leaveDetails =
              !holiday && rendered.status !== 'weekend' && leaveRequest && !backfillDetails
                ? buildLeaveCellDetails(leaveRequest, rawAttendance)
                : null;
            const normalizedStatus = String(leaveDetails?.status || backfillDetails?.status || rendered.status || '').toLowerCase() || 'missing';
            const code = leaveDetails?.code || backfillDetails?.code || mapMonthlyStatusToCode(normalizedStatus);
            return {
              date: day.date,
              code,
              status: normalizedStatus === 'weekend' ? 'weekend' : normalizedStatus || 'missing',
              label: leaveDetails?.label || backfillDetails?.label || formatStatusLabel(normalizedStatus),
              notes: leaveDetails?.notes || backfillDetails?.notes || rendered.notes || '',
            };
          });

          const summary = buildMonthlySummary(dailyStatuses);
          const manager = managerMap.get(employee.reporting_manager_id);

          return {
            employee: {
              id: employee.id,
              employeeId: employee.employee_id || '--',
              name: employee.name || 'Employee',
              department: getRelationRecord(employee.department)?.name || 'Department not set',
              designation: getRelationRecord(employee.designation)?.title || 'Designation not set',
              city: employee.city || '',
              reportingTo: manager?.name || '--',
            },
            dailyStatuses,
            summary,
          };
        })
        .filter((row) => {
          if (!statusFilter) return true;
          const normalizedStatus = String(statusFilter).toLowerCase();
          if (normalizedStatus === 'missing') {
            return row.dailyStatuses.some((day) => day.status === 'missing');
          }
          return row.dailyStatuses.some((day) => day.status === normalizedStatus);
        });

      return NextResponse.json(
        {
          mode: 'monthly',
          month,
          calendarDays,
          rows,
          employeeOptions,
          departmentOptions,
          statusOptions,
          selectedEmployeeId: employeeId,
        },
        { status: 200 }
      );
    }

    if (mode === 'individual') {
      if (!employeeId) {
        return NextResponse.json(
          {
            mode: 'individual',
            employeeOptions,
            departmentOptions,
            statusOptions,
            selectedEmployeeId: '',
            month,
            rows: [],
          },
          { status: 200 }
        );
      }

      const selectedEmployee = employeeRows.find((employee) => employee.id === employeeId);
      if (!selectedEmployee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }

      const requestedRange = rangeStart && rangeEnd ? { start: rangeStart, end: rangeEnd } : getDateRangeForMonth(month);
      const range = clampRangeToToday(requestedRange, today);

      const [attendanceResult, holidaysResult] = range
        ? await Promise.all([
            adminClient
              .from('hrm_attendance')
              .select('*')
              .eq('employee_id', employeeId)
              .gte('date', range.start)
              .lte('date', range.end)
              .order('date', { ascending: true }),
            adminClient
              .from('hrm_holidays')
              .select('*')
              .gte('date', range.start)
              .lte('date', range.end),
          ])
        : [{ data: [], error: null }, { data: [], error: null }];

      if (attendanceResult.error) {
        return NextResponse.json(
          { error: attendanceResult.error.message || 'Failed to load attendance history' },
          { status: 500 }
        );
      }

      const holidayMap = new Map((holidaysResult.data || []).map((holiday) => [holiday.date, holiday]));
      const attendanceMap = new Map((attendanceResult.data || []).map((row) => [row.date, row]));

      const rows = (range ? listDatesInRange(range.start, range.end) : [])
        .map((date) => {
          const holiday = holidayMap.get(date);
          const rawAttendance = attendanceMap.get(date) || null;
          const isBeforeJoin = selectedEmployee.date_of_joining && date < selectedEmployee.date_of_joining;
          const rendered = isBeforeJoin
            ? buildAttendanceUiRecord(date, null, {
                workingDays: selectedEmployee.working_days || [],
                secondSaturdayOff: Boolean(selectedEmployee.second_saturday_off),
                joinDate: selectedEmployee.date_of_joining,
              })
            : holiday
            ? buildHolidayUiRecord(date, holiday)
            : buildAttendanceUiRecord(date, rawAttendance, {
                workingDays: selectedEmployee.working_days || [],
                secondSaturdayOff: Boolean(selectedEmployee.second_saturday_off),
                joinDate: selectedEmployee.date_of_joining,
              });

          return formatAttendanceRow(rendered, {
            source: holiday ? 'holiday' : rawAttendance?.source || '',
            notes: rendered.notes,
          });
        })
        .filter((row) => !statusFilter || String(row.status).toLowerCase() === String(statusFilter).toLowerCase());

      return NextResponse.json(
        {
          mode: 'individual',
          employeeOptions,
          departmentOptions,
          statusOptions,
          selectedEmployeeId: employeeId,
          employee: {
            id: selectedEmployee.id,
            employeeId: selectedEmployee.employee_id || '',
            name: selectedEmployee.name || 'Employee',
            department: getRelationRecord(selectedEmployee.department)?.name || '',
            designation: getRelationRecord(selectedEmployee.designation)?.title || '',
            reportingTo: managerMap.get(selectedEmployee.reporting_manager_id)?.name || '--',
          },
          month,
          range: range || { start: requestedRange.start, end: requestedRange.end },
          rows,
        },
        { status: 200 }
      );
    }

    const [attendanceResult, holidayResult, swipeResult] = await Promise.all([
      adminClient.from('hrm_attendance').select('*').eq('date', selectedDate),
      adminClient.from('hrm_holidays').select('*').eq('date', selectedDate).maybeSingle(),
      adminClient
        .from('hrm_attendance_swipes')
        .select('employee_id, swipe_type, swipe_time')
        .in('employee_id', employeeRows.map((employee) => employee.id))
        .eq('swipe_date', selectedDate)
        .order('swipe_time', { ascending: true }),
    ]);

    if (attendanceResult.error) {
      return NextResponse.json(
        { error: attendanceResult.error.message || 'Failed to load attendance table' },
        { status: 500 }
      );
    }
    if (swipeResult.error) {
      return NextResponse.json(
        { error: swipeResult.error.message || 'Failed to load swipe summary' },
        { status: 500 }
      );
    }

    const attendanceMap = new Map((attendanceResult.data || []).map((row) => [row.employee_id, row]));
    const holiday = holidayResult.data || null;
    const swipeMap = new Map();

    for (const swipe of swipeResult.data || []) {
      const employeeSwipes = swipeMap.get(swipe.employee_id) || [];
      employeeSwipes.push(swipe);
      swipeMap.set(swipe.employee_id, employeeSwipes);
    }

    const rows = filterRows(
      employeeRows.map((employee) => {
        const rawAttendance = attendanceMap.get(employee.id) || null;
        const swipeSummary = summarizeSwipePattern(swipeMap.get(employee.id) || []);
        const isBeforeJoin = employee.date_of_joining && selectedDate < employee.date_of_joining;
        const rendered = isBeforeJoin
          ? buildAttendanceUiRecord(selectedDate, null, {
              workingDays: employee.working_days || [],
              secondSaturdayOff: Boolean(employee.second_saturday_off),
              joinDate: employee.date_of_joining,
            })
          : holiday
          ? buildHolidayUiRecord(selectedDate, holiday)
          : buildAttendanceUiRecord(selectedDate, rawAttendance, {
              workingDays: employee.working_days || [],
              secondSaturdayOff: Boolean(employee.second_saturday_off),
              joinDate: employee.date_of_joining,
            });

        return {
          employeeRecordId: employee.id,
          employeeId: employee.employee_id || '--',
          employeeName: employee.name || 'Employee',
          department: getRelationRecord(employee.department)?.name || 'Department not set',
          designation: getRelationRecord(employee.designation)?.title || 'Designation not set',
          reportingTo: managerMap.get(employee.reporting_manager_id)?.name || '--',
          date: selectedDate,
          swipeCount: swipeSummary.swipeCount,
          sessionCount: swipeSummary.sessionCount,
          swipePattern: swipeSummary.swipePattern,
          ...formatAttendanceRow(rendered, {
            source: holiday ? 'holiday' : rawAttendance?.source || '',
            notes: rendered.notes,
          }),
        };
      }),
      {
        search,
        status: statusFilter,
        department: departmentFilter,
      }
    );

    return NextResponse.json(
      {
        mode: 'daily',
        employeeOptions,
        departmentOptions,
        statusOptions,
        date: selectedDate,
        rows,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error loading admin attendance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load admin attendance' },
      { status: 500 }
    );
  }
}
