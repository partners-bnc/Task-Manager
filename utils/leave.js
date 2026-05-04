import { adminClient } from '@/utils/supabase/admin';
import {
  createTimestampForAttendanceDate,
  getCurrentDateInTimeZone,
  isEmployeeScheduledOff,
  listDatesInRange,
} from '@/utils/attendance';
import { deriveEmploymentFields } from '@/utils/hrm-employment';

const MONTHLY_DEFAULTS = {
  'Casual Leave': 0.5,
  'Sick Leave': 1,
};

const PAID_DEFAULTS = {
  'Casual Leave': true,
  'Sick Leave': true,
};

function slugifyLeaveTypeName(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getLeaveTypeCode(leaveType) {
  if (leaveType && typeof leaveType === 'object' && leaveType.code) {
    return String(leaveType.code || '').trim().toLowerCase();
  }

  if (leaveType && typeof leaveType === 'object') {
    return slugifyLeaveTypeName(leaveType.name || '');
  }

  return slugifyLeaveTypeName(leaveType || '');
}

export function isSpecialLeaveType(leaveType) {
  return getLeaveTypeCode(leaveType) === 'special_leave';
}

export function isCompOffLeaveType(leaveType) {
  const code = getLeaveTypeCode(leaveType);
  return code === 'comp_off' || code === 'compensatory_off';
}

export function isLopLeaveType(leaveType) {
  const code = getLeaveTypeCode(leaveType);
  return code === 'lop' || code === 'loss_of_pay' || code === 'loss_of_pay_lop';
}

export function isClientHolidayLeaveType(leaveType) {
  const code = getLeaveTypeCode(leaveType);
  return code === 'client_holiday' || code === 'client_holiday_ch' || code === 'ch';
}

export function getLeaveAttendanceCode(leaveType) {
  if (isLopLeaveType(leaveType)) return 'LOP';
  if (isClientHolidayLeaveType(leaveType)) return 'CH';
  if (isCompOffLeaveType(leaveType)) return 'COFF';
  if (isSpecialLeaveType(leaveType)) return 'SP';

  const code = getLeaveTypeCode(leaveType);
  if (code === 'casual_leave') return 'CL';
  if (code === 'sick_leave') return 'SL';

  return String(leaveType?.name || leaveType || 'L')
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 3) || 'L';
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function roundLeaveDays(value) {
  return Math.round((toNumber(value, 0) + Number.EPSILON) * 100) / 100;
}

function startOfMonth(dateString) {
  return `${dateString.slice(0, 7)}-01`;
}

function getMonthsBetween(startDate, endDate) {
  const months = [];
  const cursor = new Date(`${startOfMonth(startDate)}T00:00:00`);
  const end = new Date(`${startOfMonth(endDate)}T00:00:00`);

  while (cursor <= end) {
    months.push({
      year: cursor.getFullYear(),
      month: cursor.getMonth() + 1,
      key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function normalizeLeaveTypePolicy(row = {}) {
  const name = String(row.name || '').trim();
  const monthlyCreditDays = row.monthly_credit_days ?? MONTHLY_DEFAULTS[name] ?? 0;
  const isPaid = row.is_paid ?? PAID_DEFAULTS[name] ?? true;

  return {
    ...row,
    name,
    code: row.code || slugifyLeaveTypeName(name),
    monthly_credit_days: roundLeaveDays(monthlyCreditDays),
    default_days_per_year: roundLeaveDays(row.default_days_per_year),
    is_paid: Boolean(isPaid),
    counts_as_lop: Boolean(row.counts_as_lop),
    is_carry_forward: Boolean(row.is_carry_forward),
    max_carry_forward_days: roundLeaveDays(row.max_carry_forward_days),
  };
}

export function isMissingLeaveSchemaError(error) {
  const message = error?.message || '';
  return (
    message.includes('hrm_leave_') &&
    (message.includes('schema cache') || message.includes('relation') || message.includes('does not exist'))
  );
}

export function isMissingLeaveLedgerError(error) {
  const message = error?.message || '';
  return (
    message.includes('hrm_leave_accrual_ledger') &&
    (message.includes('schema cache') || message.includes('relation') || message.includes('does not exist'))
  );
}

function isMissingEmploymentColumnsError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('employment_lifecycle_status') ||
    message.includes('current_stage') ||
    message.includes('could not find the column') ||
    (message.includes('column') && message.includes('does not exist'))
  );
}

const EMPLOYEE_LEAVE_CONTEXT_SELECT_BASE =
  'id, employee_id, name, employee_status, date_of_joining, working_days, second_saturday_off, reporting_manager_id';
const EMPLOYEE_LEAVE_CONTEXT_SELECT_WITH_EMPLOYMENT_FIELDS =
  `${EMPLOYEE_LEAVE_CONTEXT_SELECT_BASE}, employment_lifecycle_status, current_stage`;

export async function getEmployeeLeaveContext(employeeId) {
  let employeeResult = await adminClient
    .from('hrm_employees')
    .select(EMPLOYEE_LEAVE_CONTEXT_SELECT_WITH_EMPLOYMENT_FIELDS)
    .eq('id', employeeId)
    .maybeSingle();

  if (employeeResult.error && isMissingEmploymentColumnsError(employeeResult.error)) {
    employeeResult = await adminClient
      .from('hrm_employees')
      .select(EMPLOYEE_LEAVE_CONTEXT_SELECT_BASE)
      .eq('id', employeeId)
      .maybeSingle();
  }

  const { data: employee, error } = employeeResult;

  if (error || !employee?.id) {
    throw new Error(error?.message || 'Employee context could not be loaded');
  }

  const employment = deriveEmploymentFields(employee);

  return {
    ...employee,
    employment_lifecycle_status:
      employee.employment_lifecycle_status ?? employment.employmentLifecycleStatus,
    current_stage: employee.current_stage ?? employment.currentStage,
    resolved_employment_lifecycle_status: employment.employmentLifecycleStatus,
    resolved_current_stage: employment.currentStage,
    workingSchedule: {
      workingDays: employee.working_days || [],
      secondSaturdayOff: Boolean(employee.second_saturday_off),
    },
  };
}

export async function listActiveEmployeesForLeave() {
  let employeeResult = await adminClient
    .from('hrm_employees')
    .select(EMPLOYEE_LEAVE_CONTEXT_SELECT_WITH_EMPLOYMENT_FIELDS)
    .eq('employment_lifecycle_status', 'active')
    .order('name', { ascending: true });

  if (employeeResult.error && isMissingEmploymentColumnsError(employeeResult.error)) {
    employeeResult = await adminClient
      .from('hrm_employees')
      .select(EMPLOYEE_LEAVE_CONTEXT_SELECT_BASE)
      .eq('employee_status', 'active')
      .order('name', { ascending: true });
  }

  const { data: employees, error } = employeeResult;

  if (error) {
    throw new Error(error.message || 'Failed to load active employees');
  }

  return (employees || []).map((employee) => {
    const employment = deriveEmploymentFields(employee);
    return {
      ...employee,
      employment_lifecycle_status:
        employee.employment_lifecycle_status ?? employment.employmentLifecycleStatus,
      current_stage: employee.current_stage ?? employment.currentStage,
      resolved_employment_lifecycle_status: employment.employmentLifecycleStatus,
      resolved_current_stage: employment.currentStage,
    };
  });
}

export async function listDirectReportEmployeesForLeave(reportingManagerId) {
  if (!reportingManagerId) {
    return [];
  }

  let employeeResult = await adminClient
    .from('hrm_employees')
    .select(EMPLOYEE_LEAVE_CONTEXT_SELECT_WITH_EMPLOYMENT_FIELDS)
    .eq('reporting_manager_id', reportingManagerId)
    .eq('employment_lifecycle_status', 'active')
    .order('name', { ascending: true });

  if (employeeResult.error && isMissingEmploymentColumnsError(employeeResult.error)) {
    employeeResult = await adminClient
      .from('hrm_employees')
      .select(EMPLOYEE_LEAVE_CONTEXT_SELECT_BASE)
      .eq('reporting_manager_id', reportingManagerId)
      .eq('employee_status', 'active')
      .order('name', { ascending: true });
  }

  const { data: employees, error } = employeeResult;

  if (error) {
    throw new Error(error.message || 'Failed to load reporting employees');
  }

  return (employees || []).map((employee) => {
    const employment = deriveEmploymentFields(employee);
    return {
      ...employee,
      employment_lifecycle_status:
        employee.employment_lifecycle_status ?? employment.employmentLifecycleStatus,
      current_stage: employee.current_stage ?? employment.currentStage,
      resolved_employment_lifecycle_status: employment.employmentLifecycleStatus,
      resolved_current_stage: employment.currentStage,
    };
  });
}

export async function listActiveLeaveTypes() {
  const { data, error } = await adminClient
    .from('hrm_leave_types')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to load leave policies');
  }

  return (data || [])
    .map(normalizeLeaveTypePolicy)
    .sort((left, right) => {
      const leftOrder = Number.isFinite(Number(left.display_order)) ? Number(left.display_order) : Number.MAX_SAFE_INTEGER;
      const rightOrder = Number.isFinite(Number(right.display_order)) ? Number(right.display_order) : Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.name.localeCompare(right.name);
    });
}

async function ensureBalanceRow(employeeId, leaveType, year) {
  const { data: existing, error: existingError } = await adminClient
    .from('hrm_leave_balances')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('leave_type_id', leaveType.id)
    .eq('year', year)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message || 'Failed to load leave balance');
  }

  if (existing) {
    return existing;
  }

  const insertPayload = {
    employee_id: employeeId,
    leave_type_id: leaveType.id,
    year,
    total_days: 0,
    used_days: 0,
    credited_days: 0,
    lop_days: 0,
    carry_forward_days: 0,
    available_days: 0,
  };

  const { data: created, error: createError } = await adminClient
    .from('hrm_leave_balances')
    .insert(insertPayload)
    .select('*')
    .single();

  if (createError || !created) {
    throw new Error(createError?.message || 'Failed to create leave balance');
  }

  return created;
}

async function getPreviousYearCarryForward(employeeId, leaveType, year) {
  if (!leaveType.is_carry_forward || year <= 0) {
    return 0;
  }

  const { data: previousBalance, error } = await adminClient
    .from('hrm_leave_balances')
    .select('available_days')
    .eq('employee_id', employeeId)
    .eq('leave_type_id', leaveType.id)
    .eq('year', year - 1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load carry-forward balance');
  }

  const availableDays = roundLeaveDays(previousBalance?.available_days);
  if (leaveType.max_carry_forward_days > 0) {
    return Math.min(availableDays, leaveType.max_carry_forward_days);
  }

  return availableDays;
}

async function listLedgerEntries(employeeId, leaveTypeId, year) {
  const { data, error } = await adminClient
    .from('hrm_leave_accrual_ledger')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('leave_type_id', leaveTypeId)
    .eq('year', year);

  if (error) {
    if (isMissingLeaveLedgerError(error)) {
      throw new Error('Leave schema update is pending. Please apply the latest migration first.');
    }
    throw new Error(error.message || 'Failed to load leave ledger');
  }

  return data || [];
}

async function insertLedgerEntry(payload) {
  const { error } = await adminClient.from('hrm_leave_accrual_ledger').insert(payload);
  if (error && !error.message?.includes('duplicate')) {
    throw new Error(error.message || 'Failed to write leave ledger entry');
  }
}

function buildYearlyAllocationNote(leaveTypeName, year) {
  return `${leaveTypeName} yearly allocation for ${year}.`;
}

export async function syncEmployeeLeaveBalances(employee, asOfDate = getCurrentDateInTimeZone()) {
  const leaveTypes = await listActiveLeaveTypes();
  const currentYear = Number(asOfDate.slice(0, 4));
  const currentMonth = Number(asOfDate.slice(5, 7));
  const joiningDate = employee.date_of_joining || asOfDate;
  const joiningYear = Number(joiningDate.slice(0, 4));
  const joiningMonth = Number(joiningDate.slice(5, 7));

  const balances = [];

  for (const leaveType of leaveTypes) {
    const balance = await ensureBalanceRow(employee.id, leaveType, currentYear);
    const carryForwardDays = await getPreviousYearCarryForward(employee.id, leaveType, currentYear);
    const ledgerEntries = await listLedgerEntries(employee.id, leaveType.id, currentYear);

    const entryKeys = new Set(
      ledgerEntries.map((entry) => {
        const monthKey = entry.month ? String(entry.month).padStart(2, '0') : '00';
        return `${entry.entry_type}:${entry.year}:${monthKey}`;
      })
    );
    const hasYearlyAllocationEntry = ledgerEntries.some((entry) => {
      return (
        (entry.entry_type === 'yearly_allocation' || entry.entry_type === 'manual_adjustment') &&
        String(entry.note || '').trim() === buildYearlyAllocationNote(leaveType.name, currentYear)
      );
    });

    if (carryForwardDays > 0 && !entryKeys.has(`carry_forward:${currentYear}:00`)) {
      await insertLedgerEntry({
        employee_id: employee.id,
        leave_type_id: leaveType.id,
        year: currentYear,
        month: null,
        entry_type: 'carry_forward',
        days: carryForwardDays,
        note: `Carry forward applied for ${currentYear}.`,
      });
    }

    if (leaveType.default_days_per_year > 0 && leaveType.monthly_credit_days <= 0) {
      if (!hasYearlyAllocationEntry && currentYear >= joiningYear) {
        await insertLedgerEntry({
          employee_id: employee.id,
          leave_type_id: leaveType.id,
          year: currentYear,
          month: null,
          entry_type: 'manual_adjustment',
          days: leaveType.default_days_per_year,
          note: buildYearlyAllocationNote(leaveType.name, currentYear),
        });
      }
    }

    if (leaveType.monthly_credit_days > 0) {
      const firstCreditMonth = joiningYear === currentYear ? joiningMonth : 1;
      for (let month = firstCreditMonth; month <= currentMonth; month += 1) {
        const key = `monthly_credit:${currentYear}:${String(month).padStart(2, '0')}`;
        if (entryKeys.has(key)) {
          continue;
        }

        await insertLedgerEntry({
          employee_id: employee.id,
          leave_type_id: leaveType.id,
          year: currentYear,
          month,
          entry_type: 'monthly_credit',
          days: leaveType.monthly_credit_days,
          note: `${leaveType.name} monthly credit for ${currentYear}-${String(month).padStart(2, '0')}.`,
        });
      }
    }

    const refreshedLedger = await listLedgerEntries(employee.id, leaveType.id, currentYear);
    const creditedDays = roundLeaveDays(
      refreshedLedger
        .filter((entry) => ['monthly_credit', 'manual_adjustment', 'yearly_allocation'].includes(entry.entry_type))
        .reduce((total, entry) => total + toNumber(entry.days), 0)
    );
    const carryDays = roundLeaveDays(
      refreshedLedger
        .filter((entry) => entry.entry_type === 'carry_forward')
        .reduce((total, entry) => total + toNumber(entry.days), 0)
    );
    const balanceUsedDays = roundLeaveDays(balance.used_days);
    const balanceLopDays = roundLeaveDays(balance.lop_days);
    const totalDays = roundLeaveDays(carryDays + creditedDays);
    const availableDays = roundLeaveDays(Math.max(0, totalDays - balanceUsedDays));

    const { data: updatedBalance, error: updateError } = await adminClient
      .from('hrm_leave_balances')
      .update({
        credited_days: creditedDays,
        carry_forward_days: carryDays,
        total_days: totalDays,
        available_days: availableDays,
      })
      .eq('id', balance.id)
      .select('*')
      .single();

    if (updateError || !updatedBalance) {
      throw new Error(updateError?.message || 'Failed to refresh leave balance');
    }

    balances.push({
      ...updatedBalance,
      used_days: balanceUsedDays,
      lop_days: balanceLopDays,
      leave_type: leaveType,
    });
  }

  return { leaveTypes, balances, year: currentYear };
}

export async function getHolidayDateSet(startDate, endDate) {
  const { data, error } = await adminClient
    .from('hrm_holidays')
    .select('date')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    throw new Error(error.message || 'Failed to load holidays for leave calculation');
  }

  return new Set((data || []).map((row) => row.date));
}

export async function calculateLeaveDays({ startDate, endDate, session = 'full_day', employeeSchedule }) {
  const holidayDates = await getHolidayDateSet(startDate, endDate);
  const dates = listDatesInRange(startDate, endDate);
  const workingDates = dates.filter(
    (date) => !holidayDates.has(date) && !isEmployeeScheduledOff(date, employeeSchedule)
  );

  if (workingDates.length === 0) {
    return {
      totalDays: 0,
      workingDates: [],
      skippedDates: dates,
    };
  }

  if (session !== 'full_day' && workingDates.length !== 1) {
    throw new Error('Half-day leave can only be applied for a single working day.');
  }

  const totalDays = session === 'full_day' ? workingDates.length : 0.5;

  return {
    totalDays: roundLeaveDays(totalDays),
    workingDates,
    skippedDates: dates.filter((date) => !workingDates.includes(date)),
  };
}

export async function validateLeaveRequestPolicy({
  leaveType,
  employee,
  startDate,
  endDate,
  session,
  compOffWorkedDate,
  totalDays,
  availableDays = 0,
}) {
  if (isSpecialLeaveType(leaveType)) {
    if (session !== 'full_day') {
      throw new Error('Special Leave can only be applied as a full-day leave.');
    }

    if (startDate !== endDate || totalDays !== 1) {
      throw new Error('Special Leave is limited to exactly one full working day.');
    }
  }

  if (!isCompOffLeaveType(leaveType)) {
    if (!isLopLeaveType(leaveType) && !isClientHolidayLeaveType(leaveType) && leaveType?.is_paid) {
      if (roundLeaveDays(availableDays) < roundLeaveDays(totalDays)) {
        throw new Error('Insufficient paid leave balance. Please apply under LOP if you want to request unpaid leave.');
      }
    }
    return;
  }

  if (!compOffWorkedDate) {
    throw new Error('Worked on date is required for Comp Off.');
  }

  if (startDate !== endDate) {
    throw new Error('Comp Off can only be applied for a single day.');
  }

  if (compOffWorkedDate >= startDate) {
    throw new Error('Worked on date must be earlier than the requested Comp Off date.');
  }

  const workedDayName = new Date(`${compOffWorkedDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
  if (!['Saturday', 'Sunday'].includes(workedDayName)) {
    throw new Error('Comp Off is only allowed for worked Saturday or Sunday off days.');
  }

  if (!isEmployeeScheduledOff(compOffWorkedDate, employee.workingSchedule)) {
    throw new Error('Worked on date must be a scheduled off day for the employee.');
  }

  if (totalDays <= 0 || totalDays > 1) {
    throw new Error('Comp Off can only be applied for one full or half working day.');
  }
}

export async function checkSpecialLeaveAvailability({ employeeId, leaveTypeId, year }) {
  const [{ data: approvedRequest, error: approvedError }, { data: pendingRequest, error: pendingError }] = await Promise.all([
    adminClient
      .from('hrm_leave_requests')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('leave_type_id', leaveTypeId)
      .eq('status', 'approved')
      .gte('start_date', `${year}-01-01`)
      .lte('start_date', `${year}-12-31`)
      .limit(1)
      .maybeSingle(),
    adminClient
      .from('hrm_leave_requests')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('leave_type_id', leaveTypeId)
      .eq('status', 'pending')
      .gte('start_date', `${year}-01-01`)
      .lte('start_date', `${year}-12-31`)
      .limit(1)
      .maybeSingle(),
  ]);

  if (approvedError) {
    throw new Error(approvedError.message || 'Failed to validate Special Leave history');
  }
  if (pendingError) {
    throw new Error(pendingError.message || 'Failed to validate pending Special Leave requests');
  }

  return {
    hasApproved: Boolean(approvedRequest?.id),
    hasPending: Boolean(pendingRequest?.id),
  };
}

export function resolveApprovedLeaveOutcome({ leaveType, balance, requestedDays }) {
  if (isCompOffLeaveType(leaveType) || isClientHolidayLeaveType(leaveType)) {
    return {
      approvedDays: requestedDays,
      paidDays: requestedDays,
      lopDays: 0,
      balanceUpdateMode: 'none',
    };
  }

  if (isLopLeaveType(leaveType)) {
    return {
      approvedDays: requestedDays,
      paidDays: 0,
      lopDays: requestedDays,
      balanceUpdateMode: 'lop_only',
    };
  }

  const availableDays = Number(balance?.available_days || 0);
  if (roundLeaveDays(availableDays) < roundLeaveDays(requestedDays)) {
    throw new Error('The employee no longer has enough paid leave balance for this request. Ask them to apply under LOP instead.');
  }
  return {
    approvedDays: requestedDays,
    paidDays: requestedDays,
    lopDays: 0,
    balanceUpdateMode: 'paid',
  };
}

export function formatLeaveSession(session) {
  switch (session) {
    case 'first_half':
      return 'First Half';
    case 'second_half':
      return 'Second Half';
    default:
      return 'Full Day';
  }
}

export async function applyApprovedLeaveToAttendance({ employeeId, workingDates, session, leaveTypeName, requestId }) {
  if (!Array.isArray(workingDates) || workingDates.length === 0) {
    return;
  }

  for (const attendanceDate of workingDates) {
    const existingQuery = await adminClient
      .from('hrm_attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', attendanceDate)
      .maybeSingle();

    if (existingQuery.error) {
      throw new Error(existingQuery.error.message || 'Failed to load attendance for leave approval');
    }

    const isHalfDay = session !== 'full_day';
    const sessionLabel = formatLeaveSession(session);
    const status = isHalfDay ? 'halfday' : 'on_leave';
    const notes = isHalfDay
      ? `Approved ${leaveTypeName} leave for ${sessionLabel}${requestId ? ` (request ${requestId})` : ''}. Attendance can be marked only in the opposite half.`
      : `Approved ${leaveTypeName} leave${requestId ? ` (request ${requestId})` : ''}.`;
    const payload = {
      employee_id: employeeId,
      date: attendanceDate,
      check_in: null,
      check_out: null,
      status,
      late_in_minutes: 0,
      early_out_minutes: 0,
      work_hours_minutes: 0,
      source: 'manual',
      notes,
    };

    if (existingQuery.data?.id) {
      const { error: updateError } = await adminClient
        .from('hrm_attendance')
        .update(payload)
        .eq('id', existingQuery.data.id);

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update attendance for approved leave');
      }
      continue;
    }

    const { error: insertError } = await adminClient.from('hrm_attendance').insert(payload);
    if (insertError) {
      throw new Error(insertError.message || 'Failed to create attendance row for approved leave');
    }
  }
}

export function buildLeaveSummary(balances = []) {
  const summary = {
    totalAvailable: 0,
    lopDays: 0,
    casualAvailable: 0,
    sickAvailable: 0,
    specialAvailable: 0,
  };

  for (const balance of balances) {
    const leaveTypeName = balance.leave_type?.name || '';
    const available = roundLeaveDays(balance.available_days);
    const lopDays = roundLeaveDays(balance.lop_days);

    summary.totalAvailable = roundLeaveDays(summary.totalAvailable + available);
    summary.lopDays = roundLeaveDays(summary.lopDays + lopDays);

    if (leaveTypeName === 'Casual Leave') {
      summary.casualAvailable = available;
    }

    if (leaveTypeName === 'Sick Leave') {
      summary.sickAvailable = available;
    }

    if (leaveTypeName === 'Special Leave') {
      summary.specialAvailable = available;
    }
  }

  return summary;
}

export function buildLeaveBalanceMap(balances = []) {
  return new Map(balances.map((balance) => [balance.leave_type_id, balance]));
}

export function buildPaidAndLopDays(requestedDays, availableDays) {
  const paidDays = roundLeaveDays(Math.min(requestedDays, availableDays));
  const lopDays = roundLeaveDays(Math.max(0, requestedDays - availableDays));
  return { paidDays, lopDays };
}
