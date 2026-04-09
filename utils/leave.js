import { adminClient } from '@/utils/supabase/admin';
import {
  createTimestampForAttendanceDate,
  getCurrentDateInTimeZone,
  isEmployeeScheduledOff,
  listDatesInRange,
} from '@/utils/attendance';

const MONTHLY_DEFAULTS = {
  'Casual Leave': 0.5,
  'Sick Leave': 1,
};

const PAID_DEFAULTS = {
  'Casual Leave': true,
  'Sick Leave': true,
  'Annual Leave': true,
  'Maternity/Paternity': true,
};

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

export async function getEmployeeLeaveContext(employeeId) {
  const { data: employee, error } = await adminClient
    .from('hrm_employees')
    .select('id, employee_id, name, employee_status, employment_lifecycle_status, current_stage, date_of_joining, working_days, second_saturday_off')
    .eq('id', employeeId)
    .maybeSingle();

  if (error || !employee?.id) {
    throw new Error(error?.message || 'Employee context could not be loaded');
  }

  return {
    ...employee,
    workingSchedule: {
      workingDays: employee.working_days || [],
      secondSaturdayOff: Boolean(employee.second_saturday_off),
    },
  };
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
        .filter((entry) => ['monthly_credit', 'manual_adjustment'].includes(entry.entry_type))
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

    const status = session === 'full_day' ? 'on_leave' : 'halfday';
    const notes = `Approved ${leaveTypeName} leave${requestId ? ` (request ${requestId})` : ''}.`;
    const payload = {
      employee_id: employeeId,
      date: attendanceDate,
      check_in: session === 'full_day' ? null : createTimestampForAttendanceDate(attendanceDate, '10:00'),
      check_out: session === 'full_day' ? null : createTimestampForAttendanceDate(attendanceDate, '14:00'),
      status,
      late_in_minutes: 0,
      early_out_minutes: 0,
      work_hours_minutes: session === 'full_day' ? 0 : 4 * 60,
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
