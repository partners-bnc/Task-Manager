export const EMPLOYEE_TYPE_OPTIONS = [
  { value: 'intern', label: 'Intern' },
  { value: 'full_time_employee', label: 'Full-time Employee' },
  { value: 'part_time_employee', label: 'Part-time Employee' },
  { value: 'contract_freelancer', label: 'Contract / Freelancer' },
  { value: 'trainee_probation', label: 'Trainee / Probation' },
  { value: 'consultant', label: 'Consultant' },
];

export const EMPLOYMENT_LIFECYCLE_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'terminated', label: 'Terminated' },
];

export const CURRENT_STAGE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'probation', label: 'Probation' },
  { value: 'notice_period', label: 'Notice Period' },
  { value: 'on_leave', label: 'On Leave' },
];

const EMPLOYEE_TYPE_SET = new Set(EMPLOYEE_TYPE_OPTIONS.map((option) => option.value));
const LIFECYCLE_STATUS_SET = new Set(EMPLOYMENT_LIFECYCLE_STATUS_OPTIONS.map((option) => option.value));
const CURRENT_STAGE_SET = new Set(CURRENT_STAGE_OPTIONS.map((option) => option.value));

function normalizeText(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || null;
}

export function normalizeEmployeeType(value, fallback = 'full_time_employee') {
  const normalized = normalizeText(value);
  if (normalized && EMPLOYEE_TYPE_SET.has(normalized)) {
    return normalized;
  }

  return fallback;
}

export function normalizeEmploymentLifecycleStatus(value, fallback = 'active') {
  const normalized = normalizeText(value);
  if (normalized && LIFECYCLE_STATUS_SET.has(normalized)) {
    return normalized;
  }

  return fallback;
}

export function normalizeCurrentStage(value, fallback = 'none') {
  const normalized = normalizeText(value);
  if (normalized && CURRENT_STAGE_SET.has(normalized)) {
    return normalized;
  }

  return fallback;
}

export function deriveEmploymentFields(row = {}) {
  const legacyStatus = normalizeText(row.employee_status || row.status || row.employment_status);

  let lifecycle = normalizeEmploymentLifecycleStatus(
    row.employment_lifecycle_status,
    legacyStatus === 'terminated' ? 'terminated' : legacyStatus === 'inactive' ? 'inactive' : 'active'
  );

  let currentStage = normalizeCurrentStage(
    row.current_stage,
    ['probation', 'notice_period', 'on_leave'].includes(legacyStatus || '') ? legacyStatus : 'none'
  );

  const employeeType = normalizeEmployeeType(row.employee_type);

  if (lifecycle === 'terminated') {
    currentStage = 'none';
  }

  return {
    employeeType,
    employmentLifecycleStatus: lifecycle,
    currentStage,
    legacyEmployeeStatus: toLegacyEmployeeStatus({
      employmentLifecycleStatus: lifecycle,
      currentStage,
    }),
  };
}

export function toLegacyEmployeeStatus({ employmentLifecycleStatus, currentStage }) {
  const lifecycle = normalizeEmploymentLifecycleStatus(employmentLifecycleStatus);
  const stage = normalizeCurrentStage(currentStage);

  if (lifecycle === 'terminated') return 'terminated';
  if (lifecycle === 'inactive') return 'inactive';
  if (stage !== 'none') return stage;
  return 'active';
}

export function isEmployeeLoginBlocked(row = {}) {
  return deriveEmploymentFields(row).employmentLifecycleStatus === 'terminated';
}

export function formatEmploymentValue(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized || normalized === 'none') return 'None';

  return normalized
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getEmployeeTypeLabel(value) {
  return EMPLOYEE_TYPE_OPTIONS.find((option) => option.value === value)?.label || formatEmploymentValue(value);
}
