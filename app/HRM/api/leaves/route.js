import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import {
  buildLeaveSummary,
  calculateLeaveDays,
  formatLeaveSession,
  getEmployeeLeaveContext,
  isMissingLeaveSchemaError,
  listActiveLeaveTypes,
  syncEmployeeLeaveBalances,
} from '@/utils/leave';

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
  if (authContext?.accountType !== 'employee' || !authContext.employee?.id) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return {
    authContext,
    employeeId: authContext.employee.id,
  };
}

function mapLeaveRequest(row, leaveTypeMap) {
  const leaveType = leaveTypeMap.get(row.leave_type_id);
  return {
    id: row.id,
    leaveTypeId: row.leave_type_id,
    leaveTypeName: leaveType?.name || 'Leave',
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    session: row.applied_session || row.session || 'full_day',
    sessionLabel: formatLeaveSession(row.applied_session || row.session || 'full_day'),
    reason: row.reason || '',
    totalDays: Number(row.total_days ?? row.duration_days ?? row.approved_days ?? 0),
    approvedDays: Number(row.approved_days ?? 0),
    paidDays: Number(row.paid_days ?? 0),
    lopDays: Number(row.lop_days ?? 0),
    reviewNote: row.review_note || '',
    rejectionReason: row.rejection_reason || '',
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

export async function GET() {
  try {
    const employeeAuth = await requireEmployeeContext();
    if (employeeAuth.error) {
      return employeeAuth.error;
    }

    const employee = await getEmployeeLeaveContext(employeeAuth.employeeId);
    const { leaveTypes, balances, year } = await syncEmployeeLeaveBalances(employee);
    const leaveTypeMap = new Map(leaveTypes.map((type) => [type.id, type]));

    const { data: requests, error: requestError } = await adminClient
      .from('hrm_leave_requests')
      .select('*')
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false });

    if (requestError) {
      if (isMissingLeaveSchemaError(requestError)) {
        return NextResponse.json(
          {
            setupPending: true,
            leaveTypes: [],
            balances: [],
            summary: buildLeaveSummary([]),
            history: [],
            year,
          },
          { status: 200 }
        );
      }
      return NextResponse.json({ error: requestError.message || 'Failed to load leave requests' }, { status: 500 });
    }

    return NextResponse.json(
      {
        leaveTypes: leaveTypes.map((type) => ({
          id: type.id,
          name: type.name,
          monthlyCreditDays: Number(type.monthly_credit_days || 0),
          isPaid: Boolean(type.is_paid),
        })),
        balances: balances.map((balance) => ({
          id: balance.id,
          leaveTypeId: balance.leave_type_id,
          leaveTypeName: balance.leave_type?.name || '',
          totalDays: Number(balance.total_days || 0),
          creditedDays: Number(balance.credited_days || 0),
          carryForwardDays: Number(balance.carry_forward_days || 0),
          usedDays: Number(balance.used_days || 0),
          availableDays: Number(balance.available_days || 0),
          lopDays: Number(balance.lop_days || 0),
        })),
        summary: buildLeaveSummary(balances),
        history: (requests || []).map((row) => mapLeaveRequest(row, leaveTypeMap)),
        year,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error loading employee leave data:', error);
    if (String(error?.message || '').includes('Leave schema update is pending')) {
      return NextResponse.json(
        {
          setupPending: true,
          leaveTypes: [],
          balances: [],
          summary: buildLeaveSummary([]),
          history: [],
          year: Number(new Date().getFullYear()),
        },
        { status: 200 }
      );
    }
    return NextResponse.json({ error: error.message || 'Failed to load leave data' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const employeeAuth = await requireEmployeeContext();
    if (employeeAuth.error) {
      return employeeAuth.error;
    }

    const body = await request.json();
    const leaveTypeId = String(body.leaveTypeId || '').trim();
    const startDate = String(body.startDate || '').trim();
    const endDate = String(body.endDate || '').trim();
    const session = String(body.session || 'full_day').trim();
    const reason = String(body.reason || '').trim();

    if (!leaveTypeId || !startDate || !endDate || !reason) {
      return NextResponse.json({ error: 'Leave type, dates, and reason are required.' }, { status: 400 });
    }

    if (startDate > endDate) {
      return NextResponse.json({ error: 'Start date cannot be after end date.' }, { status: 400 });
    }

    const employee = await getEmployeeLeaveContext(employeeAuth.employeeId);
    const leaveTypes = await listActiveLeaveTypes();
    const leaveType = leaveTypes.find((item) => item.id === leaveTypeId);

    if (!leaveType) {
      return NextResponse.json({ error: 'Selected leave type is not active.' }, { status: 400 });
    }

    const calculation = await calculateLeaveDays({
      startDate,
      endDate,
      session,
      employeeSchedule: employee.workingSchedule,
    });

    if (calculation.totalDays <= 0) {
      return NextResponse.json(
        { error: 'No working leave days were found in the selected range. Holidays and off days are excluded.' },
        { status: 400 }
      );
    }

    const { data: existingPending, error: duplicateError } = await adminClient
      .from('hrm_leave_requests')
      .select('id')
      .eq('employee_id', employee.id)
      .eq('status', 'pending')
      .lte('start_date', endDate)
      .gte('end_date', startDate)
      .limit(1)
      .maybeSingle();

    if (duplicateError && !isMissingLeaveSchemaError(duplicateError)) {
      return NextResponse.json({ error: duplicateError.message || 'Failed to validate pending leave requests' }, { status: 500 });
    }

    if (existingPending?.id) {
      return NextResponse.json({ error: 'A pending leave request already exists for these dates.' }, { status: 400 });
    }

    const insertPayload = {
      employee_id: employee.id,
      leave_type_id: leaveType.id,
      start_date: startDate,
      end_date: endDate,
      session,
      applied_session: session,
      status: 'pending',
      reason,
      duration_days: calculation.totalDays,
      total_days: calculation.totalDays,
      approved_days: 0,
      paid_days: 0,
      lop_days: 0,
    };

    const { data: created, error: createError } = await adminClient
      .from('hrm_leave_requests')
      .insert(insertPayload)
      .select('*')
      .single();

    if (createError || !created) {
      if (isMissingLeaveSchemaError(createError)) {
        return NextResponse.json(
          { error: 'Leave schema update is pending. Please apply the latest migration first.' },
          { status: 503 }
        );
      }

      return NextResponse.json({ error: createError?.message || 'Failed to submit leave request' }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: 'Leave request submitted successfully.',
        request: {
          id: created.id,
          leaveTypeName: leaveType.name,
          totalDays: calculation.totalDays,
          sessionLabel: formatLeaveSession(session),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating leave request:', error);
    if (String(error?.message || '').includes('Leave schema update is pending')) {
      return NextResponse.json(
        { error: 'Leave schema update is pending. Please apply the latest migration first.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message || 'Failed to submit leave request' }, { status: 500 });
  }
}
