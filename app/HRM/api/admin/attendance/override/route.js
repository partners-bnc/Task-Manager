// Force compilation reload of attendance utils changes
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';

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
import {
  buildAttendanceUiRecord,
  buildHolidayUiRecord,
  getCurrentDateInTimeZone,
  getDateRangeForMonth,
  listDatesInRange,
} from '@/utils/attendance';
import {
  applyApprovedLeaveToAttendance,
  buildLeaveBalanceMap,
  calculateLeaveDays,
  formatLeaveSession,
  getEmployeeLeaveContext,
  getLeaveAttendanceCode,
  getLeaveTypeCode,
  isClientHolidayLeaveType,
  isCompOffLeaveType,
  isLopLeaveType,
  listActiveLeaveTypes,
  resolveApprovedLeaveOutcome,
  syncEmployeeLeaveBalances,
} from '@/utils/leave';
import {
  deleteAttendancePayrollLopEntry,
  syncPayrollLopEntriesForLeaveApproval,
  isPayrollLockedForDate,
} from '@/utils/payroll';

const OPPOSITE_HALF_PRESENT_MARKER = '[hr_override_opposite_half_present]';
const ATTENDANCE_ACTIONS = new Set(['present', 'absent', 'halfday', 'holiday', 'weekend']);
const APRIL_BACKFILL_CODE_MARKER = 'april_backfill_code';
const APRIL_BACKFILL_LABEL_MARKER = 'april_backfill_label';

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

function roundDays(value) {
  const numeric = Number(value);
  return Math.round(((Number.isFinite(numeric) ? numeric : 0) + Number.EPSILON) * 100) / 100;
}

function appendAuditNote(existingNotes, nextNote) {
  return [existingNotes, nextNote].filter(Boolean).join(' ').trim();
}

function stripNoteMarker(noteText = '', markerName = '') {
  return String(noteText || '')
    .replace(new RegExp(`\\[${markerName}:[^\\]]*\\]`, 'gi'), '')
    .replace(/\s+/g, ' ')
    .trim();
}

function setNoteMarker(noteText = '', markerName = '', markerValue = '') {
  const cleaned = stripNoteMarker(noteText, markerName);
  const marker = `[${markerName}:${markerValue}]`;
  return [cleaned, marker].filter(Boolean).join(' ').trim();
}

function stripAprilBackfillMarkers(noteText = '') {
  return stripNoteMarker(stripNoteMarker(noteText, APRIL_BACKFILL_CODE_MARKER), APRIL_BACKFILL_LABEL_MARKER);
}

function readNoteMarker(noteText = '', markerName = '') {
  const match = String(noteText || '').match(new RegExp(`\\[${markerName}:([^\\]]+)\\]`, 'i'));
  return match?.[1]?.trim() || '';
}

function formatStatusLabel(status = '') {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) return '--';
  if (normalized === 'missing') return '--';
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

function isAprilBackfillDate(date = '') {
  return String(date || '').startsWith('2026-04-');
}

function getLeaveTypeDisplayCode(leaveTypeCode = '') {
  const normalized = String(leaveTypeCode || '').trim().toLowerCase();
  if (normalized === 'casual_leave') return 'CL';
  if (normalized === 'sick_leave') return 'SL';
  if (normalized === 'special_leave') return 'SP';
  if (normalized === 'lop') return 'LOP';
  if (normalized === 'comp_off') return 'COFF';
  if (normalized === 'client_holiday') return 'CH';
  return '--';
}

function buildAprilBackfillOverrideDetails(action) {
  if (!action) {
    return {
      status: 'absent',
      code: 'A',
      label: 'Absent',
    };
  }

  if (action.kind === 'attendance') {
    return {
      status: action.status,
      code: mapMonthlyStatusToCode(action.status),
      label: action.label,
    };
  }

  const leaveCode = getLeaveTypeDisplayCode(action.leaveTypeCode);
  const isMarkedPresent = action.markOppositeHalfPresent;
  const oppositeCode = isMarkedPresent ? 'P' : 'A';
  const isHalfDay = action.session !== 'full_day';
  const code = !isHalfDay
    ? leaveCode
    : action.session === 'first_half'
      ? `${leaveCode}:${oppositeCode}`
      : `${oppositeCode}:${leaveCode}`;

  return {
    status: isHalfDay ? 'halfday' : 'on_leave',
    code,
    label: !isHalfDay
      ? leaveCode
      : action.session === 'first_half'
        ? `${leaveCode} - First Half`
        : `${leaveCode} - Second Half`,
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
        current.halfDay += 1;
        code
          .split(':')
          .slice(0, 2)
          .forEach((part) => addSummaryContribution(current, part, 0.5));
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
    String(rawAttendance?.status || '').toLowerCase() === 'present' ||
    String(rawAttendance?.notes || '').includes(OPPOSITE_HALF_PRESENT_MARKER);
  const sourceLabel =
    leaveRequest?.request_source === 'hr_override'
      ? 'HR Overwrite'
      : 'Approved Leave';

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

function buildAttendanceAuditMessage(actorName, previousCode, nextLabel, date) {
  return `Overwritten by ${actorName || 'HR Admin'} from ${previousCode || '--'} to ${nextLabel} on ${date}.`;
}

function normalizeAction(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function parseOverrideAction(action) {
  const normalized = normalizeAction(action);
  if (ATTENDANCE_ACTIONS.has(normalized)) {
    return {
      kind: 'attendance',
      status: normalized,
      label: formatStatusLabel(normalized),
    };
  }

  const match = normalized.match(/^(casual_leave|sick_leave|special_leave|lop|comp_off|client_holiday)_(full_day|first_half|second_half)(?:_(present|absent))?$/);
  if (!match) {
    return null;
  }

  return {
    kind: 'leave',
    leaveTypeCode: match[1],
    session: match[2],
    markOppositeHalfPresent: match[3] === 'present',
  };
}

async function createLedgerEntry(payload) {
  const { error } = await adminClient.from('hrm_leave_accrual_ledger').insert(payload);
  if (error && !String(error.message || '').includes('duplicate')) {
    throw new Error(error.message || 'Failed to update leave ledger');
  }
}

async function reverseHrOverrideRequest({
  leaveRequest,
  leaveTypeMap,
  balanceMap,
  actorName,
}) {
  const leaveType = leaveTypeMap.get(leaveRequest.leave_type_id);
  const balance = balanceMap.get(leaveRequest.leave_type_id) || null;
  const paidDays = roundDays(leaveRequest.paid_days);
  const lopDays = roundDays(leaveRequest.lop_days);

  if (balance && paidDays > 0 && !isCompOffLeaveType(leaveType) && !isClientHolidayLeaveType(leaveType)) {
    const nextUsedDays = Math.max(0, roundDays(Number(balance.used_days || 0) - paidDays));
    const nextAvailableDays = roundDays(Math.min(Number(balance.total_days || 0), Number(balance.available_days || 0) + paidDays));
    const { error: updateError } = await adminClient
      .from('hrm_leave_balances')
      .update({
        used_days: nextUsedDays,
        available_days: nextAvailableDays,
      })
      .eq('id', balance.id);

    if (updateError) {
      throw new Error(updateError.message || 'Failed to reverse paid leave balance');
    }

    balance.used_days = nextUsedDays;
    balance.available_days = nextAvailableDays;
  }

  if (balance && lopDays > 0) {
    const nextLopDays = Math.max(0, roundDays(Number(balance.lop_days || 0) - lopDays));
    const { error: updateError } = await adminClient
      .from('hrm_leave_balances')
      .update({ lop_days: nextLopDays })
      .eq('id', balance.id);

    if (updateError) {
      throw new Error(updateError.message || 'Failed to reverse LOP balance');
    }

    balance.lop_days = nextLopDays;
  }

  const { error: ledgerError } = await adminClient
    .from('hrm_leave_accrual_ledger')
    .delete()
    .eq('reference_request_id', leaveRequest.id);

  if (ledgerError) {
    throw new Error(ledgerError.message || 'Failed to reverse leave ledger entries');
  }

  const { error: lopError } = await adminClient
    .from('hrm_payroll_lop_entries')
    .delete()
    .eq('leave_request_id', leaveRequest.id);

  if (lopError) {
    throw new Error(lopError.message || 'Failed to reverse payroll LOP entries');
  }

  const { error: requestError } = await adminClient
    .from('hrm_leave_requests')
    .update({
      status: 'reversed',
      review_note: appendAuditNote(
        leaveRequest.review_note,
        `Reversed by ${actorName || 'HR Admin'} on ${getCurrentDateInTimeZone()}.`
      ),
    })
    .eq('id', leaveRequest.id);

  if (requestError) {
    throw new Error(requestError.message || 'Failed to mark HR override leave request as reversed');
  }
}

async function refreshMonthlyEmployeeState({ employeeRow, employeeId, month, today }) {
  const range = getDateRangeForMonth(month);
  const [attendanceResult, holidaysResult, leaveRequestsResult] = await Promise.all([
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
    adminClient
      .from('hrm_leave_requests')
      .select('id, employee_id, leave_type_id, start_date, end_date, applied_session, session, status, request_source, leave_type:hrm_leave_types (id, name)')
      .eq('employee_id', employeeId)
      .eq('status', 'approved')
      .lte('start_date', range.end)
      .gte('end_date', range.start),
  ]);

  if (attendanceResult.error) {
    throw new Error(attendanceResult.error.message || 'Failed to refresh monthly attendance.');
  }
  if (holidaysResult.error) {
    throw new Error(holidaysResult.error.message || 'Failed to refresh monthly holidays.');
  }
  if (leaveRequestsResult.error) {
    throw new Error(leaveRequestsResult.error.message || 'Failed to refresh monthly leave requests.');
  }

  const holidayMap = new Map((holidaysResult.data || []).map((holiday) => [holiday.date, holiday]));
  const attendanceMap = new Map((attendanceResult.data || []).map((row) => [row.date, row]));
  const leaveRequestMap = new Map();
  for (const request of leaveRequestsResult.data || []) {
    const requestStart = request.start_date < range.start ? range.start : request.start_date;
    const requestEnd = request.end_date > range.end ? range.end : request.end_date;
    for (const date of listDatesInRange(requestStart, requestEnd)) {
      leaveRequestMap.set(date, request);
    }
  }

  const dailyStatuses = listDatesInRange(range.start, range.end)
    .filter((value) => value <= today)
    .map((calendarDate) => {
      const isBeforeJoin = employeeRow.date_of_joining && calendarDate < employeeRow.date_of_joining;
      const holiday = holidayMap.get(calendarDate);
      const rawAttendance = attendanceMap.get(calendarDate) || null;
      const leaveRequest = leaveRequestMap.get(calendarDate) || null;
      const rendered = isBeforeJoin
        ? buildAttendanceUiRecord(calendarDate, null, {
            workingDays: employeeRow.working_days || [],
            secondSaturdayOff: Boolean(employeeRow.second_saturday_off),
            joinDate: employeeRow.date_of_joining,
          })
        : holiday
        ? buildHolidayUiRecord(calendarDate, holiday)
        : buildAttendanceUiRecord(calendarDate, rawAttendance, {
            workingDays: employeeRow.working_days || [],
            secondSaturdayOff: Boolean(employeeRow.second_saturday_off),
            joinDate: employeeRow.date_of_joining,
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

      return {
        date: calendarDate,
        code: leaveDetails?.code || backfillDetails?.code || mapMonthlyStatusToCode(normalizedStatus),
        status: normalizedStatus,
        label: leaveDetails?.label || backfillDetails?.label || formatStatusLabel(normalizedStatus),
        notes: leaveDetails?.notes || backfillDetails?.notes || rendered.notes || '',
      };
    });

  return {
    updatedCell: dailyStatuses.find((day) => day.date === range.start || day.date === range.end) || null,
    dailyStatuses,
    summary: buildMonthlySummary(dailyStatuses),
  };
}

async function createApprovedHrOverrideLeave({
  employee,
  leaveType,
  balance,
  action,
  date,
  actorName,
  reviewerEmployeeId,
  previousCode,
}) {
  const calculation = await calculateLeaveDays({
    startDate: date,
    endDate: date,
    session: action.session,
    employeeSchedule: employee.workingSchedule,
  });

  if (calculation.totalDays <= 0) {
    throw new Error('The selected date is not a working day for this employee.');
  }

  const { approvedDays, paidDays, lopDays, balanceUpdateMode } = resolveApprovedLeaveOutcome({
    leaveType,
    balance,
    requestedDays: calculation.totalDays,
  });

  const reviewedAt = new Date().toISOString();
  const reviewNote = buildAttendanceAuditMessage(actorName, previousCode, leaveType.name, date);
  const reason = `HR monthly attendance overwrite from ${previousCode || '--'} to ${leaveType.name}.`;

  const { data: createdRequest, error: requestError } = await adminClient
    .from('hrm_leave_requests')
    .insert({
      employee_id: employee.id,
      leave_type_id: leaveType.id,
      reporting_manager_id: employee.reporting_manager_id || null,
      start_date: date,
      end_date: date,
      session: action.session,
      applied_session: action.session,
      status: 'approved',
      reason,
      reporting_manager_name_snapshot: null,
      duration_days: calculation.totalDays,
      total_days: calculation.totalDays,
      approved_days: approvedDays,
      paid_days: paidDays,
      lop_days: lopDays,
      review_note: reviewNote,
      reviewed_by: reviewerEmployeeId,
      reviewed_by_role: 'hr_admin',
      reviewed_by_name: actorName,
      reviewed_at: reviewedAt,
      request_source: 'hr_override',
      override_attendance_date: date,
      comp_off_worked_date: null,
    })
    .select('*')
    .single();

  if (requestError || !createdRequest) {
    throw new Error(requestError?.message || 'Failed to create HR overwrite leave request');
  }

  if (balanceUpdateMode === 'paid') {
    const { error: balanceError } = await adminClient
      .from('hrm_leave_balances')
      .update({
        used_days: Number(balance.used_days || 0) + paidDays,
        available_days: Math.max(0, Number(balance.available_days || 0) - paidDays),
      })
      .eq('id', balance.id);

    if (balanceError) {
      throw new Error(balanceError.message || 'Failed to update paid leave balance');
    }

    await createLedgerEntry({
      employee_id: employee.id,
      leave_type_id: leaveType.id,
      year: Number(date.slice(0, 4)),
      month: Number(date.slice(5, 7)),
      entry_type: 'leave_usage',
      days: paidDays,
      reference_request_id: createdRequest.id,
      note: `HR overwrite approved ${leaveType.name} for ${date}.`,
    });
  }

  if (lopDays > 0) {
    if (balanceUpdateMode === 'lop_only') {
      const { error: balanceError } = await adminClient
        .from('hrm_leave_balances')
        .update({
          lop_days: Number(balance.lop_days || 0) + lopDays,
        })
        .eq('id', balance.id);

      if (balanceError) {
        throw new Error(balanceError.message || 'Failed to update LOP balance');
      }
    }

    await createLedgerEntry({
      employee_id: employee.id,
      leave_type_id: leaveType.id,
      year: Number(date.slice(0, 4)),
      month: Number(date.slice(5, 7)),
      entry_type: 'lop_conversion',
      days: lopDays,
      reference_request_id: createdRequest.id,
      note: isLopLeaveType(leaveType)
        ? `HR overwrite approved LOP for ${date}.`
        : `HR overwrite generated loss of pay for ${date}.`,
    });
  }

  await syncPayrollLopEntriesForLeaveApproval({
    employeeId: employee.id,
    leaveRequestId: createdRequest.id,
    workingDates: calculation.workingDates,
    session: action.session,
    paidDays,
    lopDays,
    source: 'leave_request',
  });

  await applyApprovedLeaveToAttendance({
    employeeId: employee.id,
    workingDates: calculation.workingDates,
    session: action.session,
    leaveTypeName: leaveType.name,
    requestId: createdRequest.id,
  });

  if (action.markOppositeHalfPresent) {
    const { data: attendanceRow, error: attendanceError } = await adminClient
      .from('hrm_attendance')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('date', date)
      .maybeSingle();

    if (attendanceError || !attendanceRow?.id) {
      throw new Error(attendanceError?.message || 'Failed to update half-day overwrite attendance details');
    }

    const { error: updateError } = await adminClient
      .from('hrm_attendance')
      .update({
        notes: appendAuditNote(stripAprilBackfillMarkers(attendanceRow.notes), OPPOSITE_HALF_PRESENT_MARKER),
        source: 'manual',
      })
      .eq('id', attendanceRow.id);

    if (updateError) {
      throw new Error(updateError.message || 'Failed to record opposite-half present flag');
    }
  }

  await deleteAttendancePayrollLopEntry(employee.id, date);

  return createdRequest;
}

export async function PATCH(request) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();
    const employeeId = String(body?.employeeId || '').trim();
    const date = String(body?.date || '').trim();
    const actionValue = String(body?.status || body?.action || '').trim();
    const currentCode = String(body?.currentCode || '').trim();
    const action = parseOverrideAction(actionValue);
    const today = getCurrentDateInTimeZone();

    if (!employeeId || !date || !action) {
      return NextResponse.json({ error: 'Employee, date, and valid overwrite action are required.' }, { status: 400 });
    }

    if (await isPayrollLockedForDate(date)) {
      return NextResponse.json(
        { error: "This month's payroll has already been generated and locked. Attendance overrides are disabled." },
        { status: 400 }
      );
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

    if (employeeError || !employeeRow?.id || isSuperAdminEntity(employeeRow)) {
      return NextResponse.json({ error: employeeError?.message || 'Employee not found.' }, { status: 404 });
    }

    const employee = await getEmployeeLeaveContext(employeeId);
    const actorName =
      auth.authContext.hrAdmin?.name ||
      auth.authContext.user?.name ||
      auth.authContext.user?.email ||
      'HR Admin';
    const reviewerEmployeeId = auth.authContext.employee?.id || null;

    const { data: existingAttendance, error: attendanceError } = await adminClient
      .from('hrm_attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', date)
      .maybeSingle();

    if (attendanceError) {
      return NextResponse.json({ error: attendanceError.message || 'Failed to load attendance row.' }, { status: 500 });
    }

    if (isAprilBackfillDate(date)) {
      if (action.status === 'weekend') {
        if (existingAttendance?.id) {
          const { error } = await adminClient.from('hrm_attendance').delete().eq('id', existingAttendance.id);
          if (error) {
            return NextResponse.json({ error: error.message || 'Failed to clear attendance row.' }, { status: 500 });
          }
        }
      } else {
        const aprilDetails = buildAprilBackfillOverrideDetails(action);
        const auditNote = buildAttendanceAuditMessage(actorName, currentCode || mapMonthlyStatusToCode(existingAttendance?.status), aprilDetails.label, date);
        const payload = {
          employee_id: employeeId,
          date,
          status: aprilDetails.status,
          check_in: existingAttendance?.check_in ?? null,
          check_out: existingAttendance?.check_out ?? null,
          late_in_minutes: Number(existingAttendance?.late_in_minutes || 0),
          early_out_minutes: Number(existingAttendance?.early_out_minutes || 0),
          work_hours_minutes: Number(existingAttendance?.work_hours_minutes || 0),
          source: 'manual',
          notes: setNoteMarker(
            setNoteMarker(
              appendAuditNote(stripAprilBackfillMarkers(existingAttendance?.notes), auditNote),
              APRIL_BACKFILL_CODE_MARKER,
              aprilDetails.code
            ),
            APRIL_BACKFILL_LABEL_MARKER,
            aprilDetails.label
          ),
        };

        if (existingAttendance?.id) {
          const { error } = await adminClient
            .from('hrm_attendance')
            .update(payload)
            .eq('id', existingAttendance.id);

          if (error) {
            return NextResponse.json({ error: error.message || 'Failed to update attendance.' }, { status: 500 });
          }
        } else {
          const { error } = await adminClient.from('hrm_attendance').insert(payload);
          if (error) {
            return NextResponse.json({ error: error.message || 'Failed to create attendance.' }, { status: 500 });
          }
        }
      }

      const month = date.slice(0, 7);
      const refreshed = await refreshMonthlyEmployeeState({
        employeeRow,
        employeeId,
        month,
        today,
      });

      const updatedCell = refreshed.dailyStatuses.find((day) => day.date === date) || {
        date,
        code: action.kind === 'attendance' ? mapMonthlyStatusToCode(action.status) : '--',
        status: action.kind === 'attendance' ? action.status : 'on_leave',
        label: action.kind === 'attendance' ? action.label : 'Leave',
        notes: '',
      };

      return NextResponse.json(
        {
          employeeId,
          date,
          month,
          updatedCell,
          summary: refreshed.summary,
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
    }

    const { data: coveringRequests, error: requestError } = await adminClient
      .from('hrm_leave_requests')
      .select('*')
      .eq('employee_id', employeeId)
      .in('status', ['pending', 'approved'])
      .lte('start_date', date)
      .gte('end_date', date);

    if (requestError) {
      return NextResponse.json({ error: requestError.message || 'Failed to inspect existing leave requests.' }, { status: 500 });
    }

    const hrOverrideRequests = (coveringRequests || []).filter((item) => item.request_source === 'hr_override');
    const normalRequests = (coveringRequests || []).filter((item) => item.request_source !== 'hr_override');

    if (normalRequests.length) {
      return NextResponse.json(
        { error: 'This date is already covered by a normal employee leave request. Please review that leave request instead of overwriting from attendance.' },
        { status: 400 }
      );
    }

    let leaveState = await syncEmployeeLeaveBalances(employee);
    const leaveTypeMap = new Map(leaveState.leaveTypes.map((item) => [item.id, item]));
    let balanceMap = buildLeaveBalanceMap(leaveState.balances);

    for (const overrideRequest of hrOverrideRequests) {
      await reverseHrOverrideRequest({
        leaveRequest: overrideRequest,
        leaveTypeMap,
        balanceMap,
        actorName,
      });
    }

    if (hrOverrideRequests.length) {
      leaveState = await syncEmployeeLeaveBalances(employee);
      balanceMap = buildLeaveBalanceMap(leaveState.balances);
    }

    const previousCode =
      currentCode ||
      getLeaveAttendanceCode({ code: existingAttendance?.status || 'A', name: existingAttendance?.status || 'Absent' });

    if (action.kind === 'leave') {
      const leaveType = leaveState.leaveTypes.find((item) => getLeaveTypeCode(item) === action.leaveTypeCode);
      const balance = leaveType ? balanceMap.get(leaveType.id) : null;

      if (!leaveType || !balance) {
        return NextResponse.json({ error: 'The selected leave policy could not be resolved.' }, { status: 400 });
      }

      await createApprovedHrOverrideLeave({
        employee,
        leaveType,
        balance,
        action,
        date,
        actorName,
        reviewerEmployeeId,
        previousCode,
      });
    } else {
      await deleteAttendancePayrollLopEntry(employee.id, date);

      if (action.status === 'weekend') {
        if (existingAttendance?.id) {
          const { error } = await adminClient.from('hrm_attendance').delete().eq('id', existingAttendance.id);
          if (error) {
            return NextResponse.json({ error: error.message || 'Failed to clear attendance row.' }, { status: 500 });
          }
        }
      } else {
        const payload = {
          employee_id: employeeId,
          date,
          status: action.status,
          check_in: existingAttendance?.check_in ?? null,
          check_out: existingAttendance?.check_out ?? null,
          late_in_minutes: Number(existingAttendance?.late_in_minutes || 0),
          early_out_minutes: Number(existingAttendance?.early_out_minutes || 0),
          work_hours_minutes: Number(existingAttendance?.work_hours_minutes || 0),
          source: 'manual',
          notes: appendAuditNote(
            stripAprilBackfillMarkers(existingAttendance?.notes),
            buildAttendanceAuditMessage(actorName, previousCode, action.label, date)
          ),
        };

        if (existingAttendance?.id) {
          const { error } = await adminClient
            .from('hrm_attendance')
            .update(payload)
            .eq('id', existingAttendance.id);

          if (error) {
            return NextResponse.json({ error: error.message || 'Failed to update attendance.' }, { status: 500 });
          }
        } else {
          const { error } = await adminClient.from('hrm_attendance').insert(payload);
          if (error) {
            return NextResponse.json({ error: error.message || 'Failed to create attendance.' }, { status: 500 });
          }
        }
      }
    }

    const month = date.slice(0, 7);
    const refreshed = await refreshMonthlyEmployeeState({
      employeeRow,
      employeeId,
      month,
      today,
    });

    const updatedCell = refreshed.dailyStatuses.find((day) => day.date === date) || {
      date,
      code: action.kind === 'attendance' ? mapMonthlyStatusToCode(action.status) : '--',
      status: action.kind === 'attendance' ? action.status : 'on_leave',
      label: action.kind === 'attendance' ? action.label : 'Leave',
      notes: '',
    };

    return NextResponse.json(
      {
        employeeId,
        date,
        month,
        updatedCell,
        summary: refreshed.summary,
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
