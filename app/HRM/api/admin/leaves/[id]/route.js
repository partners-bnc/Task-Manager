import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import {
  applyApprovedLeaveToAttendance,
  buildLeaveBalanceMap,
  calculateLeaveDays,
  getEmployeeLeaveContext,
  isMissingLeaveSchemaError,
  listActiveLeaveTypes,
  resolveApprovedLeaveOutcome,
  syncEmployeeLeaveBalances,
} from '@/utils/leave';
import { syncPayrollLopEntriesForLeaveApproval } from '@/utils/payroll';

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

async function readParams(params) {
  return typeof params?.then === 'function' ? params : Promise.resolve(params);
}

async function createLedgerEntry(payload) {
  const { error } = await adminClient.from('hrm_leave_accrual_ledger').insert(payload);
  if (error && !error.message?.includes('duplicate')) {
    throw new Error(error.message || 'Failed to update leave ledger');
  }
}

export async function PATCH(request, context) {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) {
      return auth.error;
    }

    const { id } = await readParams(context.params);
    if (!id) {
      return NextResponse.json({ error: 'Leave request id is required.' }, { status: 400 });
    }

    const body = await request.json();
    const action = String(body.action || '').trim().toLowerCase();
    const reviewNote = String(body.reviewNote || '').trim();

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid leave review action.' }, { status: 400 });
    }

    const { data: leaveRequest, error: requestError } = await adminClient
      .from('hrm_leave_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (requestError) {
      if (isMissingLeaveSchemaError(requestError)) {
        return NextResponse.json(
          { error: 'Leave schema update is pending. Please apply the latest migration first.' },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: requestError.message || 'Failed to load leave request' }, { status: 500 });
    }

    if (!leaveRequest?.id) {
      return NextResponse.json({ error: 'Leave request not found.' }, { status: 404 });
    }

    if (leaveRequest.status !== 'pending') {
      return NextResponse.json({ error: 'This leave request has already been reviewed.' }, { status: 400 });
    }

    const reviewerEmployeeId = auth.authContext.employee?.id || null;
    const reviewerName = auth.authContext.hrAdmin?.name || auth.authContext.user?.name || 'HR Admin';

    if (action === 'reject') {
      const { error: rejectError } = await adminClient
        .from('hrm_leave_requests')
        .update({
          status: 'rejected',
          review_note: reviewNote || null,
          rejection_reason: reviewNote || 'Rejected by HR',
          reviewed_by: reviewerEmployeeId,
          reviewed_by_role: 'hr_admin',
          reviewed_by_name: reviewerName,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', leaveRequest.id);

      if (rejectError) {
        return NextResponse.json({ error: rejectError.message || 'Failed to reject leave request' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Leave request rejected.' }, { status: 200 });
    }

    const employee = await getEmployeeLeaveContext(leaveRequest.employee_id);
    const { leaveTypes, balances, year } = await syncEmployeeLeaveBalances(employee);
    const leaveType = leaveTypes.find((item) => item.id === leaveRequest.leave_type_id);
    const balanceMap = buildLeaveBalanceMap(balances);
    const balance = balanceMap.get(leaveRequest.leave_type_id);

    if (!leaveType || !balance) {
      return NextResponse.json({ error: 'Leave policy or balance could not be resolved.' }, { status: 400 });
    }

    const calculation = await calculateLeaveDays({
      startDate: leaveRequest.start_date,
      endDate: leaveRequest.end_date,
      session: leaveRequest.applied_session || leaveRequest.session || 'full_day',
      employeeSchedule: employee.workingSchedule,
    });

    const { approvedDays, paidDays, lopDays, deductFromBalance } = resolveApprovedLeaveOutcome({
      leaveType,
      balance,
      requestedDays: calculation.totalDays,
    });
    const reviewedAt = new Date().toISOString();

    const { error: approveError } = await adminClient
      .from('hrm_leave_requests')
      .update({
        status: 'approved',
        approved_days: approvedDays,
        paid_days: paidDays,
        lop_days: lopDays,
        review_note: reviewNote || null,
        reviewed_by: reviewerEmployeeId,
        reviewed_by_role: 'hr_admin',
        reviewed_by_name: reviewerName,
        reviewed_at: reviewedAt,
      })
      .eq('id', leaveRequest.id);

    if (approveError) {
      return NextResponse.json({ error: approveError.message || 'Failed to approve leave request' }, { status: 500 });
    }

    if (deductFromBalance) {
      const { error: balanceError } = await adminClient
        .from('hrm_leave_balances')
        .update({
          used_days: Number(balance.used_days || 0) + paidDays,
          lop_days: Number(balance.lop_days || 0) + lopDays,
          available_days: Math.max(0, Number(balance.available_days || 0) - paidDays),
        })
        .eq('id', balance.id);

      if (balanceError) {
        return NextResponse.json({ error: balanceError.message || 'Failed to update leave balance' }, { status: 500 });
      }
    }

    if (lopDays > 0) {
      await createLedgerEntry({
        employee_id: employee.id,
        leave_type_id: leaveType.id,
        year,
        month: Number(leaveRequest.start_date.slice(5, 7)),
        entry_type: 'lop_conversion',
        days: lopDays,
        reference_request_id: leaveRequest.id,
        note: `Loss of pay generated for request ${leaveRequest.id}.`,
      });
    }

    await syncPayrollLopEntriesForLeaveApproval({
      employeeId: employee.id,
      leaveRequestId: leaveRequest.id,
      workingDates: calculation.workingDates,
      session: leaveRequest.applied_session || leaveRequest.session || 'full_day',
      paidDays,
      lopDays,
      source: 'leave_request',
    });

    await applyApprovedLeaveToAttendance({
      employeeId: employee.id,
      workingDates: calculation.workingDates,
      session: leaveRequest.applied_session || leaveRequest.session || 'full_day',
      leaveTypeName: leaveType.name,
      requestId: leaveRequest.id,
    });

    return NextResponse.json(
      {
        message: 'Leave request approved.',
        approvedDays,
        paidDays,
        lopDays,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error reviewing leave request:', error);
    if (String(error?.message || '').includes('Leave schema update is pending')) {
      return NextResponse.json(
        { error: 'Leave schema update is pending. Please apply the latest migration first.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message || 'Failed to review leave request' }, { status: 500 });
  }
}
