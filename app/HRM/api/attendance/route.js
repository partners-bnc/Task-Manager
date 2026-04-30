import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { hasLinkedEmployeeAccess, resolveAuthenticatedUserContext } from '@/utils/auth/context';
import {
  ATTENDANCE_POLICY,
  buildAttendanceUiRecord,
  buildHolidayUiRecord,
  getOffDayLabel,
  getAttendanceSummary,
  getCurrentDateInTimeZone,
  getCurrentMinutesInTimeZone,
  getDateRangeForMonth,
  isEmployeeScheduledOff,
  listDatesInRange,
  summarizeAttendanceFromSwipes,
  timeStringToMinutes,
} from '@/utils/attendance';
import { resolveAttendanceDoorAddress } from '@/utils/attendance-location-server';

function isMissingAttendanceTableError(error) {
  const message = error?.message || '';
  return (
    message.includes('hrm_employee_attendance') &&
    (message.includes('schema cache') || message.includes('relation') || message.includes('does not exist'))
  );
}

function isMissingSwipeTableError(error) {
  const message = error?.message || '';
  return (
    message.includes('hrm_attendance_swipes') &&
    (message.includes('schema cache') || message.includes('relation') || message.includes('does not exist'))
  );
}

function isMissingHolidayTableError(error) {
  const message = error?.message || '';
  return (
    message.includes('hrm_holidays') &&
    (message.includes('schema cache') || message.includes('relation') || message.includes('does not exist'))
  );
}

async function requireEmployeeContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const authContext = await resolveAuthenticatedUserContext(supabase, user);

  if (!hasLinkedEmployeeAccess(authContext)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const { data: employeeRow, error: employeeError } = await adminClient
    .from('hrm_employees')
    .select('id, working_days, second_saturday_off')
    .eq('id', authContext.employee.id)
    .maybeSingle();

  if (employeeError || !employeeRow?.id) {
    return {
      error: NextResponse.json(
        { error: employeeError?.message || 'Employee schedule could not be loaded' },
        { status: 500 }
      ),
    };
  }

  return {
    authContext,
    employeeId: authContext.employee.id,
    employeeSchedule: {
      workingDays: employeeRow.working_days || [],
      secondSaturdayOff: Boolean(employeeRow.second_saturday_off),
    },
  };
}

async function rollupAttendanceForDay(employeeId, attendanceDate, attendanceId = null) {
  const { data: swipes, error: swipeError } = await adminClient
    .from('hrm_attendance_swipes')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('swipe_date', attendanceDate)
    .order('swipe_time', { ascending: true });

  if (swipeError) {
    throw new Error(swipeError.message || 'Failed to load swipe data');
  }

  const summary = summarizeAttendanceFromSwipes(swipes || []);
  const attendancePayload = {
    employee_id: employeeId,
    date: attendanceDate,
    check_in: summary.firstCheckIn,
    check_out: summary.lastCheckOut,
    status: summary.attendanceStatus,
    late_in_minutes: summary.lateInMinutes,
    early_out_minutes: summary.earlyOutMinutes,
    work_hours_minutes: summary.workHoursMinutes,
    source: 'manual',
  };

  let attendanceRow = null;

  if (attendanceId) {
    const { data: updatedAttendance, error: updateError } = await adminClient
      .from('hrm_attendance')
      .update(attendancePayload)
      .eq('id', attendanceId)
      .select('*')
      .single();

    if (updateError || !updatedAttendance) {
      throw new Error(updateError?.message || 'Failed to update attendance summary');
    }

    attendanceRow = updatedAttendance;
  } else {
    const { data: insertedAttendance, error: insertError } = await adminClient
      .from('hrm_attendance')
      .insert(attendancePayload)
      .select('*')
      .single();

    if (insertError || !insertedAttendance) {
      throw new Error(insertError?.message || 'Failed to create attendance summary');
    }

    attendanceRow = insertedAttendance;
  }

  await adminClient
    .from('hrm_attendance_swipes')
    .update({ attendance_id: attendanceRow.id })
    .eq('employee_id', employeeId)
    .eq('swipe_date', attendanceDate)
    .is('attendance_id', null);

  return attendanceRow;
}

async function ensureAutoCheckoutForToday(employeeId) {
  const today = getCurrentDateInTimeZone();
  const nowMinutes = getCurrentMinutesInTimeZone();

  if (nowMinutes < timeStringToMinutes(ATTENDANCE_POLICY.autoCheckout)) {
    return;
  }

  const { data: todayAttendance } = await adminClient
    .from('hrm_attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('date', today)
    .maybeSingle();

  if (!todayAttendance?.check_in || todayAttendance.check_out) {
    return;
  }

  const { data: latestSwipe, error: latestSwipeError } = await adminClient
    .from('hrm_attendance_swipes')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('swipe_date', today)
    .order('swipe_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestSwipeError || latestSwipe?.swipe_type !== 'in') {
    return;
  }

  const autoSwipeTime = `${today}T${ATTENDANCE_POLICY.autoCheckout}:00+05:30`;

  await adminClient.from('hrm_attendance_swipes').insert({
    employee_id: employeeId,
    attendance_id: todayAttendance.id,
    swipe_date: today,
    swipe_time: autoSwipeTime,
    swipe_type: 'out',
    source: 'manual',
    notes: 'Auto checkout swipe generated by system.',
  });

  await rollupAttendanceForDay(employeeId, today, todayAttendance.id);
}

async function getTodayActionFromLatestSwipe(employeeId, attendanceDate) {
  const { data: latestSwipe, error } = await adminClient
    .from('hrm_attendance_swipes')
    .select('swipe_type')
    .eq('employee_id', employeeId)
    .eq('swipe_date', attendanceDate)
    .order('swipe_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to determine current attendance action');
  }

  return latestSwipe?.swipe_type === 'in' ? 'check_out' : 'check_in';
}

function buildMonthPayload(month, rows, holidays, employeeSchedule, todayAction = 'check_in') {
  const { start, end } = getDateRangeForMonth(month);
  const today = getCurrentDateInTimeZone();
  const rowMap = new Map(rows.map((row) => [row.date, row]));
  const holidayMap = new Map(
    (holidays || []).map((holiday) => [holiday.date, holiday])
  );
  const records = [];

  for (const date of listDatesInRange(start, end)) {
    const row = rowMap.get(date) || null;
    const holiday = holidayMap.get(date) || null;

    if (holiday) {
      records.push(buildHolidayUiRecord(date, holiday));
      continue;
    }

    if (row) {
      records.push(buildAttendanceUiRecord(date, row, employeeSchedule));
      continue;
    }

    if (date <= today) {
      records.push(buildAttendanceUiRecord(date, null, employeeSchedule));
    }
  }

  const summary = getAttendanceSummary(
    records
      .filter((record) => ['present', 'late', 'absent', 'halfday'].includes(record.status))
      .map((record) => ({ status: record.status }))
  );

  const todayRow = rowMap.get(today) || null;

  return {
    month,
    records,
    summary,
    todayAction,
    todayRecord: holidayMap.get(today)
      ? buildHolidayUiRecord(today, holidayMap.get(today))
      : todayRow
        ? buildAttendanceUiRecord(today, todayRow, employeeSchedule)
        : buildAttendanceUiRecord(today, null, employeeSchedule),
  };
}

export async function GET(request) {
  try {
    const employeeContext = await requireEmployeeContext();
    if (employeeContext.error) {
      return employeeContext.error;
    }

    const month = request.nextUrl.searchParams.get('month') || getCurrentDateInTimeZone().slice(0, 7);
    await ensureAutoCheckoutForToday(employeeContext.employeeId);

    const { start, end } = getDateRangeForMonth(month);
    const [attendanceResult, holidayResult] = await Promise.all([
      adminClient
        .from('hrm_attendance')
        .select('*')
        .eq('employee_id', employeeContext.employeeId)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true }),
      adminClient
        .from('hrm_holidays')
        .select('*')
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true }),
    ]);

    const { data: attendanceRows, error } = attendanceResult;
    const { data: holidayRows, error: holidayError } = holidayResult;

    if (error) {
      if (isMissingAttendanceTableError(error)) {
        return NextResponse.json(
          {
            ...buildMonthPayload(month, [], [], employeeContext.employeeSchedule, 'check_in'),
            setupPending: true,
          },
          { status: 200 }
        );
      }

      return NextResponse.json({ error: error.message || 'Failed to load attendance' }, { status: 500 });
    }

    if (holidayError && !isMissingHolidayTableError(holidayError)) {
      return NextResponse.json({ error: holidayError.message || 'Failed to load holidays' }, { status: 500 });
    }

    const todayAction = await getTodayActionFromLatestSwipe(employeeContext.employeeId, getCurrentDateInTimeZone());
    return NextResponse.json(
      buildMonthPayload(month, attendanceRows || [], holidayRows || [], employeeContext.employeeSchedule, todayAction),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error loading attendance:', error);
    return NextResponse.json({ error: error.message || 'Failed to load attendance' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const employeeContext = await requireEmployeeContext();
    if (employeeContext.error) {
      return employeeContext.error;
    }

    await ensureAutoCheckoutForToday(employeeContext.employeeId);

    const nowIso = new Date().toISOString();
    const attendanceDate = getCurrentDateInTimeZone();

    const { data: holidayRow, error: holidayError } = await adminClient
      .from('hrm_holidays')
      .select('id, name, type')
      .eq('date', attendanceDate)
      .maybeSingle();

    if (holidayError && !isMissingHolidayTableError(holidayError)) {
      return NextResponse.json({ error: holidayError.message || 'Failed to validate holiday schedule' }, { status: 500 });
    }

    if (holidayRow?.id) {
      return NextResponse.json(
        { error: `${holidayRow.name || 'Holiday'}${holidayRow.type ? ` (${holidayRow.type})` : ''}. Attendance cannot be marked on a holiday.` },
        { status: 400 }
      );
    }

    if (isEmployeeScheduledOff(attendanceDate, employeeContext.employeeSchedule)) {
      return NextResponse.json(
        { error: `${getOffDayLabel(attendanceDate, employeeContext.employeeSchedule)}. Attendance cannot be marked for this day.` },
        { status: 400 }
      );
    }

    let locationPayload = {};
    try {
      locationPayload = await request.json();
    } catch {
      locationPayload = {};
    }

    const { data: todayAttendance, error: todayError } = await adminClient
      .from('hrm_attendance')
      .select('*')
      .eq('employee_id', employeeContext.employeeId)
      .eq('date', attendanceDate)
      .maybeSingle();

    if (todayError) {
      return NextResponse.json({ error: todayError.message || 'Failed to load attendance status' }, { status: 500 });
    }

    if (todayAttendance?.status === 'on_leave') {
      return NextResponse.json(
        { error: 'Approved leave is already applied for today. Attendance cannot be marked.' },
        { status: 400 }
      );
    }

    const { data: existingSwipes = [], error: swipeError } = await adminClient
      .from('hrm_attendance_swipes')
      .select('*')
      .eq('employee_id', employeeContext.employeeId)
      .eq('swipe_date', attendanceDate)
      .order('swipe_time', { ascending: true });

    if (swipeError) {
      if (isMissingSwipeTableError(swipeError)) {
        return NextResponse.json(
          { error: 'Attendance swipe setup is pending. The swipe log table is not created in the database yet.' },
          { status: 503 }
        );
      }

      return NextResponse.json({ error: swipeError.message || 'Failed to load attendance swipes' }, { status: 500 });
    }

    const lastSwipe = existingSwipes[existingSwipes.length - 1] || null;
    const nextSwipeType = !lastSwipe || lastSwipe.swipe_type === 'out' ? 'in' : 'out';
    const resolvedLocation = await resolveAttendanceDoorAddress(locationPayload);

    let attendanceId = todayAttendance?.id || null;

    if (!attendanceId) {
      const { data: createdAttendance, error: createAttendanceError } = await adminClient
        .from('hrm_attendance')
        .insert({
          employee_id: employeeContext.employeeId,
          date: attendanceDate,
          status: 'absent',
          late_in_minutes: 0,
          early_out_minutes: 0,
          work_hours_minutes: 0,
          source: 'manual',
          notes: 'Attendance summary created from employee swipes.',
        })
        .select('*')
        .single();

      if (createAttendanceError || !createdAttendance) {
        return NextResponse.json({ error: createAttendanceError?.message || 'Failed to prepare attendance summary' }, { status: 500 });
      }

      attendanceId = createdAttendance.id;
    }

    const { data: createdSwipe, error: createSwipeError } = await adminClient
      .from('hrm_attendance_swipes')
      .insert({
        employee_id: employeeContext.employeeId,
        attendance_id: attendanceId,
        swipe_date: attendanceDate,
        swipe_time: nowIso,
        swipe_type: nextSwipeType,
        source: 'manual',
        door_address: resolvedLocation.doorAddress,
        notes: `Employee ${nextSwipeType === 'in' ? 'checked in' : 'checked out'} from employee panel. ${resolvedLocation.locationNote}`.trim(),
      })
      .select('*')
      .single();

    if (createSwipeError || !createdSwipe) {
      if (isMissingSwipeTableError(createSwipeError)) {
        return NextResponse.json(
          { error: 'Attendance swipe setup is pending. The swipe log table is not created in the database yet.' },
          { status: 503 }
        );
      }

      return NextResponse.json({ error: createSwipeError?.message || 'Failed to record attendance swipe' }, { status: 500 });
    }

    const attendance = await rollupAttendanceForDay(employeeContext.employeeId, attendanceDate, attendanceId);

    return NextResponse.json(
      {
        action: nextSwipeType === 'in' ? 'checked_in' : 'checked_out',
        attendance: buildAttendanceUiRecord(attendanceDate, attendance, employeeContext.employeeSchedule),
        warning: resolvedLocation.warning || '',
        resolvedDoorAddress: resolvedLocation.resolvedDoorAddress || resolvedLocation.doorAddress || '',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error toggling attendance:', error);
    return NextResponse.json({ error: error.message || 'Failed to update attendance' }, { status: 500 });
  }
}
