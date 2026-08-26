import { NextResponse } from 'next/server';
import { adminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { hasLinkedEmployeeAccess, resolveAuthenticatedUserContext } from '@/utils/auth/context';
import {
  getCurrentDateInTimeZone,
  getDateRangeForMonth,
  isEmployeeScheduledOff,
  listDatesInRange,
} from '@/utils/attendance';
import { listHrAdminApprovers } from '@/utils/hr-admins';
import { mapRegularizationItem } from '@/utils/regularization';
import { enqueueRegularizationRequestEmail } from '@/utils/email-outbox';
import { isPayrollLockedForDate } from '@/utils/payroll';

function isMissingRegularizationSchemaError(error) {
  const message = error?.message || '';
  return (
    (message.includes('hrm_regularization_requests') || message.includes('hrm_regularization_request_recipients')) &&
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

function groupRecipientsByRequestId(rows = []) {
  return rows.reduce((map, row) => {
    const key = row.request_id;
    if (!key) {
      return map;
    }
    if (!map[key]) {
      map[key] = [];
    }
    map[key].push(row);
    return map;
  }, {});
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
    .select('id, name, working_days, second_saturday_off')
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
    employeeName: employeeRow.name || '',
    employeeSchedule: {
      workingDays: employeeRow.working_days || [],
      secondSaturdayOff: Boolean(employeeRow.second_saturday_off),
    },
  };
}

function normalizeAttendanceStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'half_day') {
    return 'halfday';
  }
  return normalized;
}

function resolveAttendanceStatus(attendanceRow) {
  if (!attendanceRow) {
    return 'absent';
  }

  let status = normalizeAttendanceStatus(attendanceRow.status || attendanceRow.attendance_status);
  const checkInValue = attendanceRow.check_in_at || attendanceRow.check_in || null;
  const checkOutValue = attendanceRow.check_out_at || attendanceRow.check_out || null;

  if (checkInValue && !checkOutValue && status === 'present') {
    const isOverwrittenPresent = typeof attendanceRow.notes === 'string' && (
      attendanceRow.notes.includes('to Present') ||
      attendanceRow.notes.includes('Overwritten by Hr Admin')
    );
    if (!isOverwrittenPresent) {
      status = 'halfday';
    }
  }
  return status;
}

function getCurrentAttendanceStatusLabel(attendanceRow) {
  const status = resolveAttendanceStatus(attendanceRow);
  switch (status) {
    case 'halfday':
      return 'Half Day';
    case 'absent':
      return 'Absent';
    default:
      return '';
  }
}

function getCurrentAttendanceStatusValue(attendanceRow) {
  return resolveAttendanceStatus(attendanceRow);
}

function isEligibleAttendanceStatus(attendanceRow) {
  const status = resolveAttendanceStatus(attendanceRow);
  return ['halfday', 'absent'].includes(status);
}

function buildEligibleDay(date, attendanceRow, hasHalfDayLeave = false) {
  if (!attendanceRow) {
    return {
      date,
      kind: 'gap',
      label: 'Absent',
      hasHalfDayLeave,
    };
  }

  const status = resolveAttendanceStatus(attendanceRow);
  if (status === 'halfday') {
    return { date, kind: 'gap', label: 'Half Day', hasHalfDayLeave };
  }
  if (status === 'absent') {
    return { date, kind: 'gap', label: 'Absent', hasHalfDayLeave };
  }
  return null;
}

async function getReportingManagerSummary(employeeId) {
  let employeeRowResult = await adminClient
    .from('hrm_employees')
    .select('id, reporting_manager_id, reporting_super_admin_id')
    .eq('id', employeeId)
    .maybeSingle();

  const missingSuperAdminColumn = String(employeeRowResult.error?.message || '').toLowerCase().includes('reporting_super_admin_id');
  if (missingSuperAdminColumn) {
    employeeRowResult = await adminClient
      .from('hrm_employees')
      .select('id, reporting_manager_id')
      .eq('id', employeeId)
      .maybeSingle();
  }

  const { data: employeeRow, error: employeeError } = employeeRowResult;

  if (employeeError) {
    throw new Error(employeeError.message || 'Failed to load employee manager');
  }

  if (employeeRow?.reporting_manager_id) {
    const { data: managerRow, error: managerError } = await adminClient
      .from('hrm_employees')
      .select('id, employee_id, name, email, auth_user_id')
      .eq('id', employeeRow.reporting_manager_id)
      .maybeSingle();

    if (managerError) {
      throw new Error(managerError.message || 'Failed to load reporting manager');
    }

    if (managerRow) {
      return {
        id: managerRow.id,
        employeeId: managerRow.employee_id || '',
        authUserId: managerRow.auth_user_id || '',
        name: managerRow.name || '',
        email: managerRow.email || '',
        kind: 'employee',
      };
    }
  }

  if (employeeRow?.reporting_super_admin_id) {
    const { data: superAdminRow, error: superAdminError } = await adminClient
      .from('privileged_accounts')
      .select('id, auth_user_id, name, email')
      .eq('role', 'super_admin')
      .eq('id', employeeRow.reporting_super_admin_id)
      .maybeSingle();

    if (superAdminError) {
      throw new Error(superAdminError.message || 'Failed to load reporting super admin');
    }

    if (superAdminRow) {
      return {
        id: superAdminRow.id,
        employeeId: '',
        authUserId: superAdminRow.auth_user_id || '',
        name: superAdminRow.name || '',
        email: superAdminRow.email || '',
        kind: 'super_admin',
      };
    }
  }

  return null;
}

function sanitizeTime(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

export async function GET(request) {
  try {
    const employeeContext = await requireEmployeeContext();
    if (employeeContext.error) {
      return employeeContext.error;
    }

    const month = request.nextUrl.searchParams.get('month') || getCurrentDateInTimeZone().slice(0, 7);
    const { start, end } = getDateRangeForMonth(month);
    const today = getCurrentDateInTimeZone();

    const [attendanceResult, regularizationResult, hrApprovers, reportingManager, leaveRequestsResult, holidayResult] = await Promise.all([
      adminClient
        .from('hrm_attendance')
        .select('*')
        .eq('employee_id', employeeContext.employeeId)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true }),
      adminClient
        .from('hrm_regularization_requests')
        .select('*')
        .eq('employee_id', employeeContext.employeeId)
        .gte('date', start)
        .lte('date', end)
        .order('created_at', { ascending: false }),
      listHrAdminApprovers(),
      getReportingManagerSummary(employeeContext.employeeId),
      adminClient
        .from('hrm_leave_requests')
        .select('start_date, end_date, session, applied_session, status')
        .eq('employee_id', employeeContext.employeeId)
        .eq('status', 'approved')
        .lte('start_date', end)
        .gte('end_date', start),
      adminClient
        .from('hrm_holidays')
        .select('date')
        .gte('date', start)
        .lte('date', end),
    ]);

    const { data: attendanceRows, error: attendanceError } = attendanceResult;
    const { data: regularizationRows, error: regularizationError } = regularizationResult;
    const { data: holidayRows, error: holidayError } = holidayResult;

    if (attendanceError) {
      return NextResponse.json({ error: attendanceError.message || 'Failed to load attendance issues' }, { status: 500 });
    }

    if (regularizationError) {
      if (isMissingRegularizationSchemaError(regularizationError)) {
        return NextResponse.json(
          { month, eligibleDays: [], pending: [], history: [], hrApprovers, reportingManager, setupPending: true },
          { status: 200 }
        );
      }
      return NextResponse.json({ error: regularizationError.message || 'Failed to load regularization requests' }, { status: 500 });
    }

    if (holidayError && !isMissingHolidayTableError(holidayError)) {
      return NextResponse.json({ error: holidayError.message || 'Failed to load holidays' }, { status: 500 });
    }

    const requestIds = (regularizationRows || []).map((row) => row.id).filter(Boolean);
    let recipientsByRequestId = {};

    if (requestIds.length > 0) {
      let recipientRows = [];
      const chunkSize = 100;
      for (let i = 0; i < requestIds.length; i += chunkSize) {
        const chunk = requestIds.slice(i, i + chunkSize);
        const { data: chunkRows, error: recipientError } = await adminClient
          .from('hrm_regularization_request_recipients')
          .select('*')
          .in('request_id', chunk);

        if (recipientError) {
          if (isMissingRegularizationSchemaError(recipientError)) {
            return NextResponse.json(
              { month, eligibleDays: [], pending: [], history: [], hrApprovers, reportingManager, setupPending: true },
              { status: 200 }
            );
          }
          return NextResponse.json({ error: recipientError.message || 'Failed to load regularization recipients' }, { status: 500 });
        }
        if (chunkRows) {
          recipientRows = recipientRows.concat(chunkRows);
        }
      }

      recipientsByRequestId = groupRecipientsByRequestId(recipientRows);
    }

    const attendanceMap = new Map((attendanceRows || []).map((row) => [row.date, row]));
    const resolvedDates = new Set(
      (regularizationRows || [])
        .filter((row) => {
          const status = String(row.status || row.request_status).toLowerCase();
          return status === 'pending' || status === 'approved';
        })
        .map((row) => row.date)
    );

    const halfDayLeaveDates = new Set();
    for (const req of leaveRequestsResult.data || []) {
      const sess = req.applied_session || req.session || 'full_day';
      if (sess !== 'full_day') {
        const startD = req.start_date < start ? start : req.start_date;
        const endD = req.end_date > end ? end : req.end_date;
        for (const date of listDatesInRange(startD, endD)) {
          halfDayLeaveDates.add(date);
        }
      }
    }

    const holidayDates = new Set((holidayRows || []).map((row) => row.date));

    const eligibleDays = [];
    for (const date of listDatesInRange(start, end)) {
      if (
        date > today ||
        resolvedDates.has(date) ||
        isEmployeeScheduledOff(date, employeeContext.employeeSchedule) ||
        holidayDates.has(date)
      ) {
        continue;
      }

      const day = buildEligibleDay(date, attendanceMap.get(date) || null, halfDayLeaveDates.has(date));
      if (day) {
        eligibleDays.push(day);
      }
    }

    const pending = [];
    const history = [];

    for (const row of regularizationRows || []) {
      const rowWithRecipients = {
        ...row,
        recipients: recipientsByRequestId[row.id] || [],
      };
      const mapped = mapRegularizationItem(rowWithRecipients, {
        currentStatusLabel: row.current_attendance_status
          ? getCurrentAttendanceStatusLabel({ status: row.current_attendance_status })
          : getCurrentAttendanceStatusLabel(attendanceMap.get(row.date)),
      });

      if (String(row.status || row.request_status).toLowerCase() === 'pending') {
        pending.push(mapped);
      } else {
        history.push(mapped);
      }
    }

    return NextResponse.json(
      {
        month,
        eligibleDays,
        pending,
        history,
        hrApprovers: hrApprovers.map((item) => ({ id: item.id, name: item.name, email: item.email })),
        reportingManager: reportingManager
          ? { id: reportingManager.id, name: reportingManager.name, email: reportingManager.email }
          : null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error loading regularization:', error);
    return NextResponse.json({ error: error.message || 'Failed to load regularization data' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const employeeContext = await requireEmployeeContext();
    if (employeeContext.error) {
      return employeeContext.error;
    }

    const body = await request.json();
    const attendanceDate = typeof body.attendanceDate === 'string' ? body.attendanceDate : '';
    const requestType = typeof body.requestType === 'string' ? body.requestType.trim() : '';
    const requestedCheckIn = sanitizeTime(body.requestedCheckIn);
    const requestedCheckOut = sanitizeTime(body.requestedCheckOut);
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const primaryHrApproverId = typeof body.primaryHrApproverId === 'string' ? body.primaryHrApproverId.trim() : '';

    if (!attendanceDate) {
      return NextResponse.json({ error: 'Attendance date is required' }, { status: 400 });
    }

    if (await isPayrollLockedForDate(attendanceDate)) {
      return NextResponse.json(
        { error: "This month's payroll has already been generated and locked. Regularizations cannot be applied." },
        { status: 400 }
      );
    }

    if (!primaryHrApproverId) {
      return NextResponse.json({ error: 'Select one HR approver' }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({ error: 'Reason for regularization is required' }, { status: 400 });
    }

    if (attendanceDate > getCurrentDateInTimeZone()) {
      return NextResponse.json({ error: 'Future dates cannot be regularized' }, { status: 400 });
    }

    const { data: holidayRow, error: holidayError } = await adminClient
      .from('hrm_holidays')
      .select('id')
      .eq('date', attendanceDate)
      .maybeSingle();

    if (holidayError && !isMissingHolidayTableError(holidayError)) {
      return NextResponse.json({ error: holidayError.message || 'Failed to validate holiday schedule' }, { status: 500 });
    }

    if (holidayRow?.id) {
      return NextResponse.json({ error: 'Holiday dates cannot be regularized' }, { status: 400 });
    }

    if (isEmployeeScheduledOff(attendanceDate, employeeContext.employeeSchedule)) {
      return NextResponse.json({ error: 'Weekly off or holiday dates cannot be regularized' }, { status: 400 });
    }

    const [attendanceResult, existingPendingResult, hrApprovers, reportingManager] = await Promise.all([
      adminClient
        .from('hrm_attendance')
        .select('*')
        .eq('employee_id', employeeContext.employeeId)
        .eq('date', attendanceDate)
        .maybeSingle(),
      adminClient
        .from('hrm_regularization_requests')
        .select('id')
        .eq('employee_id', employeeContext.employeeId)
        .eq('date', attendanceDate)
        .eq('status', 'pending')
        .maybeSingle(),
      listHrAdminApprovers(),
      getReportingManagerSummary(employeeContext.employeeId),
    ]);

    if (existingPendingResult.data?.id) {
      return NextResponse.json({ error: 'A pending request already exists for this date' }, { status: 409 });
    }

    const selectedHrApprover = hrApprovers.find((item) => item.id === primaryHrApproverId);
    if (!selectedHrApprover) {
      return NextResponse.json({ error: 'Selected HR approver is not valid' }, { status: 400 });
    }

    let attendanceRow = attendanceResult.data || null;
    if (attendanceResult.error) {
      return NextResponse.json({ error: attendanceResult.error.message || 'Failed to validate attendance' }, { status: 500 });
    }

    if (attendanceRow && !isEligibleAttendanceStatus(attendanceRow)) {
      return NextResponse.json({ error: 'Only half day or absent dates can be regularized' }, { status: 400 });
    }

    if (!attendanceRow) {
      const { data: insertedAttendance, error: attendanceInsertError } = await adminClient
        .from('hrm_attendance')
        .insert({
          employee_id: employeeContext.employeeId,
          date: attendanceDate,
          status: 'absent',
          late_in_minutes: 0,
          early_out_minutes: 0,
          work_hours_minutes: 0,
          source: 'manual',
          notes: 'Absent record created for attendance regularization.',
        })
        .select('*')
        .single();

      if (attendanceInsertError || !insertedAttendance) {
        return NextResponse.json({ error: attendanceInsertError?.message || 'Failed to prepare attendance record' }, { status: 500 });
      }

      attendanceRow = insertedAttendance;
    }

    const requestPayload = {
      employee_id: employeeContext.employeeId,
      attendance_id: attendanceRow.id,
      date: attendanceDate,
      current_attendance_status: getCurrentAttendanceStatusValue(attendanceRow),
      request_type: requestType || getCurrentAttendanceStatusLabel(attendanceRow) || 'Regularization',
      requested_check_in: requestedCheckIn,
      requested_check_out: requestedCheckOut,
      permission_type: requestType || getCurrentAttendanceStatusLabel(attendanceRow) || 'Regularization',
      time_range_start: requestedCheckIn,
      time_range_end: requestedCheckOut,
      reason,
      status: 'pending',
    };

    const { data: regularizationRow, error: insertError } = await adminClient
      .from('hrm_regularization_requests')
      .insert(requestPayload)
      .select('*')
      .single();

    if (insertError || !regularizationRow) {
      if (isMissingRegularizationSchemaError(insertError)) {
        return NextResponse.json(
          { error: 'Regularization schema update is pending. Please apply the latest migration first.' },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: insertError?.message || 'Failed to submit regularization request' }, { status: 500 });
    }

    const recipientsPayload = [
      {
        request_id: regularizationRow.id,
        recipient_type: 'approver',
        recipient_role: 'hr_admin',
        recipient_auth_user_id: selectedHrApprover.id,
        recipient_name: selectedHrApprover.name,
        recipient_email: selectedHrApprover.email,
      },
      ...(reportingManager
        ? [
          {
            request_id: regularizationRow.id,
            recipient_type: 'approver',
            recipient_role: 'reporting_manager',
            recipient_auth_user_id: reportingManager.authUserId || null,
            recipient_employee_id: reportingManager.kind === 'employee' ? reportingManager.id : null,
            recipient_name: reportingManager.name,
            recipient_email: reportingManager.email,
          },
        ]
        : []),
    ];

    const { error: recipientInsertError } = await adminClient
      .from('hrm_regularization_request_recipients')
      .insert(recipientsPayload);

    if (recipientInsertError) {
      await adminClient.from('hrm_regularization_requests').delete().eq('id', regularizationRow.id);
      if (isMissingRegularizationSchemaError(recipientInsertError)) {
        return NextResponse.json(
          { error: 'Regularization recipient setup is pending. Please apply the latest migration first.' },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: recipientInsertError.message || 'Failed to route the regularization request' }, { status: 500 });
    }

    try {
      for (const rec of recipientsPayload) {
        await enqueueRegularizationRequestEmail({
          recipientEmail: rec.recipient_email,
          recipientName: rec.recipient_name,
          employeeName: employeeContext.employeeName,
          date: regularizationRow.date,
          requestType: regularizationRow.request_type,
          requestedCheckIn: regularizationRow.requested_check_in,
          requestedCheckOut: regularizationRow.requested_check_out,
          reason: regularizationRow.reason,
          role: rec.recipient_role,
        });
      }
    } catch (emailErr) {
      console.error('Failed to enqueue regularization request notification emails:', emailErr);
    }

    const responseRequest = {
      ...regularizationRow,
      recipients: recipientsPayload,
    };

    return NextResponse.json(
      {
        request: mapRegularizationItem(responseRequest, {
          currentStatusLabel: getCurrentAttendanceStatusLabel({ status: responseRequest.current_attendance_status }),
        }),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating regularization request:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit regularization request' }, { status: 500 });
  }
}

