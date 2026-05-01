import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';
import {
  buildLeaveSummary,
  getEmployeeLeaveContext,
  getLeaveTypeCode,
  isMissingLeaveSchemaError,
  listActiveEmployeesForLeave,
  listActiveLeaveTypes,
  syncEmployeeLeaveBalances,
} from '@/utils/leave';

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

export async function GET() {
  try {
    const auth = await requireHrAdminAccess();
    if (auth.error) {
      return auth.error;
    }

    const [employees, leaveTypes] = await Promise.all([
      listActiveEmployeesForLeave(),
      listActiveLeaveTypes(),
    ]);

    const leaveTypeMap = new Map(leaveTypes.map((type) => [type.id, type]));

    const allBalances = [];
    for (const employee of employees || []) {
      const context = await getEmployeeLeaveContext(employee.id);
      const { balances } = await syncEmployeeLeaveBalances(context);
      allBalances.push(
        ...balances.map((balance) => ({
          employeeId: employee.id,
          employeeCode: employee.employee_id,
          employeeName: employee.name,
          leaveTypeId: balance.leave_type_id,
          leaveTypeName: balance.leave_type?.name || '',
          leaveTypeCode: balance.leave_type?.code || getLeaveTypeCode(balance.leave_type?.name || ''),
          availableDays: Number(balance.available_days || 0),
          usedDays: Number(balance.used_days || 0),
          creditedDays: Number(balance.credited_days || 0),
          lopDays: Number(balance.lop_days || 0),
        }))
      );
    }

    const balanceAvailabilityMap = new Map(
      allBalances.map((balance) => [`${balance.employeeId}:${balance.leaveTypeId}`, Number(balance.availableDays || 0)])
    );

    const { data: requests, error: requestError } = await adminClient
      .from('hrm_leave_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (requestError) {
      if (isMissingLeaveSchemaError(requestError)) {
        return NextResponse.json({ pending: [], history: [], balances: [], setupPending: true }, { status: 200 });
      }
      return NextResponse.json({ error: requestError.message || 'Failed to load leave inbox' }, { status: 500 });
    }

    const employeeMap = new Map((employees || []).map((employee) => [employee.id, employee]));
    const hrName = auth.authContext.hrAdmin?.name || auth.authContext.user?.name || 'HR Admin';

    const mappedRequests = (requests || []).map((row) => {
      const employee = employeeMap.get(row.employee_id);
      const leaveType = leaveTypeMap.get(row.leave_type_id);
      const leaveTypeCode = leaveType?.code || getLeaveTypeCode(leaveType?.name || '');
      const totalDays = Number(row.total_days ?? row.duration_days ?? 0);
      const availableDays = Number(balanceAvailabilityMap.get(`${row.employee_id}:${row.leave_type_id}`) || 0);
      const isCompOff = leaveTypeCode === 'comp_off' || leaveTypeCode === 'compensatory_off';
      const projectedPaidDays = isCompOff ? totalDays : Math.min(totalDays, availableDays);
      const projectedLopDays = isCompOff ? 0 : Math.max(0, totalDays - projectedPaidDays);

      return {
        id: row.id,
        employeeId: row.employee_id,
        employeeCode: employee?.employee_id || '',
        employeeName: employee?.name || 'Employee',
        reportingManagerId: row.reporting_manager_id || '',
        reportingManagerName: row.reporting_manager_name_snapshot || employee?.reporting_manager_name || '',
        leaveTypeName: leaveType?.name || 'Leave',
        leaveTypeCode,
        startDate: row.start_date,
        endDate: row.end_date,
        compOffWorkedDate: row.comp_off_worked_date || '',
        status: row.status,
        totalDays,
        approvedDays: Number(row.approved_days ?? 0),
        paidDays: Number(row.paid_days ?? 0),
        lopDays: Number(row.lop_days ?? 0),
        projectedPaidDays,
        projectedLopDays,
        isProjectedLop: projectedLopDays > 0,
        session: row.applied_session || row.session || 'full_day',
        reason: row.reason || '',
        reviewNote: row.review_note || '',
        rejectionReason: row.rejection_reason || '',
        reviewedAt: row.reviewed_at,
        reviewedByName: row.reviewed_by_name || (row.reviewed_at ? hrName : ''),
        reviewedByRole: row.reviewed_by_role || '',
      };
    });

    return NextResponse.json(
      {
        pending: mappedRequests.filter((item) => item.status === 'pending'),
        history: mappedRequests.filter((item) => item.status !== 'pending'),
        balances: allBalances,
        summary: buildLeaveSummary(
          allBalances.map((balance) => ({
            leave_type: { name: balance.leaveTypeName },
            available_days: balance.availableDays,
            lop_days: balance.lopDays,
          }))
        ),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error loading HR leave inbox:', error);
    if (String(error?.message || '').includes('Leave schema update is pending')) {
      return NextResponse.json({ pending: [], history: [], balances: [], setupPending: true }, { status: 200 });
    }
    return NextResponse.json({ error: error.message || 'Failed to load leave inbox' }, { status: 500 });
  }
}
