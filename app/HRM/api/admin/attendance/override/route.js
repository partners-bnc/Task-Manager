import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import {
  buildAttendanceUiRecord,
  buildHolidayUiRecord,
  getCurrentDateInTimeZone,
  getDateRangeForMonth,
  listDatesInRange,
} from '@/utils/attendance';

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

function getRelationRecord(value) {
  if (Array.isArray(value)) return value[0] || null;
  return value && typeof value === 'object' ? value : null;
}

function formatStatusLabel(status = '') {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) return '--';
  if (normalized === 'on_leave') return 'On Leave';
  if (normalized === 'halfday' || normalized === 'half_day') return 'Half Day';
  if (normalized === 'weekend') return 'Off';
  return normalized
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function mapMonthlyStatusToCode(status = '') {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'present') return 'P';
  if (normalized === 'absent') return 'A';
  if (normalized === 'halfday') return 'HD';
  if (normalized === 'on_leave') return 'L';
  if (normalized === 'holiday') return 'H';
  if (normalized === 'weekend') return 'OFF';
  return '--';
}

function buildMonthlySummary(dailyStatuses = []) {
  return dailyStatuses.reduce(
    (summary, day) => {
      const code = String(day?.code || '--');
      if (code === 'P') summary.present += 1;
      else if (code === 'HD') summary.halfDay += 1;
      else if (code === 'A') summary.absent += 1;
      else if (code === 'OFF') summary.off += 1;
      else if (code === 'H') summary.holiday += 1;
      else if (code === 'L') summary.leave += 1;
      else summary.missing += 1;
      return summary;
    },
    { present: 0, halfDay: 0, absent: 0, off: 0, holiday: 0, leave: 0, missing: 0 }
  );
}

function appendAuditNote(existingNotes, nextNote) {
  return [existingNotes, nextNote].filter(Boolean).join(' ').trim();
}

function buildAuditMessage(actorName, status) {
  return `Attendance updated by ${actorName || 'HR Admin'} to ${formatStatusLabel(status)}.`;
}

function normalizeStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'half_day') return 'halfday';
  if (status === 'off') return 'weekend';
  return status;
}

const EDITABLE_STATUSES = new Set(['present', 'absent', 'halfday', 'on_leave', 'holiday', 'weekend']);

export async function PATCH(request) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();
    const employeeId = String(body?.employeeId || '').trim();
    const date = String(body?.date || '').trim();
    const status = normalizeStatus(body?.status);
    const today = getCurrentDateInTimeZone();

    if (!employeeId || !date || !EDITABLE_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Employee, date, and valid status are required.' }, { status: 400 });
    }

    if (date > today) {
      return NextResponse.json({ error: 'Future attendance cannot be edited.' }, { status: 400 });
    }

    const { data: employeeRow, error: employeeError } = await adminClient
      .from('hrm_employees')
      .select(`
        id,
        employee_id,
        name,
        city,
        working_days,
        second_saturday_off,
        reporting_manager_id,
        department:hrm_departments (id, name),
        designation:hrm_designations (id, title)
      `)
      .eq('id', employeeId)
      .maybeSingle();

    if (employeeError || !employeeRow?.id) {
      return NextResponse.json({ error: employeeError?.message || 'Employee not found.' }, { status: 404 });
    }

    const { data: existingAttendance, error: attendanceError } = await adminClient
      .from('hrm_attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', date)
      .maybeSingle();

    if (attendanceError) {
      return NextResponse.json({ error: attendanceError.message || 'Failed to load attendance row.' }, { status: 500 });
    }

    const actorName =
      auth.authContext.hrAdmin?.name ||
      auth.authContext.user?.name ||
      auth.authContext.user?.email ||
      'HR Admin';

    const payload = {
      employee_id: employeeId,
      date,
      status,
      check_in: null,
      check_out: null,
      late_in_minutes: 0,
      early_out_minutes: 0,
      work_hours_minutes: 0,
      source: 'admin_manual',
      is_regularized: false,
      regularization_result: null,
      notes: appendAuditNote(existingAttendance?.notes, buildAuditMessage(actorName, status)),
    };

    let savedAttendance = null;
    if (existingAttendance?.id) {
      const { data, error } = await adminClient
        .from('hrm_attendance')
        .update(payload)
        .eq('id', existingAttendance.id)
        .select('*')
        .single();

      if (error || !data) {
        return NextResponse.json({ error: error?.message || 'Failed to update attendance.' }, { status: 500 });
      }

      savedAttendance = data;
    } else {
      const { data, error } = await adminClient
        .from('hrm_attendance')
        .insert(payload)
        .select('*')
        .single();

      if (error || !data) {
        return NextResponse.json({ error: error?.message || 'Failed to create attendance.' }, { status: 500 });
      }

      savedAttendance = data;
    }

    const month = date.slice(0, 7);
    const range = getDateRangeForMonth(month);
    const [monthAttendanceResult, holidaysResult] = await Promise.all([
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

    if (monthAttendanceResult.error) {
      return NextResponse.json(
        { error: monthAttendanceResult.error.message || 'Failed to refresh monthly attendance.' },
        { status: 500 }
      );
    }

    if (holidaysResult.error) {
      return NextResponse.json(
        { error: holidaysResult.error.message || 'Failed to refresh monthly holidays.' },
        { status: 500 }
      );
    }

    const holidayMap = new Map((holidaysResult.data || []).map((holiday) => [holiday.date, holiday]));
    const attendanceMap = new Map((monthAttendanceResult.data || []).map((row) => [row.date, row]));
    const calendarDates = listDatesInRange(range.start, range.end).filter((value) => value <= today);

    const dailyStatuses = calendarDates.map((calendarDate) => {
      const holiday = holidayMap.get(calendarDate);
      const rawAttendance = attendanceMap.get(calendarDate) || null;
      const rendered = holiday
        ? buildHolidayUiRecord(calendarDate, holiday)
        : buildAttendanceUiRecord(calendarDate, rawAttendance, {
            workingDays: employeeRow.working_days || [],
            secondSaturdayOff: Boolean(employeeRow.second_saturday_off),
          });
      const normalizedStatus = String(rendered.status || '').toLowerCase() || 'missing';
      return {
        date: calendarDate,
        code: mapMonthlyStatusToCode(normalizedStatus),
        status: normalizedStatus,
        label: formatStatusLabel(normalizedStatus),
        notes: rendered.notes || '',
      };
    });

    const updatedCell = dailyStatuses.find((day) => day.date === date) || {
      date,
      code: mapMonthlyStatusToCode(status),
      status,
      label: formatStatusLabel(status),
      notes: savedAttendance.notes || '',
    };

    return NextResponse.json(
      {
        employeeId,
        date,
        month,
        updatedCell,
        summary: buildMonthlySummary(dailyStatuses),
        source: savedAttendance.source || 'admin_manual',
        notes: savedAttendance.notes || '',
        employee: {
          id: employeeRow.id,
          employeeId: employeeRow.employee_id || '--',
          name: employeeRow.name || 'Employee',
          department: getRelationRecord(employeeRow.department)?.name || 'Department not set',
          designation: getRelationRecord(employeeRow.designation)?.title || 'Designation not set',
          city: employeeRow.city || '',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error overriding monthly attendance:', error);
    return NextResponse.json({ error: error.message || 'Failed to update attendance.' }, { status: 500 });
  }
}
