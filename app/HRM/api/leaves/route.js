import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminClient } from '@/utils/supabase/admin';
import { enqueueLeaveRequestEmail } from '@/utils/email-outbox';
import { hasLinkedEmployeeAccess, resolveAuthenticatedUserContext } from '@/utils/auth/context';
import {
  buildLeaveSummary,
  calculateLeaveDays,
  formatLeaveSession,
  getLeaveAttendanceCode,
  getEmployeeLeaveContext,
  getLeaveTypeCode,
  isClientHolidayLeaveType,
  isCompOffLeaveType,
  isLopLeaveType,
  isMissingLeaveSchemaError,
  listDirectReportEmployeesForLeave,
  listActiveLeaveTypes,
  syncEmployeeLeaveBalances,
  validateLeaveRequestPolicy,
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
  if (!hasLinkedEmployeeAccess(authContext)) {
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
    leaveTypeCode: leaveType?.code || getLeaveTypeCode(leaveType?.name || ''),
    startDate: row.start_date,
    endDate: row.end_date,
    compOffWorkedDate: row.comp_off_worked_date || '',
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
    reviewedByRole: row.reviewed_by_role || '',
    reviewedByName: row.reviewed_by_name || '',
    reportingManagerId: row.reporting_manager_id || '',
    reportingManagerName: row.reporting_manager_name_snapshot || '',
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

function buildProjectedOutcome(leaveType, totalDays) {
  if (isLopLeaveType(leaveType)) {
    return {
      projectedPaidDays: 0,
      projectedLopDays: totalDays,
      isProjectedLop: totalDays > 0,
    };
  }

  if (isCompOffLeaveType(leaveType) || isClientHolidayLeaveType(leaveType)) {
    return {
      projectedPaidDays: totalDays,
      projectedLopDays: 0,
      isProjectedLop: false,
    };
  }

  return {
    projectedPaidDays: totalDays,
    projectedLopDays: 0,
    isProjectedLop: false,
  };
}

async function loadBalanceAvailabilityForEmployees(employees = []) {
  const balanceGroups = await Promise.all(
    employees.map(async (reportEmployee) => {
      const reportContext = await getEmployeeLeaveContext(reportEmployee.id);
      const { balances: reportBalances } = await syncEmployeeLeaveBalances(reportContext);

      return reportBalances.map((balance) => ({
        employeeId: reportEmployee.id,
        leaveTypeId: balance.leave_type_id,
        availableDays: Number(balance.available_days || 0),
      }));
    })
  );

  return balanceGroups.flat();
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

    const directReports = await listDirectReportEmployeesForLeave(employee.id);
    const directReportIds = directReports.map((item) => item.id).filter(Boolean);
    const teamBalances = await loadBalanceAvailabilityForEmployees(directReports);
    const teamBalanceAvailabilityMap = new Map(
      teamBalances.map((balance) => [`${balance.employeeId}:${balance.leaveTypeId}`, balance.availableDays])
    );

    const [requestResult, teamRequestResult] = await Promise.all([
      adminClient
        .from('hrm_leave_requests')
        .select('*')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false }),
      directReportIds.length
        ? adminClient
            .from('hrm_leave_requests')
            .select('*')
            .in('employee_id', directReportIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    const { data: requests, error: requestError } = requestResult;
    const { data: teamRequests, error: teamRequestError } = teamRequestResult;

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

    if (teamRequestError && !isMissingLeaveSchemaError(teamRequestError)) {
      return NextResponse.json({ error: teamRequestError.message || 'Failed to load team leave requests' }, { status: 500 });
    }

    const teamEmployeeMap = new Map(directReports.map((item) => [item.id, item]));
    const mappedTeamRequests = (teamRequests || []).map((row) => {
      const employeeRow = teamEmployeeMap.get(row.employee_id);
      const baseRequest = mapLeaveRequest(row, leaveTypeMap);
      const leaveType = leaveTypeMap.get(row.leave_type_id);
      const projected = buildProjectedOutcome(leaveType, baseRequest.totalDays);

      return {
        ...baseRequest,
        employeeId: row.employee_id,
        employeeCode: employeeRow?.employee_id || '',
        employeeName: employeeRow?.name || 'Employee',
        projectedPaidDays: projected.projectedPaidDays,
        projectedLopDays: projected.projectedLopDays,
        isProjectedLop: projected.isProjectedLop,
      };
    });

    return NextResponse.json(
      {
        leaveTypes: leaveTypes.map((type) => ({
          id: type.id,
          name: type.name,
          code: type.code || getLeaveTypeCode(type),
          defaultDaysPerYear: Number(type.default_days_per_year || 0),
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
          leaveTypeCode: balance.leave_type?.code || getLeaveTypeCode(balance.leave_type?.name || ''),
        })),
        summary: buildLeaveSummary(balances),
        history: (requests || []).map((row) => mapLeaveRequest(row, leaveTypeMap)),
        teamInbox: {
          isReportingManager: directReportIds.length > 0,
          pending: mappedTeamRequests.filter((item) => item.status === 'pending'),
          history: mappedTeamRequests.filter((item) => item.status !== 'pending'),
        },
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
    const compOffWorkedDate = String(body.compOffWorkedDate || '').trim();

    if (!leaveTypeId || !startDate || !endDate || !reason) {
      return NextResponse.json({ error: 'Leave type, dates, and reason are required.' }, { status: 400 });
    }

    if (startDate > endDate) {
      return NextResponse.json({ error: 'Start date cannot be after end date.' }, { status: 400 });
    }

    const employee = await getEmployeeLeaveContext(employeeAuth.employeeId);
    const { leaveTypes, balances } = await syncEmployeeLeaveBalances(employee);
    const leaveType = leaveTypes.find((item) => item.id === leaveTypeId);
    const selectedBalance = (balances || []).find((item) => item.leave_type_id === leaveTypeId) || null;

    if (!leaveType) {
      return NextResponse.json({ error: 'Selected leave type is not active.' }, { status: 400 });
    }

    const calculation = await calculateLeaveDays({
      startDate,
      endDate,
      session,
      employeeSchedule: employee.workingSchedule,
    });

    await validateLeaveRequestPolicy({
      leaveType,
      employee,
      startDate,
      endDate,
      session,
      compOffWorkedDate,
      totalDays: calculation.totalDays,
      availableDays: Number(selectedBalance?.available_days || 0),
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
      .in('status', ['pending', 'approved'])
      .lte('start_date', endDate)
      .gte('end_date', startDate)
      .limit(1)
      .maybeSingle();

    if (duplicateError && !isMissingLeaveSchemaError(duplicateError)) {
      return NextResponse.json({ error: duplicateError.message || 'Failed to validate pending leave requests' }, { status: 500 });
    }

    if (existingPending?.id) {
      return NextResponse.json({ error: 'An existing pending or approved leave request already covers these dates.' }, { status: 400 });
    }

    const insertPayload = {
      employee_id: employee.id,
      leave_type_id: leaveType.id,
      reporting_manager_id: employee.reporting_manager_id || null,
      start_date: startDate,
      end_date: endDate,
      session,
      applied_session: session,
      status: 'pending',
      reason,
      comp_off_worked_date: compOffWorkedDate || null,
      reporting_manager_name_snapshot: null,
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

    let managerEmail = null;
    let managerName = null;
    if (created?.reporting_manager_id) {
      const { data: reportingManager } = await adminClient
        .from('hrm_employees')
        .select('id, name, email')
        .eq('id', created.reporting_manager_id)
        .maybeSingle();

      if (reportingManager) {
        managerEmail = reportingManager.email;
        managerName = reportingManager.name;
        
        await adminClient
          .from('hrm_leave_requests')
          .update({ reporting_manager_name_snapshot: reportingManager.name })
          .eq('id', created.id);
      }
    }

    try {
      if (managerEmail) {
        await enqueueLeaveRequestEmail({
          recipientEmail: managerEmail,
          recipientName: managerName,
          employeeName: employee.name,
          leaveType: leaveType.name,
          startDate: created.start_date,
          endDate: created.end_date,
          durationDays: created.duration_days,
          reason: created.reason,
          role: 'reporting_manager',
        });
      }

      const { data: hrAdmins } = await adminClient
        .from('privileged_accounts')
        .select('name, email')
        .eq('role', 'hr_admin')
        .eq('status', 'Active');

      if (hrAdmins && hrAdmins.length > 0) {
        for (const admin of hrAdmins) {
          await enqueueLeaveRequestEmail({
            recipientEmail: admin.email,
            recipientName: admin.name,
            employeeName: employee.name,
            leaveType: leaveType.name,
            startDate: created.start_date,
            endDate: created.end_date,
            durationDays: created.duration_days,
            reason: created.reason,
            role: 'hr_admin',
          });
        }
      }
    } catch (emailErr) {
      console.error('Failed to enqueue leave request notification emails:', emailErr);
    }

    return NextResponse.json(
      {
        message: 'Leave request submitted successfully.',
        request: {
          id: created.id,
          leaveTypeName: leaveType.name,
          leaveTypeCode: getLeaveAttendanceCode(leaveType),
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
