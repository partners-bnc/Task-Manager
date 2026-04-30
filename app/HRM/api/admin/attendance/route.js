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

function isMissingEmploymentColumnError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('employee_type') ||
    message.includes('employment_lifecycle_status') ||
    message.includes('current_stage') ||
    (message.includes('column') && message.includes('does not exist'))
  );
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
      working_days,
      second_saturday_off,
      reporting_manager_id,
      department:hrm_departments (id, name),
      designation:hrm_designations (id, title)
    `)
    .order('name', { ascending: true });
}

function getRelationRecord(value) {
  if (Array.isArray(value)) return value[0] || null;
  return value && typeof value === 'object' ? value : null;
}

function formatStatusLabel(status = '') {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) return '--';
  if (normalized === 'on_leave') return 'On Leave';
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
  if (normalized === 'late') return 'L';
  if (normalized === 'absent') return 'A';
  if (normalized === 'halfday') return 'HD';
  if (normalized === 'on_leave') return 'LV';
  if (normalized === 'holiday') return 'H';
  if (normalized === 'weekend') return 'OFF';
  return '--';
}

function buildMonthlySummary(dailyStatuses = []) {
  return dailyStatuses.reduce(
    (summary, day) => {
      const code = String(day?.code || '--');
      if (code === 'P') summary.present += 1;
      else if (code === 'L') summary.late += 1;
      else if (code === 'HD') summary.halfDay += 1;
      else if (code === 'A') summary.absent += 1;
      else if (code === 'OFF') summary.off += 1;
      else if (code === 'H') summary.holiday += 1;
      else if (code === 'LV') summary.leave += 1;
      else summary.missing += 1;
      return summary;
    },
    { present: 0, late: 0, halfDay: 0, absent: 0, off: 0, holiday: 0, leave: 0, missing: 0 }
  );
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

    const employeesResult = await loadEmployeeRows();
    if (employeesResult.error) {
      return NextResponse.json(
        { error: employeesResult.error.message || 'Failed to load employees' },
        { status: 500 }
      );
    }

    const employeeRows = (employeesResult.data || []).filter((employee) => {
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
    }));

    const departmentOptions = [...new Set(employeeOptions.map((employee) => employee.department).filter(Boolean))].sort();
    const statusOptions = [
      { value: 'present', label: 'Present' },
      { value: 'late', label: 'Late' },
      { value: 'absent', label: 'Absent' },
      { value: 'halfday', label: 'Half Day' },
      { value: 'on_leave', label: 'On Leave' },
      { value: 'holiday', label: 'Holiday' },
      { value: 'weekend', label: 'Weekend / Off' },
      { value: 'missing', label: 'Missing / No Record' },
    ];

    if (mode === 'monthly') {
      const range = getDateRangeForMonth(month);
      const calendarDays = buildCalendarDays(month);
      const selectedEmployees = employeeId
        ? employeeRows.filter((employee) => employee.id === employeeId)
        : employeeRows;

      const [attendanceResult, holidaysResult] = await Promise.all([
        adminClient
          .from('hrm_attendance')
          .select('*')
          .in('employee_id', selectedEmployees.map((employee) => employee.id))
          .gte('date', range.start)
          .lte('date', range.end)
          .order('date', { ascending: true }),
        adminClient
          .from('hrm_holidays')
          .select('*')
          .gte('date', range.start)
          .lte('date', range.end),
      ]);

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

      const holidayMap = new Map((holidaysResult.data || []).map((holiday) => [holiday.date, holiday]));
      const attendanceMap = new Map(
        (attendanceResult.data || []).map((row) => [`${row.employee_id}:${row.date}`, row])
      );

      const rows = selectedEmployees
        .map((employee) => {
          const dailyStatuses = calendarDays.map((day) => {
            const holiday = holidayMap.get(day.date);
            const rawAttendance = attendanceMap.get(`${employee.id}:${day.date}`) || null;
            const rendered = holiday
              ? buildHolidayUiRecord(day.date, holiday)
              : buildAttendanceUiRecord(day.date, rawAttendance, {
                  workingDays: employee.working_days || [],
                  secondSaturdayOff: Boolean(employee.second_saturday_off),
                });
            const normalizedStatus = String(rendered.status || '').toLowerCase() || 'missing';
            const code = mapMonthlyStatusToCode(normalizedStatus);
            return {
              date: day.date,
              code,
              status: normalizedStatus === 'weekend' ? 'weekend' : normalizedStatus || 'missing',
              label: formatStatusLabel(normalizedStatus),
              notes: rendered.notes || '',
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
            return row.summary.missing > 0;
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

      const range = rangeStart && rangeEnd ? { start: rangeStart, end: rangeEnd } : getDateRangeForMonth(month);

      const [attendanceResult, holidaysResult] = await Promise.all([
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
      ]);

      if (attendanceResult.error) {
        return NextResponse.json(
          { error: attendanceResult.error.message || 'Failed to load attendance history' },
          { status: 500 }
        );
      }

      const holidayMap = new Map((holidaysResult.data || []).map((holiday) => [holiday.date, holiday]));
      const attendanceMap = new Map((attendanceResult.data || []).map((row) => [row.date, row]));

      const rows = listDatesInRange(range.start, range.end)
        .map((date) => {
          const holiday = holidayMap.get(date);
          const rawAttendance = attendanceMap.get(date) || null;
          const rendered = holiday
            ? buildHolidayUiRecord(date, holiday)
            : buildAttendanceUiRecord(date, rawAttendance, {
                workingDays: selectedEmployee.working_days || [],
                secondSaturdayOff: Boolean(selectedEmployee.second_saturday_off),
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
          range: { start: range.start, end: range.end },
          rows,
        },
        { status: 200 }
      );
    }

    const [attendanceResult, holidayResult] = await Promise.all([
      adminClient.from('hrm_attendance').select('*').eq('date', selectedDate),
      adminClient.from('hrm_holidays').select('*').eq('date', selectedDate).maybeSingle(),
    ]);

    if (attendanceResult.error) {
      return NextResponse.json(
        { error: attendanceResult.error.message || 'Failed to load attendance table' },
        { status: 500 }
      );
    }

    const attendanceMap = new Map((attendanceResult.data || []).map((row) => [row.employee_id, row]));
    const holiday = holidayResult.data || null;

    const rows = filterRows(
      employeeRows.map((employee) => {
        const rawAttendance = attendanceMap.get(employee.id) || null;
        const rendered = holiday
          ? buildHolidayUiRecord(selectedDate, holiday)
          : buildAttendanceUiRecord(selectedDate, rawAttendance, {
              workingDays: employee.working_days || [],
              secondSaturdayOff: Boolean(employee.second_saturday_off),
            });

        return {
          employeeRecordId: employee.id,
          employeeId: employee.employee_id || '--',
          employeeName: employee.name || 'Employee',
          department: getRelationRecord(employee.department)?.name || 'Department not set',
          designation: getRelationRecord(employee.designation)?.title || 'Designation not set',
          reportingTo: managerMap.get(employee.reporting_manager_id)?.name || '--',
          date: selectedDate,
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
