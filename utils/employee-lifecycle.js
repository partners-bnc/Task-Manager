import { deriveEmploymentFields, normalizeCurrentStage, normalizeEmploymentLifecycleStatus } from '@/utils/hrm-employment';

export const DEFAULT_PROBATION_PERIOD_DAYS = 180;

export const SEPARATION_REASON_OPTIONS = [
  { value: 'internship_completed', label: 'Internship Completed' },
  { value: 'resigned', label: 'Resigned' },
  { value: 'performance_issue', label: 'Performance Issue' },
  { value: 'misconduct', label: 'Misconduct' },
  { value: 'contract_completed', label: 'Contract Completed' },
  { value: 'absconded', label: 'Absconded' },
  { value: 'mutual_separation', label: 'Mutual Separation' },
  { value: 'position_closed', label: 'Position Closed' },
  { value: 'health_reason', label: 'Health Reason' },
  { value: 'other', label: 'Other' },
];

const SEPARATION_REASON_SET = new Set(SEPARATION_REASON_OPTIONS.map((option) => option.value));

function cleanText(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function parseIntegerValue(value) {
  const normalized = cleanText(value);
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateFromDateOnly(value) {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split('-').map((part) => Number(part));
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateOnly(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function addDays(dateOnly, daysToAdd) {
  const date = dateFromDateOnly(dateOnly);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return formatDateOnly(date);
}

export function normalizeSeparationReasonCode(value, fallback = null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized && SEPARATION_REASON_SET.has(normalized)) {
    return normalized;
  }

  return fallback;
}

export function deriveLifecycleDates(row = {}, now = new Date()) {
  const employment = deriveEmploymentFields(row);
  const lifecycleStatus = row?.employment_lifecycle_status ?? employment.employmentLifecycleStatus;
  const employeeType = row?.employee_type ?? row?.employeeType ?? row?.resolved_employee_type ?? null;
  const isIntern = employeeType === 'intern';
  let currentStage = row?.current_stage ?? employment.currentStage;
  if (isIntern && currentStage === 'probation') {
    currentStage = 'none';
  }
  const joinDate = cleanText(row?.date_of_joining)?.slice(0, 10) || null;
  const probationPeriodDays = isIntern ? 0 : (parseIntegerValue(row?.probation_period_days) || DEFAULT_PROBATION_PERIOD_DAYS);
  const probationStartedAt = isIntern ? null : (cleanText(row?.probation_started_at) || (currentStage === 'probation' && joinDate ? `${joinDate}T00:00:00.000Z` : null));
  const probationStartDate = probationStartedAt ? probationStartedAt.slice(0, 10) : null;
  const probationEndsAt = isIntern ? null : (
    cleanText(row?.probation_ends_at)?.slice(0, 10) ||
    (probationStartDate ? addDays(probationStartDate, probationPeriodDays) : null)
  );
  const noticePeriodDays = parseIntegerValue(row?.notice_period_days);
  const noticeStartedAt = cleanText(row?.notice_started_at) || null;
  const noticeStartDate = noticeStartedAt ? noticeStartedAt.slice(0, 10) : null;
  const noticeEndsAt =
    cleanText(row?.notice_ends_at)?.slice(0, 10) ||
    (noticeStartDate && noticePeriodDays ? addDays(noticeStartDate, Math.max(noticePeriodDays - 1, 0)) : null);
  const separatedAt = cleanText(row?.separated_at ?? row?.terminated_at) || null;

  return {
    lifecycleStatus,
    currentStage,
    joinDate,
    probationPeriodDays,
    probationStartedAt,
    probationEndsAt,
    noticePeriodDays,
    noticeStartedAt,
    noticeEndsAt,
    separatedAt,
    separationReason: cleanText(row?.separation_reason ?? row?.termination_reason),
    separationReasonCode: normalizeSeparationReasonCode(
      row?.separation_reason_code ?? row?.termination_reason_code
    ),
    accessDisabledAt: cleanText(row?.access_disabled_at) || null,
    todayDate: formatDateOnly(now),
  };
}

export function buildLifecycleColumns(source = {}, existingEmployee = {}) {
  const currentEmployment = deriveEmploymentFields(existingEmployee);
  const inputLifecycleStatus =
    source.lifecycleStatus ??
    source.employment_lifecycle_status ??
    source.employmentLifecycleStatus ??
    null;
  const lifecycleStatus = normalizeEmploymentLifecycleStatus(
    inputLifecycleStatus,
    currentEmployment.employmentLifecycleStatus
  );
  const inputCurrentStage = source.currentStage ?? source.current_stage ?? null;
  const now = new Date();
  const nowIso = now.toISOString();
  const joinDate =
    cleanText(source.joinedOn ?? source.date_of_joining ?? existingEmployee.date_of_joining)?.slice(0, 10) || null;
  const isCreateFlow = !existingEmployee?.id;
  const employeeType = source.employeeType ?? source.employee_type ?? existingEmployee.employee_type ?? existingEmployee.employeeType ?? null;
  const isIntern = employeeType === 'intern';
  let currentStage = lifecycleStatus === 'separated'
    ? 'none'
    : normalizeCurrentStage(
        inputCurrentStage,
        isCreateFlow && joinDate ? (isIntern ? 'none' : 'probation') : currentEmployment.currentStage
      );

  if (isIntern && currentStage === 'probation') {
    currentStage = 'none';
  }

  const explicitProbationStartedAt = cleanText(source.probationStartedAt ?? source.probation_started_at);
  const explicitProbationEndsAt = cleanText(source.probationEndsAt ?? source.probation_ends_at)?.slice(0, 10) || null;
  const explicitNoticeStartedAt = cleanText(source.noticeStartedAt ?? source.notice_started_at);
  const explicitNoticeEndsAt = cleanText(source.noticeEndsAt ?? source.notice_ends_at)?.slice(0, 10) || null;
  const explicitSeparatedAt = cleanText(source.separatedAt ?? source.separated_at ?? source.terminatedAt ?? source.terminated_at);
  const explicitAccessDisabledAt = cleanText(source.accessDisabledAt ?? source.access_disabled_at);
  const explicitSeparationReason = cleanText(
    source.separationReason ?? source.separation_reason ?? source.terminationReason ?? source.termination_reason
  );
  const explicitSeparationReasonCode = normalizeSeparationReasonCode(
    source.separationReasonCode ?? source.separation_reason_code ?? source.terminationReasonCode ?? source.termination_reason_code,
    normalizeSeparationReasonCode(existingEmployee.separation_reason_code ?? existingEmployee.termination_reason_code)
  );

  const probationPeriodDays = isIntern ? 0 : DEFAULT_PROBATION_PERIOD_DAYS;
  const probationStartedAt = isIntern ? null : (
    joinDate
      ? `${joinDate}T00:00:00.000Z`
      : (explicitProbationStartedAt ?? existingEmployee.probation_started_at ?? null)
  );
  const probationStartDate = probationStartedAt ? probationStartedAt.slice(0, 10) : null;
  const probationEndsAt = isIntern ? null : (
    probationStartDate
      ? addDays(probationStartDate, probationPeriodDays)
      : explicitProbationEndsAt
  );

  const noticePeriodDays =
    parseIntegerValue(source.noticePeriodDays ?? source.notice_period_days) ??
    parseIntegerValue(existingEmployee.notice_period_days);
  const noticeStartedAt =
    explicitNoticeStartedAt ??
    existingEmployee.notice_started_at ??
    (currentStage === 'notice_period' ? nowIso : null);
  const noticeStartDate = noticeStartedAt ? noticeStartedAt.slice(0, 10) : null;
  const noticeEndsAt =
    explicitNoticeEndsAt ||
    (noticeStartDate && noticePeriodDays ? addDays(noticeStartDate, Math.max(noticePeriodDays - 1, 0)) : null);

  const isSeparated = lifecycleStatus === 'separated';
  const separatedAt = isSeparated
    ? explicitSeparatedAt || existingEmployee.separated_at || existingEmployee.terminated_at || nowIso
    : null;
  const accessDisabledAt =
    explicitAccessDisabledAt ||
    (isSeparated
      ? existingEmployee.access_disabled_at || separatedAt || nowIso
      : lifecycleStatus === 'inactive'
        ? existingEmployee.access_disabled_at || nowIso
        : null);

  return {
    employment_lifecycle_status: lifecycleStatus,
    current_stage: currentStage,
    employee_status: deriveEmploymentFields({
      ...existingEmployee,
      employment_lifecycle_status: lifecycleStatus,
      current_stage: currentStage,
    }).legacyEmployeeStatus,
    probation_period_days: probationPeriodDays,
    probation_started_at: probationStartedAt,
    probation_ends_at: probationEndsAt,
    notice_period_days: noticePeriodDays,
    notice_started_at: noticeStartedAt,
    notice_ends_at: noticeEndsAt,
    separated_at: separatedAt,
    separation_reason: isSeparated ? (explicitSeparationReason || cleanText(existingEmployee.separation_reason)) : null,
    separation_reason_code: isSeparated ? explicitSeparationReasonCode : null,
    access_disabled_at: accessDisabledAt,
  };
}
