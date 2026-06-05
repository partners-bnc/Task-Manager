import { adminClient } from '@/utils/supabase/admin';
import { deriveEmploymentFields } from '@/utils/hrm-employment';
import { calculateLeaveDays, getEmployeeLeaveContext } from '@/utils/leave';
import { getCurrentDateInTimeZone, listDatesInRange, isEmployeeScheduledOff, normalizeWorkingDays } from '@/utils/attendance';

const PAYROLL_PROFILE_SELECT = `
  id,
  employee_id,
  pf_enabled,
  pf_mode,
  pf_value,
  tds_enabled,
  tds_mode,
  tds_value,
  retention_enabled,
  notes,
  created_by,
  updated_by,
  created_at,
  updated_at
`;

const PAYROLL_EMPLOYEE_SELECT = `
  id,
  employee_id,
  name,
  email,
  company,
  salary,
  date_of_joining,
  bank_name,
  bank_account_number,
  bank_account_holder_name,
  bank_ifsc,
  pan_number,
  profile_picture_url,
  designation:hrm_designations (id, title),
  department:hrm_departments (id, name),
  employment_lifecycle_status,
  current_stage,
  employee_status,
  separated_at
`;

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function compareEmployeeCodeLike(leftValue, rightValue) {
  const left = String(leftValue || '').trim();
  const right = String(rightValue || '').trim();

  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;

  return left.localeCompare(right, 'en', {
    numeric: true,
    sensitivity: 'base',
  });
}

function compareEmployeesByCode(left, right) {
  return compareEmployeeCodeLike(left?.employee_id, right?.employee_id);
}

export function roundCurrency(value) {
  return Math.round((toNumber(value, 0) + Number.EPSILON) * 100) / 100;
}

export function roundDays(value) {
  return Math.round((toNumber(value, 0) + Number.EPSILON) * 100) / 100;
}

function padMonth(value) {
  return String(value).padStart(2, '0');
}

export function buildMonthKey(year, month) {
  return `${year}-${padMonth(month)}`;
}

export function isPayrollMonthClosed(year, month, referenceDate = getCurrentDateInTimeZone()) {
  const selectedMonthKey = buildMonthKey(year, month);
  const currentMonthKey = String(referenceDate || '').slice(0, 7);

  if (!currentMonthKey) {
    return true;
  }

  return selectedMonthKey < currentMonthKey;
}

function assertPayrollMonthClosed(year, month) {
  if (isPayrollMonthClosed(year, month)) {
    return;
  }

  throw new Error('Payroll can be calculated only after the selected month is fully completed. Please choose a past completed month.');
}

export function buildPayrollPreviewSignature(preview) {
  if (!preview?.year || !preview?.month || !preview?.summary) {
    return '';
  }

  return [
    buildMonthKey(preview.year, preview.month),
    preview.summary.totalEmployees ?? 0,
    roundCurrency(preview.summary.totalGross ?? 0),
    roundCurrency(preview.summary.totalDeductions ?? 0),
    roundCurrency(preview.summary.totalNet ?? 0),
  ].join(':');
}

function toDateOnly(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function dateFromParts(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day));
}

function dateFromDateOnly(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split('-').map((part) => Number(part));
  if (!year || !month || !day) return null;
  return dateFromParts(year, month, day);
}

function formatDateOnly(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonthBounds(year, month) {
  const start = dateFromParts(year, month, 1);
  const end = dateFromParts(year, month + 1, 0);
  const daysInMonth = end.getUTCDate();

  return {
    startDate: formatDateOnly(start),
    endDate: formatDateOnly(end),
    daysInMonth,
    monthKey: buildMonthKey(year, month),
  };
}

function countInclusiveDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = dateFromDateOnly(startDate);
  const end = dateFromDateOnly(endDate);
  if (!start || !end || end < start) return 0;
  const milliseconds = end.getTime() - start.getTime();
  return Math.floor(milliseconds / 86400000) + 1;
}

export function getActivePeriodForMonth(employee, year, month) {
  const { startDate, endDate } = getMonthBounds(year, month);
  const monthStart = dateFromDateOnly(startDate);
  const monthEnd = dateFromDateOnly(endDate);
  const joinDate = dateFromDateOnly(toDateOnly(employee?.date_of_joining)) || monthStart;
  const separationDate = dateFromDateOnly(toDateOnly(employee?.separated_at));

  let activeStart = joinDate > monthStart ? joinDate : monthStart;
  let activeEnd = monthEnd;

  if (separationDate && separationDate < activeEnd) {
    activeEnd = separationDate;
  }

  if (activeEnd < activeStart) {
    return {
      activeStart: null,
      activeEnd: null,
      activeDays: 0,
    };
  }

  return {
    activeStart: formatDateOnly(activeStart),
    activeEnd: formatDateOnly(activeEnd),
    activeDays: countInclusiveDays(formatDateOnly(activeStart), formatDateOnly(activeEnd)),
  };
}

function buildEmployeeDisplayFields(employee) {
  const employment = deriveEmploymentFields(employee);

  return {
    ...employee,
    resolved_employment_lifecycle_status:
      employee?.employment_lifecycle_status ?? employment.employmentLifecycleStatus,
    resolved_current_stage: employee?.current_stage ?? employment.currentStage,
    resolved_employee_status: employment.legacyEmployeeStatus,
    designation_title: employee?.designation?.title || '',
    department_name: employee?.department?.name || '',
  };
}

export async function ensurePayrollProfile(employeeId, actorUserId = null) {
  const { data: existing, error } = await adminClient
    .from('hrm_payroll_profiles')
    .select(PAYROLL_PROFILE_SELECT)
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load payroll profile');
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: createError } = await adminClient
    .from('hrm_payroll_profiles')
    .insert({
      employee_id: employeeId,
      pf_enabled: false,
      pf_mode: 'fixed',
      pf_value: 0,
      tds_enabled: false,
      tds_mode: 'percent',
      tds_value: 0,
      retention_enabled: false,
      created_by: actorUserId,
      updated_by: actorUserId,
    })
    .select(PAYROLL_PROFILE_SELECT)
    .single();

  if (createError || !created) {
    throw new Error(createError?.message || 'Failed to create payroll profile');
  }

  return created;
}

export async function listPayrollDirectory() {
  const [employeeResult, profileResult, revisionsResult, schedulesResult] = await Promise.all([
    adminClient
      .from('hrm_employees')
      .select(PAYROLL_EMPLOYEE_SELECT)
      .order('employee_id', { ascending: true }),
    adminClient
      .from('hrm_payroll_profiles')
      .select(PAYROLL_PROFILE_SELECT),
    adminClient
      .from('hrm_salary_revisions')
      .select('employee_id, effective_from, new_salary, revision_type, revision_value, created_at')
      .order('effective_from', { ascending: false })
      .order('created_at', { ascending: false }),
    adminClient
      .from('hrm_retention_schedules')
      .select('employee_id, status, monthly_amount, start_month, end_month')
      .in('status', ['active', 'paused'])
      .order('created_at', { ascending: false }),
  ]);

  if (employeeResult.error) {
    throw new Error(employeeResult.error.message || 'Failed to load employees for payroll');
  }
  if (profileResult.error) {
    throw new Error(profileResult.error.message || 'Failed to load payroll profiles');
  }
  if (revisionsResult.error) {
    throw new Error(revisionsResult.error.message || 'Failed to load salary revisions');
  }
  if (schedulesResult.error) {
    throw new Error(schedulesResult.error.message || 'Failed to load retention schedules');
  }

  const profileMap = new Map((profileResult.data || []).map((profile) => [profile.employee_id, profile]));
  const latestRevisionMap = new Map();
  for (const revision of revisionsResult.data || []) {
    if (!latestRevisionMap.has(revision.employee_id)) {
      latestRevisionMap.set(revision.employee_id, revision);
    }
  }

  const retentionMap = new Map();
  for (const schedule of schedulesResult.data || []) {
    if (!retentionMap.has(schedule.employee_id)) {
      retentionMap.set(schedule.employee_id, schedule);
    }
  }

  return (employeeResult.data || [])
    .map((employee) => {
      const enriched = buildEmployeeDisplayFields(employee);
      const profile = profileMap.get(employee.id) || null;
      const latestRevision = latestRevisionMap.get(employee.id) || null;
      const retention = retentionMap.get(employee.id) || null;
      const salary = roundCurrency(employee.salary);
      const pfEstimate =
        profile?.pf_enabled
          ? roundCurrency(toNumber(profile.pf_value, 0) * 2)
          : 0;
      const tdsEstimate = calculatePolicyAmount({
        enabled: Boolean(profile?.tds_enabled),
        mode: profile?.tds_mode || 'percent',
        value: profile?.tds_value,
        amountBase: salary,
        ratio: 1,
      });
      const retentionEstimate =
        profile?.retention_enabled && retention?.status === 'active'
          ? roundCurrency(retention.monthly_amount)
          : 0;

      return {
        ...enriched,
        payroll_profile: profile,
        latest_revision: latestRevision,
        retention_schedule: retention,
        estimated_in_hand_salary: roundCurrency(salary - pfEstimate - tdsEstimate - retentionEstimate),
        deduction_flags: {
          pf: Boolean(profile?.pf_enabled),
          tds: Boolean(profile?.tds_enabled),
          retention: Boolean(profile?.retention_enabled && retention?.status === 'active'),
        },
      };
    })
    .sort(compareEmployeesByCode);
}

export async function getPayrollProfileDetail(employeeId, actorUserId = null) {
  const profile = await ensurePayrollProfile(employeeId, actorUserId);

  const [employeeResult, revisionsResult, schedulesResult, releasesResult] = await Promise.all([
    adminClient
      .from('hrm_employees')
      .select(PAYROLL_EMPLOYEE_SELECT)
      .eq('id', employeeId)
      .maybeSingle(),
    adminClient
      .from('hrm_salary_revisions')
      .select('*')
      .eq('employee_id', employeeId)
      .order('effective_from', { ascending: false })
      .order('created_at', { ascending: false }),
    adminClient
      .from('hrm_retention_schedules')
      .select('*')
      .eq('employee_id', employeeId)
      .order('start_month', { ascending: false })
      .order('created_at', { ascending: false }),
    adminClient
      .from('hrm_retention_releases')
      .select('*')
      .eq('employee_id', employeeId)
      .order('release_month', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);

  if (employeeResult.error || !employeeResult.data) {
    throw new Error(employeeResult.error?.message || 'Employee not found for payroll');
  }
  if (revisionsResult.error) {
    throw new Error(revisionsResult.error.message || 'Failed to load salary revisions');
  }
  if (schedulesResult.error) {
    throw new Error(schedulesResult.error.message || 'Failed to load retention schedules');
  }
  if (releasesResult.error) {
    throw new Error(releasesResult.error.message || 'Failed to load retention releases');
  }

  return {
    employee: buildEmployeeDisplayFields(employeeResult.data),
    profile,
    revisions: revisionsResult.data || [],
    retentionSchedules: schedulesResult.data || [],
    retentionReleases: releasesResult.data || [],
  };
}

function buildEffectiveSalaryMap(revisions = [], monthEndDate) {
  const map = new Map();
  const monthEnd = monthEndDate || '9999-12-31';

  for (const revision of revisions) {
    if (revision.effective_from > monthEnd) {
      continue;
    }

    const existing = map.get(revision.employee_id);
    if (!existing) {
      map.set(revision.employee_id, revision);
    }
  }

  return map;
}

function getCurrentRetentionSchedule(schedules = [], monthKey) {
  const monthDate = `${monthKey}-01`;
  return schedules.find((schedule) => {
    if (schedule.status !== 'active') return false;
    if (schedule.start_month && toDateOnly(schedule.start_month) > monthDate) return false;
    if (schedule.end_month && toDateOnly(schedule.end_month) < monthDate) return false;
    return true;
  }) || null;
}

function calculatePolicyAmount({ enabled, mode, value, amountBase }) {
  if (!enabled) return 0;
  if (mode === 'fixed') {
    return roundCurrency(toNumber(value, 0));
  }

  return roundCurrency((amountBase * toNumber(value, 0)) / 100);
}

function buildEmployeeSnapshot(employee) {
  return {
    id: employee.id,
    employee_id: employee.employee_id,
    name: employee.name,
    email: employee.email,
    company: employee.company || '',
    designation_title: employee.designation_title || '',
    department_name: employee.department_name || '',
    city: employee.city || '',
    state: employee.state || '',
    location: employee.location || '',
    bank_name: employee.bank_name || '',
    bank_account_number: employee.bank_account_number || '',
    bank_account_holder_name: employee.bank_account_holder_name || '',
    bank_ifsc: employee.bank_ifsc || '',
    pan_number: employee.pan_number || '',
    date_of_joining: employee.date_of_joining || null,
    lifecycle_status: employee.resolved_employment_lifecycle_status,
    current_stage: employee.resolved_current_stage,
  };
}

function formatCurrencyDisplay(value) {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value, 0));
}

const PAYSLIP_OFFICIAL_COMPANY_NAME = 'Broccoli & Carrots Global Services Pvt. Ltd. (BNC Global Services Pvt. Ltd.)';
const PAYSLIP_OFFICIAL_ADDRESS = 'OFFICE NO 208, DDA BUILDING NO 5, Janakpuri District Centre, New Delhi, South West Delhi, Delhi, 110058';
const PAYSLIP_DEFAULT_LOCATION = 'NEW DELHI';

function formatPayslipMonthTitle(month, year) {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
  }).format(dateFromParts(year, month, 1));
}

function buildPayslipLocation(employee) {
  const directLocation = String(employee?.location || '').trim();
  if (directLocation) {
    return directLocation.toUpperCase();
  }

  const city = String(employee?.city || '').trim();
  const state = String(employee?.state || '').trim();
  const combined = [city, state].filter(Boolean).join(', ');
  return (combined || PAYSLIP_DEFAULT_LOCATION).toUpperCase();
}

function titleCaseWords(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function numberToWordsUnderThousand(value) {
  const units = [
    '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen',
  ];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  const numeric = Math.floor(toNumber(value, 0));
  if (numeric === 0) return '';
  if (numeric < 20) return units[numeric];
  if (numeric < 100) {
    const remainder = numeric % 10;
    return `${tens[Math.floor(numeric / 10)]}${remainder ? ` ${units[remainder]}` : ''}`;
  }

  const remainder = numeric % 100;
  return `${units[Math.floor(numeric / 100)]} hundred${remainder ? ` ${numberToWordsUnderThousand(remainder)}` : ''}`;
}

function numberToWordsIndian(value) {
  const numeric = Math.max(0, Math.round(toNumber(value, 0)));
  if (numeric === 0) return 'Rupees Zero Only';

  const parts = [];
  const crore = Math.floor(numeric / 10000000);
  const lakh = Math.floor((numeric % 10000000) / 100000);
  const thousand = Math.floor((numeric % 100000) / 1000);
  const remainder = numeric % 1000;

  if (crore) parts.push(`${numberToWordsUnderThousand(crore)} crore`);
  if (lakh) parts.push(`${numberToWordsUnderThousand(lakh)} lakh`);
  if (thousand) parts.push(`${numberToWordsUnderThousand(thousand)} thousand`);
  if (remainder) parts.push(numberToWordsUnderThousand(remainder));

  return `Rupees ${titleCaseWords(parts.join(' ').trim())} Only`;
}

function createPayslipAmountRow(label, amount) {
  return {
    label,
    amount: roundCurrency(amount),
    displayAmount: formatCurrencyDisplay(amount),
  };
}

function buildPayslipEarningRows(totalEarnings) {
  const total = roundCurrency(totalEarnings);
  const basic = roundCurrency(total * 0.5);
  const hra = roundCurrency(total * 0.25);
  const specialAllowance = roundCurrency(total - basic - hra);

  return [
    createPayslipAmountRow('BASIC', basic),
    createPayslipAmountRow('HRA', hra),
    createPayslipAmountRow('SPECIAL ALLOWANCE', specialAllowance),
  ];
}

function buildPayslipDeductionRows(payrollItem) {
  const candidates = [
    ['LOP', payrollItem.lop_deduction],
    ['EMPLOYEE PF', payrollItem.pf_employee_deduction],
    ['EMPLOYEE TDS', payrollItem.tds_employee_deduction ?? payrollItem.tds_deduction],
    ['RETENTION', payrollItem.retention_deduction],
  ];

  return candidates
    .map(([label, amount]) => ({ label, amount: roundCurrency(amount) }))
    .filter((row) => row.amount > 0)
    .map((row) => createPayslipAmountRow(row.label, row.amount));
}

function buildPayslipDetailColumns({ employee, payrollItem, monthLabel }) {
  return {
    left: [
      { label: 'Name', value: employee.name || '--' },
      { label: 'Designation', value: employee.designation_title || '--' },
      { label: 'Department', value: employee.department_name || '--' },
      { label: 'Location', value: buildPayslipLocation(employee) },
      { label: 'Effective Work Days', value: String(payrollItem.active_days ?? payrollItem.calculation_snapshot?.meta?.activeDays ?? '--') },
      { label: 'LOP', value: String(payrollItem.lop_days ?? payrollItem.calculation_snapshot?.meta?.lopDays ?? 0) },
    ],
    right: [
      { label: 'Employee No', value: employee.employee_id || '--' },
      { label: 'Bank Name', value: employee.bank_name || '--' },
      { label: 'Bank Account No.', value: employee.bank_account_number || '--' },
      { label: 'PAN No.', value: employee.pan_number || '--' },
      { label: 'UAN No.', value: employee.uan_number || '--' },
      { label: 'Pay Period', value: monthLabel },
    ],
  };
}

export function buildPayslipHtml(snapshot = {}) {
  const header = snapshot.header || {};
  const meta = snapshot.meta || {};
  const detailColumns = snapshot.detailColumns || { left: [], right: [] };
  const earningsRows = snapshot.earningsRows || [];
  const deductionRows = snapshot.deductionRows || [];
  const totals = snapshot.totals || {};
  const totalRows = Math.max(earningsRows.length, deductionRows.length, 3);
  const tableRows = Array.from({ length: totalRows }, (_, index) => ({
    earnings: earningsRows[index] || { label: '', displayAmount: '' },
    deductions: deductionRows[index] || { label: '', displayAmount: '' },
  }));

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Payslip ${snapshot.payslipNumber || ''}</title>
    <style>
      body { font-family: "Times New Roman", serif; color: #111827; background: #f8fafc; margin: 0; padding: 24px; }
      .sheet { max-width: 900px; margin: 0 auto; background: white; padding: 28px 26px 40px; }
      .header { text-align: center; }
      .header h1 { margin: 0; font-size: 18px; font-weight: 700; line-height: 1.2; }
      .header p { margin: 4px 0 0; font-size: 10px; line-height: 1.3; }
      .title { margin: 14px 0 16px; text-align: center; font-size: 12px; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      .info-table, .summary-table { border: 1px solid #9ca3af; }
      .info-table td, .summary-table td, .summary-table th { border: 1px solid #9ca3af; padding: 4px 6px; vertical-align: top; font-size: 10px; }
      .info-label, .summary-label { font-weight: 400; }
      .summary-head { font-weight: 700; text-align: left; }
      .amount-head, .amount-cell { text-align: right; }
      .amount-cell { white-space: nowrap; }
      .net-row { margin-top: 10px; font-size: 10px; }
      .net-row strong { margin-left: 26px; }
      .words { margin-top: 10px; font-size: 10px; font-style: italic; }
      .footer { margin-top: 22px; text-align: center; font-size: 10px; color: #6b7280; }
      @media print {
        body { background: white; padding: 0; }
        .sheet { max-width: none; padding: 20px 18px 28px; }
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="header">
        <h1>${header.companyName || PAYSLIP_OFFICIAL_COMPANY_NAME}</h1>
        <p>${header.addressLine || PAYSLIP_OFFICIAL_ADDRESS}</p>
      </div>
      <div class="title">Payslip for the month of ${meta.monthLabel || ''}</div>
      <table class="info-table">
        <tbody>
          ${Array.from({ length: Math.max(detailColumns.left.length, detailColumns.right.length) }, (_, index) => {
            const left = detailColumns.left[index] || { label: '', value: '' };
            const right = detailColumns.right[index] || { label: '', value: '' };
            return `<tr>
              <td class="info-label">${left.label ? `${left.label}:` : ''}</td>
              <td>${left.value || ''}</td>
              <td class="info-label">${right.label ? `${right.label}:` : ''}</td>
              <td>${right.value || ''}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <table class="summary-table" style="margin-top: 14px;">
        <thead>
          <tr>
            <th class="summary-head">Earnings</th>
            <th class="summary-head amount-head">Amount</th>
            <th class="summary-head">Deductions</th>
            <th class="summary-head amount-head">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows.map((row) => `
            <tr>
              <td class="summary-label">${row.earnings.label || ''}</td>
              <td class="amount-cell">${row.earnings.displayAmount || ''}</td>
              <td class="summary-label">${row.deductions.label || ''}</td>
              <td class="amount-cell">${row.deductions.displayAmount || ''}</td>
            </tr>
          `).join('')}
          <tr>
            <td class="summary-head">Total Earnings:INR.</td>
            <td class="amount-cell">${totals.totalEarningsDisplay || ''}</td>
            <td class="summary-head">Total Deductions:INR.</td>
            <td class="amount-cell">${totals.totalDeductionsDisplay || ''}</td>
          </tr>
        </tbody>
      </table>
      <div class="net-row">Net Pay for the month : <strong>${totals.netSalaryDisplay || ''}</strong></div>
      <div class="words">(${totals.netSalaryWords || ''})</div>
      <div class="footer">
        This is a system generated payslip and does not require signature.
      </div>
    </div>
  </body>
</html>
`.trim();
}

export function buildPayslipSnapshot({ payrollItem, employee, run, payslipNumber, generatedAt }) {
  const snapshot = payrollItem?.calculation_snapshot || {};
  const monthLabel = formatPayslipMonthTitle(run.month, run.year);
  const employeeSnapshot = snapshot.employee || buildEmployeeSnapshot(employee);
  const earningsRows = buildPayslipEarningRows(payrollItem.prorated_salary);
  const deductionRows = buildPayslipDeductionRows(payrollItem);
  const detailColumns = buildPayslipDetailColumns({
    employee: employeeSnapshot,
    payrollItem,
    monthLabel,
  });
  const totalEarnings = roundCurrency(payrollItem.prorated_salary);
  const totalDeductions = roundCurrency(payrollItem.total_deductions);
  const netSalary = roundCurrency(payrollItem.net_salary);

  return {
    payslipNumber,
    header: {
      companyName: PAYSLIP_OFFICIAL_COMPANY_NAME,
      addressLine: PAYSLIP_OFFICIAL_ADDRESS,
    },
    meta: {
      month: run.month,
      year: run.year,
      monthLabel,
      paymentStatus: payrollItem.payment_status,
      activeDays: payrollItem.active_days,
      lopDays: payrollItem.lop_days,
      daysInMonth: snapshot?.meta?.daysInMonth || getMonthBounds(run.year, run.month).daysInMonth,
      generatedAt,
    },
    employee: employeeSnapshot,
    detailColumns,
    earningsRows,
    deductionRows,
    earnings: {
      salarySnapshot: payrollItem.salary_snapshot,
      proratedSalary: payrollItem.prorated_salary,
    },
    deductions: {
      lopDeduction: payrollItem.lop_deduction,
      pfEmployeeDeduction: payrollItem.pf_employee_deduction,
      pfEmployerDeduction: payrollItem.pf_employer_deduction ?? 0,
      totalPfDeduction: payrollItem.total_pf_deduction ?? payrollItem.pf_employee_deduction ?? 0,
      tdsEmployeeDeduction: payrollItem.tds_employee_deduction ?? payrollItem.tds_deduction ?? 0,
      tdsEmployerDeduction: payrollItem.tds_employer_deduction ?? 0,
      totalTdsDeduction: payrollItem.total_tds_deduction ?? payrollItem.tds_deduction ?? 0,
      retentionDeduction: payrollItem.retention_deduction,
      retentionReleaseAmount: payrollItem.retention_release_amount,
    },
    totals: {
      totalEarnings,
      totalEarningsDisplay: formatCurrencyDisplay(totalEarnings),
      totalDeductions,
      totalDeductionsDisplay: formatCurrencyDisplay(totalDeductions),
      netSalary,
      netSalaryDisplay: formatCurrencyDisplay(netSalary),
      netSalaryWords: numberToWordsIndian(netSalary),
    },
  };
}

export async function backfillHistoricalPayrollLopEntries() {
  const { data: pendingRequests, error } = await adminClient
    .from('hrm_leave_requests')
    .select('id, employee_id, start_date, end_date, paid_days, lop_days, applied_session, session, status')
    .eq('status', 'approved')
    .gt('lop_days', 0)
    .order('start_date', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to load leave requests for payroll LOP backfill');
  }

  for (const request of pendingRequests || []) {
    try {
      const [{ data: existingEntries, error: entryError }, { data: issueRows, error: issueError }] = await Promise.all([
        adminClient
          .from('hrm_payroll_lop_entries')
          .select('id')
          .eq('leave_request_id', request.id)
          .limit(1),
        adminClient
          .from('hrm_payroll_lop_backfill_issues')
          .select('id')
          .eq('leave_request_id', request.id)
          .limit(1),
      ]);

      if (entryError) {
        throw new Error(entryError.message || 'Failed to inspect payroll LOP entries');
      }
      if (issueError) {
        throw new Error(issueError.message || 'Failed to inspect payroll LOP backfill issues');
      }

      if ((existingEntries || []).length || (issueRows || []).length) {
        continue;
      }

      const startMonth = String(request.start_date || '').slice(0, 7);
      const endMonth = String(request.end_date || '').slice(0, 7);

      if (!startMonth || !endMonth || startMonth !== endMonth) {
        await adminClient.from('hrm_payroll_lop_backfill_issues').insert({
          employee_id: request.employee_id,
          leave_request_id: request.id,
          issue_type: 'cross_month_request',
          notes: 'Historical leave request spans multiple months and requires manual review.',
        });
        continue;
      }

      const employee = await getEmployeeLeaveContext(request.employee_id);
      const calculation = await calculateLeaveDays({
        startDate: request.start_date,
        endDate: request.end_date,
        session: request.applied_session || request.session || 'full_day',
        employeeSchedule: employee.workingSchedule,
      });

      await syncPayrollLopEntriesForLeaveApproval({
        employeeId: request.employee_id,
        leaveRequestId: request.id,
        workingDates: calculation.workingDates,
        session: request.applied_session || request.session || 'full_day',
        paidDays: request.paid_days,
        lopDays: request.lop_days,
        source: 'backfill',
      });
    } catch (error) {
      await adminClient.from('hrm_payroll_lop_backfill_issues').upsert({
        employee_id: request.employee_id,
        leave_request_id: request.id,
        issue_type: 'missing_schedule',
        notes: String(error?.message || 'Historical LOP backfill requires manual review.'),
      }, {
        onConflict: 'leave_request_id,issue_type',
      });
    }
  }
}

export async function deleteAttendancePayrollLopEntry(employeeId, attendanceDate) {
  const { error } = await adminClient
    .from('hrm_payroll_lop_entries')
    .delete()
    .eq('employee_id', employeeId)
    .eq('attendance_date', attendanceDate)
    .eq('source', 'attendance');

  if (error) {
    throw new Error(error.message || 'Failed to clear attendance payroll LOP entry');
  }
}

export async function syncAttendancePayrollLopEntriesForMonth(year, month) {
  const { startDate, endDate } = getMonthBounds(year, month);

  const { error: clearError } = await adminClient
    .from('hrm_payroll_lop_entries')
    .delete()
    .eq('source', 'attendance')
    .gte('attendance_date', startDate)
    .lte('attendance_date', endDate);

  if (clearError) {
    throw new Error(clearError.message || 'Failed to clear month-close attendance LOP entries');
  }

  const allDates = listDatesInRange(startDate, endDate);

  const [employeesResult, attendanceResult, holidaysResult, approvedLeavesResult, leaveTypesResult] = await Promise.all([
    adminClient
      .from('hrm_employees')
      .select('id, date_of_joining, separated_at, working_days, second_saturday_off')
      .order('employee_id', { ascending: true }),
    adminClient
      .from('hrm_attendance')
      .select('employee_id, date, status, is_regularized')
      .gte('date', startDate)
      .lte('date', endDate),
    adminClient
      .from('hrm_holidays')
      .select('date')
      .gte('date', startDate)
      .lte('date', endDate),
    adminClient
      .from('hrm_leave_requests')
      .select('employee_id, start_date, end_date, status, applied_session, session, leave_type_id')
      .eq('status', 'approved')
      .lte('start_date', endDate)
      .gte('end_date', startDate),
    adminClient
      .from('hrm_leave_types')
      .select('id, code, counts_as_lop'),
  ]);

  if (employeesResult.error) throw new Error(employeesResult.error.message || 'Failed to load employees for attendance LOP');
  if (attendanceResult.error) throw new Error(attendanceResult.error.message || 'Failed to load attendance rows for payroll LOP');
  if (holidaysResult.error) throw new Error(holidaysResult.error.message || 'Failed to load holidays for payroll LOP');
  if (approvedLeavesResult.error) throw new Error(approvedLeavesResult.error.message || 'Failed to load approved leaves for payroll LOP');

  const holidayDates = new Set((holidaysResult.data || []).map((h) => h.date));

  // Build leave type code map: id => { code, counts_as_lop }
  const leaveTypeMap = new Map((leaveTypesResult.data || []).map((lt) => [lt.id, lt]));

  function isLopLeaveTypeById(leaveTypeId) {
    const lt = leaveTypeMap.get(leaveTypeId);
    if (!lt) return false;
    if (lt.counts_as_lop) return true;
    const code = String(lt.code || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
    return code === 'lop' || code === 'loss_of_pay' || code === 'loss_of_pay_lop';
  }

  // Full-day leave keys: employeeId:date => skip entirely
  const fullDayLeaveKeys = new Set();
  // Half-day LOP leave keys: employeeId:date => one half is LOP
  const halfDayLopLeaveKeys = new Set();
  // Half-day paid/non-LOP leave keys: employeeId:date => leave covered, employee may have worked other half
  const halfDayPaidLeaveKeys = new Set();
  for (const request of approvedLeavesResult.data || []) {
    const session = request.applied_session || request.session || 'full_day';
    const isLop = isLopLeaveTypeById(request.leave_type_id);
    const requestStart = request.start_date < startDate ? startDate : request.start_date;
    const requestEnd = request.end_date > endDate ? endDate : request.end_date;
    for (const date of listDatesInRange(requestStart, requestEnd)) {
      const key = `${request.employee_id}:${date}`;
      if (session === 'full_day') {
        fullDayLeaveKeys.add(key);
      } else if (isLop) {
        halfDayLopLeaveKeys.add(key);
      } else {
        halfDayPaidLeaveKeys.add(key);
      }
    }
  }

  // key = "employeeId:date" => status ('present','absent','halfday','late','on_leave')
  const attendanceMap = new Map();
  for (const row of attendanceResult.data || []) {
    attendanceMap.set(`${row.employee_id}:${row.date}`, row.status);
  }

  const rows = [];

  for (const employee of employeesResult.data || []) {
    const joinDate = employee.date_of_joining ? String(employee.date_of_joining).slice(0, 10) : null;
    const separatedDate = employee.separated_at ? String(employee.separated_at).slice(0, 10) : null;
    const workingDays = normalizeWorkingDays(employee.working_days);
    const secondSaturdayOff = Boolean(employee.second_saturday_off);
    const schedule = { workingDays, secondSaturdayOff, joinDate };

    for (const date of allDates) {
      if (joinDate && date < joinDate) continue;
      if (separatedDate && date > separatedDate) continue;
      if (holidayDates.has(date)) continue;

      const key = `${employee.id}:${date}`;
      const status = attendanceMap.get(key);

      // Skip scheduled off days UNLESS HR explicitly marked the day absent
      if (isEmployeeScheduledOff(date, schedule)) {
        if (status !== 'absent') continue;
      }

      // Full-day leave covers the entire day — no attendance LOP
      if (fullDayLeaveKeys.has(key)) continue;
      // on_leave attendance status means HR/leave applied full-day leave — no LOP
      if (status === 'on_leave') continue;

      let fraction = 0;
      if (status === 'halfday' || status === 'half_day' || status === 'late') {
        if (halfDayPaidLeaveKeys.has(key)) {
          // Half-day paid leave (CL/SL/SP/CH/COFF) + employee worked other half (CL:P, P:SL, P:CH etc.)
          // No LOP — the worked half is present, the leave half is covered by paid leave
          fraction = 0;
        } else if (halfDayLopLeaveKeys.has(key)) {
          // Half-day LOP leave + employee worked other half (LOP:P, P:LOP)
          // LOP is already tracked via leave_request entry — no duplicate attendance LOP
          fraction = 0;
        } else {
          // No leave at all — half day worked only, unresolved half counts as 0.5 LOP
          fraction = 0.5;
        }
      } else if (status === undefined || status === null || status === 'absent') {
        if (halfDayPaidLeaveKeys.has(key) || halfDayLopLeaveKeys.has(key)) {
          // Half-day leave approved but employee didn't work remaining half (SL:A, LOP:A, CL:A)
          // The absent half = 0.5 LOP (only for LOP type; paid leave absent half also generates 0.5 LOP)
          fraction = 0.5;
        } else {
          // Full day absent, no leave — 1.0 LOP
          fraction = 1.0;
        }
      }
      // present = no LOP

      if (fraction > 0) {
        rows.push({
          employee_id: employee.id,
          attendance_date: date,
          day_fraction: fraction,
          source: 'attendance',
          notes:
            fraction === 0.5
              ? 'Generated from unresolved month-close half-day attendance for payroll.'
              : 'Generated from unresolved month-close absence for payroll.',
        });
      }
    }
  }

  if (!rows.length) {
    return [];
  }

  const { data, error } = await adminClient
    .from('hrm_payroll_lop_entries')
    .insert(rows)
    .select('*');

  if (error) {
    throw new Error(error.message || 'Failed to create month-close attendance LOP entries');
  }

  return data || [];
}

export function allocateLopDates({ workingDates = [], session = 'full_day', lopDays = 0 }) {
  const nextEntries = [];
  let remaining = roundDays(lopDays);

  if (remaining <= 0) {
    return nextEntries;
  }

  if (session !== 'full_day') {
    const lastDate = workingDates[workingDates.length - 1];
    if (lastDate) {
      nextEntries.push({
        attendance_date: lastDate,
        day_fraction: remaining >= 0.5 ? 0.5 : remaining,
      });
    }
    return nextEntries;
  }

  for (let index = workingDates.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const fraction = remaining >= 1 ? 1 : 0.5;
    nextEntries.unshift({
      attendance_date: workingDates[index],
      day_fraction: fraction,
    });
    remaining = roundDays(remaining - fraction);
  }

  return nextEntries;
}

export async function syncPayrollLopEntriesForLeaveApproval({
  employeeId,
  leaveRequestId,
  workingDates,
  session,
  paidDays,
  lopDays,
  source = 'leave_request',
}) {
  const allocation = allocateLopDates({
    workingDates,
    session,
    lopDays,
  });

  const { error: deleteError } = await adminClient
    .from('hrm_payroll_lop_entries')
    .delete()
    .eq('leave_request_id', leaveRequestId);

  if (deleteError) {
    throw new Error(deleteError.message || 'Failed to refresh payroll LOP entries');
  }

  if (!allocation.length) {
    return [];
  }

  const rows = allocation.map((entry, index) => ({
    employee_id: employeeId,
    leave_request_id: leaveRequestId,
    attendance_date: entry.attendance_date,
    day_fraction: entry.day_fraction,
    source,
    notes:
      roundDays(paidDays) > 0
        ? 'Generated from approved leave request for payroll.'
        : 'Generated from approved LOP leave request for payroll.',
  }));

  const { data, error } = await adminClient
    .from('hrm_payroll_lop_entries')
    .insert(rows)
    .select('*');

  if (error) {
    throw new Error(error.message || 'Failed to create payroll LOP entries');
  }

  return data || [];
}

async function loadPayrollReferenceData(year, month) {
  const { startDate, endDate, monthKey, daysInMonth } = getMonthBounds(year, month);
  await backfillHistoricalPayrollLopEntries();
  await syncAttendancePayrollLopEntriesForMonth(year, month);

  const [employeesResult, profilesResult, revisionsResult, schedulesResult, releasesResult, lopResult] = await Promise.all([
    adminClient
      .from('hrm_employees')
      .select(PAYROLL_EMPLOYEE_SELECT)
      .order('employee_id', { ascending: true }),
    adminClient
      .from('hrm_payroll_profiles')
      .select(PAYROLL_PROFILE_SELECT),
    adminClient
      .from('hrm_salary_revisions')
      .select('*')
      .lte('effective_from', endDate)
      .order('effective_from', { ascending: false })
      .order('created_at', { ascending: false }),
    adminClient
      .from('hrm_retention_schedules')
      .select('*')
      .lte('start_month', endDate)
      .order('start_month', { ascending: false }),
    adminClient
      .from('hrm_retention_releases')
      .select('*')
      .eq('release_month', startDate),
    adminClient
      .from('hrm_payroll_lop_entries')
      .select('*')
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate),
  ]);

  if (employeesResult.error) throw new Error(employeesResult.error.message || 'Failed to load payroll employees');
  if (profilesResult.error) throw new Error(profilesResult.error.message || 'Failed to load payroll profiles');
  if (revisionsResult.error) throw new Error(revisionsResult.error.message || 'Failed to load payroll revisions');
  if (schedulesResult.error) throw new Error(schedulesResult.error.message || 'Failed to load retention schedules');
  if (releasesResult.error) throw new Error(releasesResult.error.message || 'Failed to load retention releases');
  if (lopResult.error) throw new Error(lopResult.error.message || 'Failed to load payroll LOP entries');

  const employees = (employeesResult.data || [])
    .map(buildEmployeeDisplayFields)
    .sort(compareEmployeesByCode);
  const profileMap = new Map((profilesResult.data || []).map((profile) => [profile.employee_id, profile]));
  const effectiveSalaryMap = buildEffectiveSalaryMap(revisionsResult.data || [], endDate);

  const scheduleMap = new Map();
  for (const schedule of schedulesResult.data || []) {
    const current = scheduleMap.get(schedule.employee_id) || [];
    current.push(schedule);
    scheduleMap.set(schedule.employee_id, current);
  }

  const releaseMap = new Map();
  for (const release of releasesResult.data || []) {
    const total = toNumber(releaseMap.get(release.employee_id), 0) + toNumber(release.amount, 0);
    releaseMap.set(release.employee_id, roundCurrency(total));
  }

  const lopLeaveMap = new Map();
  const lopAttendanceMap = new Map();
  for (const lopEntry of lopResult.data || []) {
    if (lopEntry.source === 'attendance') {
      const total = toNumber(lopAttendanceMap.get(lopEntry.employee_id), 0) + toNumber(lopEntry.day_fraction, 0);
      lopAttendanceMap.set(lopEntry.employee_id, roundDays(total));
    } else {
      const total = toNumber(lopLeaveMap.get(lopEntry.employee_id), 0) + toNumber(lopEntry.day_fraction, 0);
      lopLeaveMap.set(lopEntry.employee_id, roundDays(total));
    }
  }

  return {
    employees,
    profileMap,
    effectiveSalaryMap,
    scheduleMap,
    releaseMap,
    lopLeaveMap,
    lopAttendanceMap,
    bounds: { startDate, endDate, monthKey, daysInMonth },
  };
}

function isEmployeeEligibleForPayroll(employee, year, month) {
  const employment = deriveEmploymentFields(employee);
  const lifecycle = employee?.employment_lifecycle_status ?? employment.employmentLifecycleStatus;
  const currentStage = employee?.current_stage ?? employment.currentStage;
  const { activeDays } = getActivePeriodForMonth(employee, year, month);

  if (activeDays <= 0) {
    return false;
  }

  if (lifecycle === 'active') {
    return true;
  }

  if (currentStage === 'probation') {
    return true;
  }

  return lifecycle === 'separated';
}

export function calculateEmployeePayroll({
  employee,
  profile,
  effectiveRevision,
  retentionSchedules = [],
  retentionReleaseAmount = 0,
  lopDays = 0,
  lopLeaveDays = 0,
  lopAttendanceDays = 0,
  year,
  month,
  daysInMonth,
}) {
  const { activeStart, activeEnd, activeDays } = getActivePeriodForMonth(employee, year, month);
  const salarySnapshot = roundCurrency(
    effectiveRevision?.new_salary !== undefined && effectiveRevision?.new_salary !== null
      ? effectiveRevision.new_salary
      : employee.salary
  );

  const grossSalary = salarySnapshot;
  const proratedSalary = daysInMonth > 0 && activeDays < daysInMonth
    ? roundCurrency((salarySnapshot / daysInMonth) * activeDays)
    : grossSalary;
  const normalizedLopDays = roundDays(lopDays);
  const lopDeduction = roundCurrency(daysInMonth > 0 ? (salarySnapshot / daysInMonth) * normalizedLopDays : 0);
  const activeRetention = profile?.retention_enabled
    ? getCurrentRetentionSchedule(retentionSchedules, buildMonthKey(year, month))
    : null;
  const pfEmployeeDeduction = profile?.pf_enabled ? roundCurrency(toNumber(profile.pf_value, 0)) : 0;
  const pfEmployerDeduction = profile?.pf_enabled ? roundCurrency(toNumber(profile.pf_value, 0)) : 0;
  const totalPfDeduction = roundCurrency(pfEmployeeDeduction + pfEmployerDeduction);
  const tdsEmployeeDeduction = calculatePolicyAmount({
    enabled: Boolean(profile?.tds_enabled),
    mode: profile?.tds_mode || 'percent',
    value: profile?.tds_value,
    amountBase: grossSalary,
  });
  const tdsEmployerDeduction = 0;
  const totalTdsDeduction = roundCurrency(tdsEmployeeDeduction);
  const retentionDeduction = activeRetention ? roundCurrency(toNumber(activeRetention.monthly_amount, 0)) : 0;
  const totalDeductions = roundCurrency(
    lopDeduction + totalPfDeduction + totalTdsDeduction + retentionDeduction
  );
  const netSalary = roundCurrency(proratedSalary - totalDeductions + toNumber(retentionReleaseAmount, 0));

  return {
    employeeId: employee.id,
    employeeCode: employee.employee_id,
    employeeName: employee.name,
    company: employee.company || '',
    joinDate: employee.date_of_joining,
    lifecycleStatus: employee.resolved_employment_lifecycle_status,
    currentStage: employee.resolved_current_stage,
    salarySnapshot,
    daysInMonth,
    activeStart,
    activeEnd,
    activeDays,
    lopDays: normalizedLopDays,
    lopLeaveDays: roundDays(lopLeaveDays),
    lopAttendanceDays: roundDays(lopAttendanceDays),
    lopDeduction,
    pfEmployeeDeduction,
    pfEmployerDeduction,
    totalPfDeduction,
    tdsEmployeeDeduction,
    tdsEmployerDeduction,
    totalTdsDeduction,
    retentionDeduction,
    retentionReleaseAmount: roundCurrency(retentionReleaseAmount),
    totalDeductions,
    netSalary,
    proratedSalary,
    paymentStatus: 'draft',
    effectiveRevision,
    profile: profile || null,
    retentionSchedule: activeRetention,
    employeeSnapshot: buildEmployeeSnapshot({
      ...employee,
      company: employee.company || '',
    }),
  };
}

export async function previewPayrollRun({ year, month, employeeId = null }) {
  assertPayrollMonthClosed(year, month);
  const reference = await loadPayrollReferenceData(year, month);
  const rows = [];

  for (const employee of reference.employees) {
    if (employeeId && employee.id !== employeeId) {
      continue;
    }

    if (!isEmployeeEligibleForPayroll(employee, year, month)) {
      continue;
    }

    const profile = reference.profileMap.get(employee.id) || (await ensurePayrollProfile(employee.id));
    const effectiveRevision = reference.effectiveSalaryMap.get(employee.id) || null;
    const retentionSchedules = reference.scheduleMap.get(employee.id) || [];
    const retentionReleaseAmount = reference.releaseMap.get(employee.id) || 0;
    const lopLeaveDays = reference.lopLeaveMap.get(employee.id) || 0;
    const lopAttendanceDays = reference.lopAttendanceMap.get(employee.id) || 0;
    const lopDays = roundDays(lopLeaveDays + lopAttendanceDays);

    rows.push(
      calculateEmployeePayroll({
        employee,
        profile,
        effectiveRevision,
        retentionSchedules,
        retentionReleaseAmount,
        lopDays,
        lopLeaveDays,
        lopAttendanceDays,
        year,
        month,
        daysInMonth: reference.bounds.daysInMonth,
      })
    );
  }

  const preview = {
    rows: rows.sort((left, right) => compareEmployeeCodeLike(left.employeeCode, right.employeeCode)),
    month: month,
    year,
    monthKey: reference.bounds.monthKey,
    summary: {
      totalEmployees: rows.length,
      totalGross: roundCurrency(rows.reduce((sum, row) => sum + row.proratedSalary, 0)),
      totalDeductions: roundCurrency(rows.reduce((sum, row) => sum + row.totalDeductions, 0)),
      totalNet: roundCurrency(rows.reduce((sum, row) => sum + row.netSalary, 0)),
    },
  };

  return {
    ...preview,
    signature: buildPayrollPreviewSignature(preview),
  };
}

async function ensurePayrollRun(year, month, actorUserId) {
  const { data: existing, error } = await adminClient
    .from('hrm_payroll_runs')
    .select('*')
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load payroll run');
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: createError } = await adminClient
    .from('hrm_payroll_runs')
    .insert({
      year,
      month,
      status: 'draft',
      processed_by: actorUserId,
    })
    .select('*')
    .single();

  if (createError || !created) {
    throw new Error(createError?.message || 'Failed to create payroll run');
  }

  return created;
}

async function getPayrollRunByMonth(year, month) {
  const { data, error } = await adminClient
    .from('hrm_payroll_runs')
    .select('*')
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load payroll run');
  }

  return data || null;
}

function buildAdminPayslipState(item, payslip) {
  const hasPayslip = Boolean(payslip);
  const isPayslipReleased = Boolean(payslip?.released_to_employee);
  const canGeneratePayslip = !hasPayslip;
  const canMarkPaid = hasPayslip && item?.payment_status !== 'paid';
  const canSendPayslip = hasPayslip && item?.payment_status === 'paid' && !isPayslipReleased;

  return {
    hasPayslip,
    isPayslipReleased,
    availableActions: [
      'open',
      ...(canGeneratePayslip ? ['generate_payslip'] : ['view_payslip', 'download_payslip']),
      ...(canMarkPaid ? ['mark_paid'] : []),
      ...(canSendPayslip ? ['send_payslip'] : []),
    ],
  };
}

function buildEmployeePayslipState(payslip) {
  if (!payslip) {
    return {
      payslip: null,
      payslipReleaseStatus: 'not_generated',
      payslipReleased: false,
      hasGeneratedPayslip: false,
    };
  }

  const released = Boolean(payslip.released_to_employee);

  return {
    payslip: released ? payslip : null,
    payslipReleaseStatus: released ? 'released' : 'pending_release',
    payslipReleased: released,
    hasGeneratedPayslip: true,
  };
}

async function updatePayrollRunTotals(runId) {
  const { data: items, error } = await adminClient
    .from('hrm_payroll_items')
    .select('id, prorated_salary, total_deductions, net_salary, payment_status')
    .eq('payroll_run_id', runId);

  if (error) {
    throw new Error(error.message || 'Failed to load payroll items');
  }

  const allItems = items || [];
  const nextStatus = allItems.length === 0
    ? 'draft'
    : allItems.every((item) => item.payment_status === 'paid')
      ? 'paid'
      : allItems.some((item) => ['payment_pending', 'paid'].includes(item.payment_status))
        ? 'payment_pending'
        : 'generated';

  const totalGross = roundCurrency(allItems.reduce((sum, item) => sum + toNumber(item.prorated_salary, 0), 0));
  const totalDeductions = roundCurrency(allItems.reduce((sum, item) => sum + toNumber(item.total_deductions, 0), 0));
  const totalNet = roundCurrency(allItems.reduce((sum, item) => sum + toNumber(item.net_salary, 0), 0));

  const { data: updated, error: updateError } = await adminClient
    .from('hrm_payroll_runs')
    .update({
      status: nextStatus,
      total_gross: totalGross,
      total_deductions: totalDeductions,
      total_net: totalNet,
      updated_at: new Date().toISOString(),
    })
    .eq('id', runId)
    .select('*')
    .single();

  if (updateError || !updated) {
    throw new Error(updateError?.message || 'Failed to update payroll run totals');
  }

  return updated;
}

export async function generatePayrollRun({ year, month, actorUserId, previewSignature = '' }) {
  assertPayrollMonthClosed(year, month);
  const preview = await previewPayrollRun({ year, month });
  if (!previewSignature || previewSignature !== preview.signature) {
    throw new Error('Run preview is required before generating payroll for this month.');
  }

  const existingRun = await getPayrollRunByMonth(year, month);
  if (existingRun) {
    throw new Error(`Payroll for ${preview.monthKey} already exists in the ledger.`);
  }

  const run = await ensurePayrollRun(year, month, actorUserId);

  const { data: existingItems, error: existingError } = await adminClient
    .from('hrm_payroll_items')
    .select('*')
    .eq('payroll_run_id', run.id);

  if (existingError) {
    throw new Error(existingError.message || 'Failed to load existing payroll items');
  }

  const existingMap = new Map((existingItems || []).map((item) => [item.employee_id, item]));

  for (const row of preview.rows) {
    const existing = existingMap.get(row.employeeId);
    const paymentStatus = existing?.payment_status === 'paid'
      ? 'paid'
      : existing?.payment_status === 'payment_pending'
        ? 'payment_pending'
        : 'generated';

    const payload = {
      payroll_run_id: run.id,
      employee_id: row.employeeId,
      salary_snapshot: row.salarySnapshot,
      days_in_month: row.daysInMonth,
      active_days: row.activeDays,
      prorated_salary: row.proratedSalary,
      lop_days: row.lopDays,
      lop_deduction: row.lopDeduction,
      pf_employee_deduction: row.pfEmployeeDeduction,
      pf_employer_deduction: row.pfEmployerDeduction,
      total_pf_deduction: row.totalPfDeduction,
      tds_employee_deduction: row.tdsEmployeeDeduction,
      tds_employer_deduction: row.tdsEmployerDeduction,
      total_tds_deduction: row.totalTdsDeduction,
      tds_deduction: row.totalTdsDeduction,
      retention_deduction: row.retentionDeduction,
      retention_release_amount: row.retentionReleaseAmount,
      total_deductions: row.totalDeductions,
      net_salary: row.netSalary,
      payment_status: paymentStatus,
      paid_at: paymentStatus === 'paid' ? existing?.paid_at || new Date().toISOString() : null,
      calculation_snapshot: {
        employee: row.employeeSnapshot,
        meta: {
          year,
          month,
          daysInMonth: row.daysInMonth,
          activeStart: row.activeStart,
          activeEnd: row.activeEnd,
          activeDays: row.activeDays,
          lopDays: row.lopDays,
          lopLeaveDays: row.lopLeaveDays,
          lopAttendanceDays: row.lopAttendanceDays,
        },
        policy: {
          pfEnabled: Boolean(row.profile?.pf_enabled),
          pfMode: 'fixed',
          pfValue: toNumber(row.profile?.pf_value, 0),
          tdsEnabled: Boolean(row.profile?.tds_enabled),
          tdsMode: row.profile?.tds_mode || 'percent',
          tdsValue: toNumber(row.profile?.tds_value, 0),
          retentionEnabled: Boolean(row.profile?.retention_enabled),
          retentionMonthlyAmount: toNumber(row.retentionSchedule?.monthly_amount, 0),
        },
        effectiveRevision: row.effectiveRevision,
        earnings: {
          salarySnapshot: row.salarySnapshot,
          proratedSalary: row.proratedSalary,
        },
        deductions: {
          lopDeduction: row.lopDeduction,
          pfEmployeeDeduction: row.pfEmployeeDeduction,
          pfEmployerDeduction: row.pfEmployerDeduction,
          totalPfDeduction: row.totalPfDeduction,
          tdsEmployeeDeduction: row.tdsEmployeeDeduction,
          tdsEmployerDeduction: row.tdsEmployerDeduction,
          totalTdsDeduction: row.totalTdsDeduction,
          retentionDeduction: row.retentionDeduction,
          retentionReleaseAmount: row.retentionReleaseAmount,
        },
        totals: {
          totalDeductions: row.totalDeductions,
          netSalary: row.netSalary,
        },
      },
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error: updateError } = await adminClient
        .from('hrm_payroll_items')
        .update(payload)
        .eq('id', existing.id);

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update payroll item');
      }
      continue;
    }

    const { error: insertError } = await adminClient
      .from('hrm_payroll_items')
      .insert(payload);

    if (insertError) {
      throw new Error(insertError.message || 'Failed to create payroll item');
    }
  }

  const refreshedRun = await updatePayrollRunTotals(run.id);

  return {
    run: refreshedRun,
    preview,
  };
}

export async function listPayrollRuns({ year = null, month = null }) {
  let query = adminClient
    .from('hrm_payroll_runs')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (year) {
    query = query.eq('year', year);
  }
  if (month) {
    query = query.eq('month', month);
  }

  const { data: runs, error } = await query;
  if (error) {
    throw new Error(error.message || 'Failed to load payroll runs');
  }

  const runIds = (runs || []).map((run) => run.id);
  if (!runIds.length) {
    return [];
  }

  const { data: items, error: itemsError } = await adminClient
    .from('hrm_payroll_items')
    .select(`
      id,
      payroll_run_id,
      employee_id,
      payment_status,
      net_salary,
      total_deductions,
      prorated_salary,
      employee:hrm_employees (
        id,
        employee_id,
        name,
        company
      )
    `)
    .in('payroll_run_id', runIds)
    .order('updated_at', { ascending: false });

  if (itemsError) {
    throw new Error(itemsError.message || 'Failed to load payroll run items');
  }

  const itemIds = (items || []).map((item) => item.id);
  const latestPayslipMap = new Map();

  if (itemIds.length) {
    const { data: payslips, error: payslipError } = await adminClient
      .from('hrm_payslips')
      .select('id, payroll_item_id, payslip_number, generated_at, released_to_employee, released_at, released_by, version')
      .in('payroll_item_id', itemIds)
      .order('generated_at', { ascending: false });

    if (payslipError) {
      throw new Error(payslipError.message || 'Failed to load payroll payslips');
    }

    for (const payslip of payslips || []) {
      if (!latestPayslipMap.has(payslip.payroll_item_id)) {
        latestPayslipMap.set(payslip.payroll_item_id, payslip);
      }
    }
  }

  const groupedItems = new Map();
  for (const item of items || []) {
    const payslip = latestPayslipMap.get(item.id) || null;
    const current = groupedItems.get(item.payroll_run_id) || [];
    current.push({
      ...item,
      payslip,
      ...buildAdminPayslipState(item, payslip),
    });
    groupedItems.set(item.payroll_run_id, current);
  }

  return (runs || []).map((run) => ({
    ...run,
    items: (groupedItems.get(run.id) || []).sort((left, right) =>
      compareEmployeeCodeLike(left.employee?.employee_id, right.employee?.employee_id)
    ),
  }));
}

export async function getPayrollItemById(itemId) {
  const { data: item, error } = await adminClient
    .from('hrm_payroll_items')
    .select(`
      *,
      payroll_run:hrm_payroll_runs (*)
    `)
    .eq('id', itemId)
    .maybeSingle();

  if (error || !item) {
    throw new Error(error?.message || 'Payroll item not found');
  }

  const { data: employee, error: employeeError } = await adminClient
    .from('hrm_employees')
    .select(PAYROLL_EMPLOYEE_SELECT)
    .eq('id', item.employee_id)
    .maybeSingle();

  if (employeeError || !employee) {
    throw new Error(employeeError?.message || 'Payroll employee not found');
  }

  return {
    ...item,
    employee: buildEmployeeDisplayFields(employee),
  };
}

export async function updatePayrollItemStatus({ itemId, paymentStatus }) {
  const allowed = new Set(['generated', 'payment_pending', 'paid']);
  if (!allowed.has(paymentStatus)) {
    throw new Error('Unsupported payroll item status update');
  }

  const item = await getPayrollItemById(itemId);
  const payslip = await getLatestPayslipForItem(itemId);

  if (paymentStatus === 'paid' && !payslip) {
    throw new Error('Generate the payslip before marking this payroll item as paid.');
  }

  const { data: updated, error } = await adminClient
    .from('hrm_payroll_items')
    .update({
      payment_status: paymentStatus,
      paid_at: paymentStatus === 'paid' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new Error(error?.message || 'Failed to update payroll item');
  }

  await updatePayrollRunTotals(item.payroll_run_id);
  return updated;
}

export async function generatePayslipForItem({ itemId, actorUserId }) {
  const item = await getPayrollItemById(itemId);

  const existingPayslip = await getLatestPayslipForItem(itemId);
  if (existingPayslip) {
    return existingPayslip;
  }

  const generatedAt = new Date().toISOString();
  const payslipNumber = `PS-${item.payroll_run.year}${padMonth(item.payroll_run.month)}-${item.employee.employee_id}-1`;
  const snapshot = buildPayslipSnapshot({
    payrollItem: item,
    employee: item.employee,
    run: item.payroll_run,
    payslipNumber,
    generatedAt,
  });
  const html = buildPayslipHtml(snapshot);

  const { data: created, error } = await adminClient
    .from('hrm_payslips')
    .insert({
      payroll_item_id: itemId,
      employee_id: item.employee_id,
      year: item.payroll_run.year,
      month: item.payroll_run.month,
      payslip_number: payslipNumber,
      html_snapshot: html,
      snapshot_json: snapshot,
      generated_by: actorUserId,
      generated_at: generatedAt,
      version: 1,
      released_to_employee: false,
    })
    .select('*')
    .single();

  if (error || !created) {
    throw new Error(error?.message || 'Failed to generate payslip');
  }

  if (item.payment_status === 'generated') {
    await updatePayrollItemStatus({ itemId, paymentStatus: 'payment_pending' });
  }

  return created;
}

export async function getLatestPayslipForItem(itemId) {
  const { data, error } = await adminClient
    .from('hrm_payslips')
    .select('*')
    .eq('payroll_item_id', itemId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load payslip');
  }

  return data || null;
}

export async function listAdminPayrollHistory({ employeeId, year = null }) {
  if (!employeeId) {
    return [];
  }

  let query = adminClient
    .from('hrm_payroll_items')
    .select(`
      *,
      payroll_run:hrm_payroll_runs (*)
    `)
    .eq('employee_id', employeeId);

  if (year) {
    const runResult = await adminClient
      .from('hrm_payroll_runs')
      .select('id')
      .eq('year', year);

    if (runResult.error) {
      throw new Error(runResult.error.message || 'Failed to load payroll history runs');
    }

    const runIds = (runResult.data || []).map((run) => run.id);
    if (!runIds.length) {
      return [];
    }

    query = query.in('payroll_run_id', runIds);
  }

  const { data: items, error } = await query;
  if (error) {
    throw new Error(error.message || 'Failed to load employee payroll history');
  }

  const itemIds = (items || []).map((item) => item.id);
  const latestPayslipMap = new Map();

  if (itemIds.length) {
    const payslipResult = await adminClient
      .from('hrm_payslips')
      .select('id, payroll_item_id, payslip_number, generated_at, released_to_employee, released_at, released_by, version')
      .in('payroll_item_id', itemIds)
      .order('generated_at', { ascending: false });

    if (payslipResult.error) {
      throw new Error(payslipResult.error.message || 'Failed to load payroll history payslips');
    }

    for (const payslip of payslipResult.data || []) {
      if (!latestPayslipMap.has(payslip.payroll_item_id)) {
        latestPayslipMap.set(payslip.payroll_item_id, payslip);
      }
    }
  }

  return (items || [])
    .map((item) => {
      const payslip = latestPayslipMap.get(item.id) || null;
      return {
        ...item,
        payslip,
        ...buildAdminPayslipState(item, payslip),
      };
    })
    .sort((left, right) => {
      const leftYear = Number(left.payroll_run?.year || 0);
      const rightYear = Number(right.payroll_run?.year || 0);
      if (leftYear !== rightYear) {
        return rightYear - leftYear;
      }
      return Number(right.payroll_run?.month || 0) - Number(left.payroll_run?.month || 0);
    });
}

export async function getAdminPayrollHistoryItem(itemId) {
  const item = await getPayrollItemById(itemId);
  const payslip = await getLatestPayslipForItem(itemId);

  return {
    item,
    payslip,
    ...buildAdminPayslipState(item, payslip),
  };
}

export async function releasePayslipToEmployee({ itemId, actorUserId }) {
  const payslip = await getLatestPayslipForItem(itemId);
  if (!payslip) {
    throw new Error('Generate the payslip before sending it to the employee.');
  }

  const item = await getPayrollItemById(itemId);
  if (item.payment_status !== 'paid') {
    throw new Error('Mark this payroll item as paid before sending the payslip.');
  }

  if (payslip.released_to_employee) {
    return payslip;
  }

  const { data: updated, error } = await adminClient
    .from('hrm_payslips')
    .update({
      released_to_employee: true,
      released_at: new Date().toISOString(),
      released_by: actorUserId,
    })
    .eq('id', payslip.id)
    .select('*')
    .single();

  if (error || !updated) {
    throw new Error(error?.message || 'Failed to send payslip to employee.');
  }

  return updated;
}

export async function listEmployeePaidPayroll(employeeId) {
  const { data: items, error } = await adminClient
    .from('hrm_payroll_items')
    .select(`
      *,
      payroll_run:hrm_payroll_runs (*)
    `)
    .eq('employee_id', employeeId)
    .eq('payment_status', 'paid');

  if (error) {
    throw new Error(error.message || 'Failed to load employee payroll history');
  }

  const itemIds = (items || []).map((item) => item.id);
  let payslips = [];

  if (itemIds.length) {
    const payslipResult = await adminClient
      .from('hrm_payslips')
      .select('id, payroll_item_id, payslip_number, generated_at, released_to_employee, released_at, released_by, version')
      .in('payroll_item_id', itemIds)
      .order('version', { ascending: false });

    if (payslipResult.error) {
      throw new Error(payslipResult.error.message || 'Failed to load employee payslips');
    }

    payslips = payslipResult.data || [];
  }

  const latestPayslipMap = new Map();
  for (const payslip of payslips) {
    if (!latestPayslipMap.has(payslip.payroll_item_id)) {
      latestPayslipMap.set(payslip.payroll_item_id, payslip);
    }
  }

  return (items || [])
    .map((item) => {
      const payslip = latestPayslipMap.get(item.id) || null;
      return {
        ...item,
        ...buildEmployeePayslipState(payslip),
      };
    })
    .sort((left, right) => {
      const leftYear = Number(left.payroll_run?.year || 0);
      const rightYear = Number(right.payroll_run?.year || 0);
      if (leftYear !== rightYear) {
        return rightYear - leftYear;
      }
      return Number(right.payroll_run?.month || 0) - Number(left.payroll_run?.month || 0);
    });
}

export async function getEmployeePaidPayrollMonth(employeeId, year, month) {
  const { data: run, error: runError } = await adminClient
    .from('hrm_payroll_runs')
    .select('id, year, month, status')
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (runError || !run?.id) {
    throw new Error(runError?.message || 'Payroll run not found');
  }

  const { data: item, error } = await adminClient
    .from('hrm_payroll_items')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('payroll_run_id', run.id)
    .eq('payment_status', 'paid')
    .maybeSingle();

  if (error || !item) {
    throw new Error(error?.message || 'Paid payroll month not found');
  }

  const payslip = await getLatestPayslipForItem(item.id);
  return {
    ...item,
    payroll_run: run,
    ...buildEmployeePayslipState(payslip),
  };
}
