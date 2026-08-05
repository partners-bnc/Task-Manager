import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';
import { hasLinkedEmployeeAccess, resolveAuthenticatedUserContext } from '@/utils/auth/context';
import {
  applyApprovedLeaveToAttendance,
  buildLeaveBalanceMap,
  calculateLeaveDays,
  getEmployeeLeaveContext,
  isLopLeaveType,
  isMissingLeaveSchemaError,
  listActiveLeaveTypes,
  resolveApprovedLeaveOutcome,
  syncEmployeeLeaveBalances,
} from '@/utils/leave';
import { syncPayrollLopEntriesForLeaveApproval, isPayrollLockedForDateRange } from '@/utils/payroll';

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
    const auth = await requireEmployeeContext();
    if (auth.error) {
      return auth.error;
    }

    const reviewerEmployeeId = auth.authContext.employee?.id || null;
    if (!reviewerEmployeeId) {
      return NextResponse.json({ error: 'Employee reviewer not found.' }, { status: 403 });
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

    if (await isPayrollLockedForDateRange(leaveRequest.start_date, leaveRequest.end_date)) {
      return NextResponse.json(
        { error: 'The payroll for this period has already been generated and locked. This leave request cannot be approved or modified.' },
        { status: 400 }
      );
    }

    const employee = await getEmployeeLeaveContext(leaveRequest.employee_id);
    const assignedReportingManagerId = leaveRequest.reporting_manager_id || employee.reporting_manager_id || null;

    if (!assignedReportingManagerId || assignedReportingManagerId !== reviewerEmployeeId) {
      return NextResponse.json({ error: 'Only the assigned reporting manager can review this leave request.' }, { status: 403 });
    }

    if (leaveRequest.status !== 'pending') {
      return NextResponse.json({ error: 'This leave request has already been reviewed.' }, { status: 400 });
    }

    const reviewerName = auth.authContext.employee?.name || auth.authContext.user?.name || 'Reporting Manager';

    if (
      leaveRequest.reporting_manager_id !== assignedReportingManagerId ||
      !leaveRequest.reporting_manager_name_snapshot
    ) {
      await adminClient
        .from('hrm_leave_requests')
        .update({
          reporting_manager_id: assignedReportingManagerId,
          reporting_manager_name_snapshot: reviewerName,
        })
        .eq('id', leaveRequest.id);
    }

    if (action === 'reject') {
      const { error: rejectError } = await adminClient
        .from('hrm_leave_requests')
        .update({
          status: 'rejected',
          review_note: reviewNote || null,
          rejection_reason: reviewNote || 'Rejected by reporting manager',
          reviewed_by: reviewerEmployeeId,
          reviewed_by_role: 'reporting_manager',
          reviewed_by_name: reviewerName,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', leaveRequest.id);

      if (rejectError) {
        return NextResponse.json({ error: rejectError.message || 'Failed to reject leave request' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Leave request rejected.' }, { status: 200 });
    }

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

    const { approvedDays, paidDays, lopDays, balanceUpdateMode } = resolveApprovedLeaveOutcome({
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
        reviewed_by_role: 'reporting_manager',
        reviewed_by_name: reviewerName,
        reviewed_at: reviewedAt,
      })
      .eq('id', leaveRequest.id);

    if (approveError) {
      return NextResponse.json({ error: approveError.message || 'Failed to approve leave request' }, { status: 500 });
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
        return NextResponse.json({ error: balanceError.message || 'Failed to update leave balance' }, { status: 500 });
      }
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
          return NextResponse.json({ error: balanceError.message || 'Failed to update leave balance' }, { status: 500 });
        }
      }

      await createLedgerEntry({
        employee_id: employee.id,
        leave_type_id: leaveType.id,
        year,
        month: Number(leaveRequest.start_date.slice(5, 7)),
        entry_type: 'lop_conversion',
        days: lopDays,
        reference_request_id: leaveRequest.id,
        note: isLopLeaveType(leaveType)
          ? `Approved LOP request ${leaveRequest.id}.`
          : `Loss of pay generated for request ${leaveRequest.id}.`,
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
    console.error('Error reviewing leave request as reporting manager:', error);
    if (String(error?.message || '').includes('Leave schema update is pending')) {
      return NextResponse.json(
        { error: 'Leave schema update is pending. Please apply the latest migration first.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message || 'Failed to review leave request' }, { status: 500 });
  }
}
