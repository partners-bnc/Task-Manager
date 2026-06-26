'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { supabaseUrl } from '@/utils/supabase/config';
import {
  EMPLOYEE_TYPE_OPTIONS,
  formatEmploymentValue,
  getEmployeeTypeLabel,
} from '@/utils/hrm-employment';
import { DEFAULT_PROBATION_PERIOD_DAYS, SEPARATION_REASON_OPTIONS } from '@/utils/employee-lifecycle';
import { mergeAllowedHrmDepartments } from '@/utils/hrm-departments';
import { useHrmFeedback } from '../../ui/HrmFeedback';
import { LoadingPanel, Skeleton } from '../../ui/Skeleton';

const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'others', label: 'Others' },
];
const RELIGION_OPTIONS = ['Hindu', 'Muslim', 'Sikh', 'Christian', 'Buddhist', 'Jain', 'Parsi', 'Other'];
const YES_NO_OPTIONS = ['Yes', 'No'];
const NOTICE_PERIOD_OPTIONS = ['30', '60', '90'];
const DEPARTMENT_DESIGNATION_SUGGESTIONS: Record<string, string[]> = {
  'International Collaborations & Partnerships': ['Manager'],
  'Consulting - Financial Advisory': ['Manager', 'Financial Advisor', 'Consultant'],
  'HR & Global Hirings': ['Manager', 'HR Manager', 'HR Executive', 'Recruiter'],
  'Marketing & Branding': ['Manager', 'Marketing Manager', 'Digital Marketing Executive', 'Brand Executive'],
  'Accounts & Finance': ['Manager', 'Accounts Manager', 'Accountant', 'Finance Executive'],
  'Consulting - HR': ['Manager', 'HR Consultant', 'Consultant'],
  'Cyber Security': ['Manager', 'Security Manager', 'Security Analyst', 'Cyber Security Analyst'],
  'AI Automation': ['Manager', 'AI Engineer', 'Automation Engineer', 'ML Engineer'],
  'IT & Internal Control': ['Manager', 'IT Manager', 'Internal Control Executive', 'Software Developer'],
};
const DOCUMENT_TYPES = [
  { key: 'aadhaar_card', label: 'Aadhaar Card' },
  { key: 'pan_card', label: 'PAN Card' },
  { key: 'passport', label: 'Passport' },
  { key: 'appointment_letter', label: 'Appointment Letter (Previous Organisation)' },
  { key: 'experience_letter', label: 'Experience Letter' },
  { key: 'salary_slip', label: 'Salary Slip' },
];

const defaultForm = {
  employeeId: '',
  name: '',
  email: '',
  phone: '',
  personalEmail: '',
  dateOfBirth: '',
  gender: '',
  bloodGroup: '',
  fatherName: '',
  maritalStatus: '',
  spouseName: '',
  nationality: '',
  religion: '',
  isPhysicallyChallenged: 'No',
  address: '',
  city: '',
  district: '',
  state: '',
  country: '',
  pincode: '',
  permanentAddress: '',
  permanentCity: '',
  permanentDistrict: '',
  permanentState: '',
  permanentCountry: '',
  permanentPincode: '',
  phone2: '',
  mobile: '',
  emergencyContactName: '',
  emergencyContactNumber: '',
  joinedOn: '',
  confirmationDate: '',
  employeeType: 'full_time_employee',
  lifecycleStatus: 'active',
  currentStage: 'none',
  probationPeriodDays: String(DEFAULT_PROBATION_PERIOD_DAYS),
  probationStartedAt: '',
  probationEndsAt: '',
  noticePeriodDays: '',
  noticeStartedAt: '',
  noticeEndsAt: '',
  separatedAt: '',
  separationReasonCode: '',
  separationReason: '',
  accessDisabledAt: '',
  referredBy: '',
  experienceCompanyName: '',
  salary: '',
  totalExperience: '',
  department: '',
  division: '',
  designation: '',
  reportingTo: '',
  company: '',
  workingScheduleLabel: '',
  secondSaturdayOff: 'No',
  taskManagerAccess: 'No',
  aadhaarNumber: '',
  panNumber: '',
  passportNumber: '',
  bankAccountNumber: '',
  bankAccountHolderName: '',
  bankIfscCode: '',
  bankName: '',
};
const CUSTOM_DESIGNATION_VALUE = '__custom_designation__';

const CURRENT_TO_PERMANENT_FIELD_MAP: Record<string, keyof typeof defaultForm> = {
  address: 'permanentAddress',
  city: 'permanentCity',
  district: 'permanentDistrict',
  state: 'permanentState',
  country: 'permanentCountry',
  pincode: 'permanentPincode',
};

function buildPermanentAddressPatch(form: typeof defaultForm) {
  return {
    permanentAddress: form.address,
    permanentCity: form.city,
    permanentDistrict: form.district,
    permanentState: form.state,
    permanentCountry: form.country,
    permanentPincode: form.pincode,
  };
}

function isPermanentAddressSameAsCurrent(form: typeof defaultForm) {
  return (
    form.address === form.permanentAddress &&
    form.city === form.permanentCity &&
    form.district === form.permanentDistrict &&
    form.state === form.permanentState &&
    form.country === form.permanentCountry &&
    form.pincode === form.permanentPincode
  );
}

function toInputDate(value?: string | null) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function addDaysToDateOnly(value: string, daysToAdd: number) {
  const [year, month, day] = String(value || '').split('-').map((part) => Number(part));
  if (!year || !month || !day) return '';
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return date.toISOString().slice(0, 10);
}

function deriveProbationStartDate(stage?: string | null, joinedOn?: string | null, probationStartedAt?: string | null) {
  if (stage === 'probation' && joinedOn) return joinedOn;
  return probationStartedAt || '';
}

function deriveProbationEndDate(stage?: string | null, probationStartDate?: string | null, probationEndsAt?: string | null) {
  if (stage === 'probation' && probationStartDate) {
    return addDaysToDateOnly(probationStartDate, DEFAULT_PROBATION_PERIOD_DAYS);
  }
  return probationEndsAt || '';
}

function toDisplayDate(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatStatus(status?: string | null) {
  return formatEmploymentValue(status);
}

function normalizeGender(value?: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['male', 'female', 'others'].includes(normalized)) {
    return normalized;
  }

  return '';
}

function getInitials(name?: string | null) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'E';
}

function statusTone(status?: string | null) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (normalized === 'inactive') return 'bg-slate-100 text-slate-700 border-slate-200';
  if (normalized === 'separated') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-surface-container-low text-on-surface-variant border-outline-variant/10';
}

function stageTone(stage?: string | null) {
  const normalized = String(stage || '').toLowerCase();
  if (normalized === 'probation') return 'bg-violet-50 text-violet-700 border-violet-200';
  if (normalized === 'on_leave') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (normalized === 'notice_period') return 'bg-sky-50 text-sky-700 border-sky-200';
  return 'bg-surface-container-low text-on-surface-variant border-outline-variant/10';
}

function toYesNo(value?: boolean | string | null) {
  return value ? 'Yes' : 'No';
}

function pickFirstText(...values: Array<string | number | null | undefined>) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }

  return '';
}

function formatDocumentLabel(value?: string | null) {
  const normalized = String(value || '').trim();
  if (!normalized) return 'Employee Document';
  if (normalized === 'appointment_letter') return 'Appointment Letter (Previous Organisation)';

  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatFileSize(value?: number | null) {
  if (!value || value <= 0) return 'Size unavailable';

  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getDocumentIcon(documentType?: string | null, fileName?: string | null) {
  const normalizedType = String(documentType || '').toLowerCase();
  const extension = String(fileName || '').split('.').pop()?.toLowerCase();

  if (normalizedType.includes('aadhaar') || normalizedType.includes('pan') || normalizedType.includes('passport')) {
    return 'badge';
  }

  if (normalizedType.includes('salary')) {
    return 'receipt_long';
  }

  if (normalizedType.includes('letter')) {
    return 'description';
  }

  if (extension === 'pdf') return 'picture_as_pdf';
  if (['jpg', 'jpeg', 'png', 'webp'].includes(extension || '')) return 'image';

  return 'folder_open';
}

function formatReportingTarget(employee: any) {
  return employee?.reporting_manager_name || 'Not assigned';
}

function formatEducationLevelLabel(value?: string | null) {
  const normalized = String(value || '').trim();
  if (!normalized) return 'Education Record';
  if (normalized === '10th' || normalized === '12th') return normalized;

  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getEducationDocumentLabel(entry: any) {
  const rawName = entry?.degree_file_name || entry?.file_name;
  if (rawName) return String(rawName);

  const rawPath = entry?.degree_file_path || entry?.file_path || entry?.degree_file_url || entry?.file_url;
  if (!rawPath) return 'Uploaded education document';

  const normalized = String(rawPath).split('?')[0].split('#')[0];
  const fileName = normalized.split('/').pop();
  return fileName ? decodeURIComponent(fileName) : 'Uploaded education document';
}

function getEducationDocumentUrl(entry: any) {
  const directUrl = entry?.degree_file_url || entry?.file_url;
  if (directUrl) return String(directUrl);

  const filePath = entry?.degree_file_path || entry?.file_path;
  if (!filePath || !supabaseUrl) return '';

  return `${supabaseUrl}/storage/v1/object/public/employee-files/${filePath}`;
}

function normalizeWorkingDaysState(value: unknown) {
  if (!Array.isArray(value)) return [];

  const normalized: string[] = [];
  for (const item of value) {
    const day = String(item || '').trim().toLowerCase();
    if (!day || normalized.includes(day)) continue;
    normalized.push(day);
  }

  return normalized;
}

function formatWorkingDays(workingDays: unknown) {
  const normalizedDays = normalizeWorkingDaysState(workingDays);
  if (normalizedDays.length === 0) {
    return '--';
  }

  return normalizedDays
    .map((day) => day.charAt(0).toUpperCase() + day.slice(1))
    .join(', ');
}

function normalizeEmployeeToForm(employee: any) {
  const access = Array.isArray(employee?.module_access) ? employee.module_access[0] : employee?.module_access;
  const lifecycleStatus = employee?.resolved_employment_lifecycle_status || employee?.employment_lifecycle_status || 'active';
  const employeeType = employee?.resolved_employee_type || employee?.employee_type || 'full_time_employee';
  const isIntern = employeeType === 'intern';
  const currentStage = isIntern ? 'none' : (employee?.resolved_current_stage || employee?.current_stage || 'none');
  const joinedOn = toInputDate(employee?.date_of_joining);
  const probationStartedAt = isIntern ? '' : deriveProbationStartDate(currentStage, joinedOn, toInputDate(employee?.probation_started_at));
  const probationEndsAt = isIntern ? '' : deriveProbationEndDate(currentStage, probationStartedAt, toInputDate(employee?.probation_ends_at));

  return {
    employeeId: employee?.employee_id || '',
    name: employee?.name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    personalEmail: employee?.personal_email || '',
    dateOfBirth: toInputDate(employee?.date_of_birth),
    gender: normalizeGender(employee?.gender),
    bloodGroup: employee?.blood_group || '',
    fatherName: employee?.father_name || '',
    maritalStatus: employee?.marital_status || '',
    spouseName: employee?.spouse_name || '',
    nationality: employee?.nationality || '',
    religion: employee?.religion || '',
    isPhysicallyChallenged: toYesNo(employee?.is_physically_challenged),
    address: employee?.address || '',
    city: employee?.city || '',
    district: employee?.district || '',
    state: employee?.state || '',
    country: employee?.country || '',
    pincode: employee?.pincode || '',
    permanentAddress: employee?.permanent_address || '',
    permanentCity: employee?.permanent_city || '',
    permanentDistrict: employee?.permanent_district || '',
    permanentState: employee?.permanent_state || '',
    permanentCountry: employee?.permanent_country || '',
    permanentPincode: employee?.permanent_pincode || '',
    phone2: employee?.alternate_phone || '',
    mobile: employee?.mobile_phone || '',
    emergencyContactName: employee?.emergency_contact_name || '',
    emergencyContactNumber: employee?.emergency_contact_number || '',
    joinedOn,
    confirmationDate: toInputDate(employee?.confirmation_date),
    employeeType,
    lifecycleStatus,
    currentStage,
    probationPeriodDays: isIntern ? '0' : String(DEFAULT_PROBATION_PERIOD_DAYS),
    probationStartedAt,
    probationEndsAt,
    noticePeriodDays: employee?.notice_period_days ? String(employee.notice_period_days) : '',
    noticeStartedAt: toInputDate(employee?.notice_started_at),
    noticeEndsAt: toInputDate(employee?.notice_ends_at),
    separatedAt: toInputDate(employee?.separated_at || employee?.terminated_at),
    separationReasonCode: employee?.separation_reason_code || employee?.termination_reason_code || '',
    separationReason: employee?.separation_reason || employee?.termination_reason || '',
    accessDisabledAt: toInputDate(employee?.access_disabled_at),
    referredBy: employee?.referred_by || '',
    experienceCompanyName: employee?.experience_company_name || '',
    salary: employee?.salary !== undefined && employee?.salary !== null ? String(employee.salary) : '',
    totalExperience: employee?.total_experience || '',
    department: employee?.department?.name || employee?.resolved_department_name || '',
    division: employee?.division || '',
    designation: employee?.designation?.title || employee?.resolved_designation_title || '',
    reportingTo: employee?.reporting_manager_value || '',
    company: employee?.company || '',
    workingScheduleLabel: employee?.working_schedule_label || '',
    secondSaturdayOff: toYesNo(employee?.second_saturday_off),
    taskManagerAccess: access?.task_manager ? 'Yes' : 'No',
    aadhaarNumber: employee?.aadhaar_number || '',
    panNumber: employee?.pan_number || '',
    passportNumber: employee?.passport_number || '',
    bankAccountNumber: employee?.bank_account_number || '',
    bankAccountHolderName: employee?.bank_account_holder_name || '',
    bankIfscCode: employee?.bank_ifsc || '',
    bankName: employee?.bank_name || '',
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}

function inputClassName(disabled = false, multiline = false) {
  return `w-full rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none transition ${
    multiline ? 'min-h-[120px] resize-y' : ''
  } ${
    disabled
      ? 'cursor-default bg-surface-container-low text-on-surface-variant'
      : 'focus:border-primary focus:ring-2 focus:ring-primary/10'
  }`;
}

function getSuggestedDesignations(departmentName: string, designations: any[]) {
  const normalizedDepartment = String(departmentName || '').trim();
  const curated = DEPARTMENT_DESIGNATION_SUGGESTIONS[normalizedDepartment] || [];
  const apiOptions = (designations || [])
    .map((designation: any) => String(designation?.title || '').trim())
    .filter(Boolean);

  return [...new Set([...curated, ...apiOptions])].sort((left, right) => left.localeCompare(right));
}

function SectionShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-sm">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-on-surface">{title}</h2>
        <p className="mt-2 text-sm text-on-surface-variant">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

export default function DetailedEmployeeProfile({
  employeeId,
  setCurrentTab,
  embedded = false,
  onBack,
}: {
  employeeId?: string | null;
  setCurrentTab?: (tab: string) => void;
  embedded?: boolean;
  onBack?: () => void;
}) {
  const { showFeedback, confirmFeedback } = useHrmFeedback();
  const [employee, setEmployee] = useState<any>(null);
  const [form, setForm] = useState(defaultForm);
  const [meta, setMeta] = useState<any>({ employees: [], departments: [], designations: [] });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [sameAsCurrentAddress, setSameAsCurrentAddress] = useState(false);
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [documentFiles, setDocumentFiles] = useState<Record<string, File | null>>({});
  const [educationFiles, setEducationFiles] = useState<Record<string, File | null>>({});
  const [activeDocumentType, setActiveDocumentType] = useState<string | null>(null);
  const [activeEducationId, setActiveEducationId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('personal');
  const [lifecycleDialog, setLifecycleDialog] = useState<null | {
    type: 'remove_probation' | 'start_notice' | 'mark_separation';
    effectiveDate: string;
    noticePeriodDays: string;
    separationReasonCode: string;
    separationReason: string;
  }>(null);

  useEffect(() => {
    let active = true;

    async function loadEmployee() {
      if (!employeeId) {
        setEmployee(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        setMessage('');

        const response = await fetch(`/HRM/api/employees?id=${employeeId}&includeMeta=1`, {
          method: 'GET',
          cache: 'no-store',
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load employee');
        }

        if (!active) return;

        const nextForm = normalizeEmployeeToForm(result.employee || {});
        setEmployee(result.employee || null);
        setForm(nextForm);
        setWorkingDays(normalizeWorkingDaysState(result.employee?.working_days));
        setSameAsCurrentAddress(isPermanentAddressSameAsCurrent(nextForm));
        setMeta({
          employees: result.employeeOptions || result.employees || [],
          superAdmins: result.superAdminOptions || [],
          departments: mergeAllowedHrmDepartments(result.departments || []),
          designations: result.designations || [],
        });
      } catch (requestError: any) {
        if (active) {
          setEmployee(null);
          setError(requestError?.message || 'Failed to load employee');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadEmployee();
    return () => {
      active = false;
    };
  }, [employeeId]);

  useEffect(() => {
    if (!message) return;
    showFeedback({ type: 'success', title: 'Updated Successfully', message });
  }, [message, showFeedback]);

  useEffect(() => {
    if (!error) return;
    showFeedback({ type: 'error', title: 'Update Failed', message: error });
  }, [error, showFeedback]);

  const reportingManagerOptions = useMemo(() => {
    return (meta.employees || []).filter((item: any) => item.id !== employee?.id);
  }, [employee?.id, meta.employees]);

  const superAdminOptions = useMemo(() => meta.superAdmins || [], [meta.superAdmins]);

  const filteredDesignations = useMemo(() => {
    const selectedDepartment = (meta.departments || []).find((item: any) => item.name === form.department);
    const departmentMatchedDesignations = !selectedDepartment?.id
      ? meta.designations || []
      : (meta.designations || []).filter(
          (item: any) => !item.department_id || item.department_id === selectedDepartment.id
        );

    return getSuggestedDesignations(form.department, departmentMatchedDesignations);
  }, [form.department, meta.departments, meta.designations]);

  const documentList = useMemo(() => {
    if (!Array.isArray(employee?.documents)) return [];

    return [...employee.documents].sort((left: any, right: any) => {
      const leftTime = new Date(left?.updated_at || left?.created_at || 0).getTime();
      const rightTime = new Date(right?.updated_at || right?.created_at || 0).getTime();
      return rightTime - leftTime;
    });
  }, [employee?.documents]);

  const documentSummary = useMemo(() => {
    const totalSize = documentList.reduce((sum: number, item: any) => sum + (Number(item?.file_size) || 0), 0);
    const latestDocument = documentList[0];

    return {
      totalDocuments: documentList.length,
      totalSizeLabel: formatFileSize(totalSize),
      latestUpdatedLabel: latestDocument ? toDisplayDate(latestDocument.updated_at || latestDocument.created_at) : '--',
    };
  }, [documentList]);

  const documentSlots = useMemo(() => {
    const byType = new Map<string, any>();
    for (const item of documentList) {
      if (!byType.has(item.document_type)) {
        byType.set(item.document_type, item);
      }
    }

    return DOCUMENT_TYPES.map((documentType) => ({
      ...documentType,
      document: byType.get(documentType.key) || null,
      selectedFile: documentFiles[documentType.key] || null,
    }));
  }, [documentFiles, documentList]);

  const summaryItems = useMemo(
    () => {
      const summaryLifecycleStatus = employee?.resolved_employment_lifecycle_status || employee?.employment_lifecycle_status;
      const summaryCurrentStage = employee?.resolved_current_stage || employee?.current_stage || 'none';

      const items = [
        { label: 'Employee Type', value: getEmployeeTypeLabel(employee?.resolved_employee_type || employee?.employee_type) },
        { label: 'Lifecycle Status', value: formatStatus(summaryLifecycleStatus) },
        { label: 'Current Stage', value: formatStatus(summaryCurrentStage) },
        { label: 'Department', value: employee?.resolved_department_name || employee?.department?.name || '--' },
        { label: 'Designation', value: employee?.resolved_designation_title || employee?.designation?.title || '--' },
        { label: 'Reporting To', value: formatReportingTarget(employee) },
        { label: 'Working Days', value: formatWorkingDays(employee?.working_days) },
        { label: 'Created By', value: employee?.created_by_name || 'HR Admin' },
        { label: 'Date Of Joining', value: toDisplayDate(employee?.date_of_joining) },
      ];

      if (summaryLifecycleStatus === 'separated') {
        items.push({
          label: 'Separation Date',
          value: toDisplayDate(employee?.separated_at || employee?.terminated_at),
        });
      }

      items.push(
        { label: 'Salary', value: employee?.salary !== null && employee?.salary !== undefined ? `INR ${employee.salary}` : '--' },
        { label: 'Task Manager', value: form.taskManagerAccess === 'Yes' ? 'Enabled' : 'Disabled' }
      );

      return items;
    },
    [employee, form.taskManagerAccess]
  );

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;
    setForm((current) => {
      const next = {
        ...current,
        [name]: value,
        ...(sameAsCurrentAddress && CURRENT_TO_PERMANENT_FIELD_MAP[name]
          ? { [CURRENT_TO_PERMANENT_FIELD_MAP[name]]: value }
          : {}),
        ...(name === 'lifecycleStatus' && value === 'separated' ? { currentStage: 'none' } : {}),
      };

      const nextEmployeeType = name === 'employeeType' ? value : next.employeeType;
      const isIntern = nextEmployeeType === 'intern';

      let nextStage = name === 'currentStage' ? value : next.currentStage;
      if (isIntern) {
        nextStage = 'none';
      }
      const nextJoinedOn = name === 'joinedOn' ? value : next.joinedOn;
      const nextProbationStart = isIntern ? '' : deriveProbationStartDate(nextStage, nextJoinedOn, next.probationStartedAt);

      return {
        ...next,
        currentStage: nextStage,
        probationPeriodDays: isIntern ? '0' : String(DEFAULT_PROBATION_PERIOD_DAYS),
        probationStartedAt: nextProbationStart,
        probationEndsAt: isIntern ? '' : deriveProbationEndDate(nextStage, nextProbationStart, next.probationEndsAt),
      };
    });
    setMessage('');
    setError('');
  }

  function handleSameAsCurrentAddressChange(checked: boolean) {
    setSameAsCurrentAddress(checked);
    if (!checked) return;

    setForm((current) => ({
      ...current,
      ...buildPermanentAddressPatch(current),
    }));
  }

  async function handleSave() {
    if (!employee?.id) return;

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const response = await fetch('/HRM/api/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: employee.id,
          ...form,
          workingDays: normalizeWorkingDaysState(workingDays),
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update employee');
      }

      const nextEmployee = result.employee || employee;
      const nextForm = normalizeEmployeeToForm(nextEmployee);
      setEmployee(nextEmployee);
      setForm(nextForm);
      setWorkingDays(normalizeWorkingDaysState(nextEmployee?.working_days));
      setSameAsCurrentAddress(isPermanentAddressSameAsCurrent(nextForm));
      setIsEditing(false);
      setMessage('Employee details updated successfully.');
    } catch (requestError: any) {
      setError(requestError?.message || 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  }

  async function applyStatusUpdate(nextStatus: string) {
    if (!employee?.id) return;

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const response = await fetch('/HRM/api/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: employee.id,
          lifecycleStatus: nextStatus,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update employee status');
      }

      setEmployee(result.employee || employee);
      setForm((current) => ({
        ...current,
        lifecycleStatus: nextStatus,
        ...(nextStatus === 'separated' ? { currentStage: 'none' } : {}),
      }));
      setMessage(`Employee marked as ${formatStatus(nextStatus)}.`);
    } catch (requestError: any) {
      setError(requestError?.message || 'Failed to update employee status');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusUpdate(nextStatus: string) {
    if (!employee?.id || saving) return;
    const confirmed = await confirmFeedback({
      type: nextStatus === 'separated' ? 'warning' : 'info',
      title: 'Confirm Status Change',
      message: `Mark this employee as ${formatStatus(nextStatus)}? This action will immediately change the employee record.`,
      confirmLabel: `Yes, mark as ${formatStatus(nextStatus)}`,
    });
    if (!confirmed) return;
    await applyStatusUpdate(nextStatus);
  }

  function openLifecycleDialog(type: 'remove_probation' | 'start_notice' | 'mark_separation') {
    setLifecycleDialog({
      type,
      effectiveDate:
        type === 'remove_probation'
          ? (form.probationEndsAt || toInputDate(new Date().toISOString()))
          : type === 'start_notice'
            ? (form.noticeStartedAt || toInputDate(new Date().toISOString()))
            : (form.separatedAt || toInputDate(new Date().toISOString())),
      noticePeriodDays: form.noticePeriodDays || '30',
      separationReasonCode: form.separationReasonCode || '',
      separationReason: form.separationReason || '',
    });
  }

  async function submitLifecycleDialog() {
    if (!employee?.id || !lifecycleDialog) return;

    const payload: Record<string, any> = { id: employee.id };

    if (lifecycleDialog.type === 'remove_probation') {
      payload.lifecycleStatus = form.lifecycleStatus === 'inactive' ? 'inactive' : 'active';
      payload.currentStage = 'none';
      payload.probationEndsAt = lifecycleDialog.effectiveDate;
    }

    if (lifecycleDialog.type === 'start_notice') {
      payload.lifecycleStatus = form.lifecycleStatus === 'inactive' ? 'inactive' : 'active';
      payload.currentStage = 'notice_period';
      payload.noticeStartedAt = lifecycleDialog.effectiveDate;
      payload.noticePeriodDays = lifecycleDialog.noticePeriodDays || '30';
    }

    if (lifecycleDialog.type === 'mark_separation') {
      payload.lifecycleStatus = 'separated';
      payload.currentStage = 'none';
      payload.separatedAt = lifecycleDialog.effectiveDate;
      payload.separationReasonCode = lifecycleDialog.separationReasonCode;
      payload.separationReason = lifecycleDialog.separationReason;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const response = await fetch('/HRM/api/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update employee lifecycle');
      }

      const nextEmployee = result.employee || employee;
      const nextForm = normalizeEmployeeToForm(nextEmployee);
      setEmployee(nextEmployee);
      setForm(nextForm);
      setSameAsCurrentAddress(isPermanentAddressSameAsCurrent(nextForm));
      setLifecycleDialog(null);
      setMessage(
        lifecycleDialog.type === 'remove_probation'
          ? 'Employee removed from probation.'
          : lifecycleDialog.type === 'start_notice'
            ? 'Notice period started successfully.'
            : 'Employee marked as separated.'
      );
    } catch (requestError: any) {
      setError(requestError?.message || 'Failed to update employee lifecycle');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!employee?.id) return;
    const confirmed = await confirmFeedback({
      type: 'warning',
      title: 'Delete Employee Record',
      message: 'Delete this employee record permanently?',
      confirmLabel: 'Delete Employee',
    });
    if (!confirmed) return;

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const response = await fetch(`/HRM/api/employees?id=${employee.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete employee');
      }

      setCurrentTab?.('admin-employee-list');
    } catch (requestError: any) {
      setError(requestError?.message || 'Failed to delete employee');
    } finally {
      setSaving(false);
    }
  }

  function handleDocumentFileChange(documentType: string, file: File | null) {
    setDocumentFiles((current) => ({
      ...current,
      [documentType]: file,
    }));
    setMessage('');
    setError('');
  }

  async function handleDocumentUpload(documentType: string) {
    if (!employee?.id) return;

    const file = documentFiles[documentType];
    if (!file) {
      setError('Select a file before uploading.');
      return;
    }

    try {
      setActiveDocumentType(documentType);
      setError('');
      setMessage('');

      const payload = new FormData();
      payload.append('id', employee.id);
      payload.append(`document_${documentType}`, file);

      const response = await fetch('/HRM/api/employees', {
        method: 'PATCH',
        body: payload,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload document');
      }

      const nextEmployee = result.employee || employee;
      setEmployee(nextEmployee);
      setDocumentFiles((current) => ({
        ...current,
        [documentType]: null,
      }));
      setMessage(result.message || 'Document uploaded successfully.');
    } catch (requestError: any) {
      setError(requestError?.message || 'Failed to upload document');
    } finally {
      setActiveDocumentType(null);
    }
  }

  function handleEducationFileChange(educationId: string, file: File | null) {
    setEducationFiles((current) => ({
      ...current,
      [educationId]: file,
    }));
    setMessage('');
    setError('');
  }

  async function handleEducationUpload(entry: any) {
    if (!employee?.id || !entry?.id) return;

    const selectedFile = educationFiles[entry.id];
    if (!selectedFile) {
      setError('Select a file before uploading.');
      return;
    }

    try {
      setActiveEducationId(entry.id);
      setError('');
      setMessage('');

      const payload = new FormData();
      payload.append('id', employee.id);
      payload.append('educationRecordId', entry.id);
      payload.append('educationLevel', entry.education_level || '');
      payload.append('educationDocument', selectedFile);

      const response = await fetch('/HRM/api/employees', {
        method: 'PATCH',
        body: payload,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload education document');
      }

      setEmployee(result.employee || employee);
      setEducationFiles((current) => ({
        ...current,
        [entry.id]: null,
      }));
      setMessage(result.message || 'Education document uploaded successfully.');
    } catch (requestError: any) {
      setError(requestError?.message || 'Failed to upload education document');
    } finally {
      setActiveEducationId(null);
    }
  }

  async function handleDocumentDelete(documentType: string) {
    if (!employee?.id) return;

    const confirmed = await confirmFeedback({
      type: 'warning',
      title: 'Delete Document',
      message: 'Delete this document? This will remove it from storage and the database.',
      confirmLabel: 'Delete Document',
    });
    if (!confirmed) return;

    try {
      setActiveDocumentType(documentType);
      setError('');
      setMessage('');

      const response = await fetch(
        `/HRM/api/employees?id=${employee.id}&documentType=${encodeURIComponent(documentType)}`,
        { method: 'DELETE' }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete document');
      }

      setEmployee(result.employee || employee);
      setDocumentFiles((current) => ({
        ...current,
        [documentType]: null,
      }));
      setMessage(result.message || 'Document deleted successfully.');
    } catch (requestError: any) {
      setError(requestError?.message || 'Failed to delete document');
    } finally {
      setActiveDocumentType(null);
    }
  }

  function renderPersonalSection() {
    return (
      <SectionShell
        title="Personal Details"
        subtitle="Core personal, contact, and residential information for this employee."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <Field label="Full Name">
            <input name="name" value={form.name} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Official Email">
            <input name="email" value={form.email} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Phone Number">
            <input name="phone" value={form.phone} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Personal Email">
            <input name="personalEmail" value={form.personalEmail} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Date Of Birth">
            <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Gender">
            <select name="gender" value={form.gender} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)}>
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Blood Group">
            <select name="bloodGroup" value={form.bloodGroup} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)}>
              <option value="">Select blood group</option>
              {BLOOD_GROUP_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </Field>
          <Field label="Father's Name">
            <input name="fatherName" value={form.fatherName} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Marital Status">
            <input name="maritalStatus" value={form.maritalStatus} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Spouse Name">
            <input name="spouseName" value={form.spouseName} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Nationality">
            <input name="nationality" value={form.nationality} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Religion">
            <select name="religion" value={form.religion} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)}>
              <option value="">Select religion</option>
              {RELIGION_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </Field>
          <Field label="Physically Challenged">
            <select name="isPhysicallyChallenged" value={form.isPhysicallyChallenged} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)}>
              {YES_NO_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </Field>
          <Field label="Alternate Phone">
            <input name="phone2" value={form.phone2} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Mobile">
            <input name="mobile" value={form.mobile} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Emergency Contact Name">
            <input name="emergencyContactName" value={form.emergencyContactName} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Emergency Contact Number">
            <input name="emergencyContactNumber" value={form.emergencyContactNumber} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <div className="md:col-span-2 xl:col-span-3 mt-2">
            <div className="rounded-[1.2rem] border border-slate-200 bg-white px-5 py-5">
              <p className="text-sm font-bold text-on-surface">Current Address</p>
              <p className="mt-1 text-xs text-on-surface-variant">Primary address used for present communication.</p>
              <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                <div className="md:col-span-2 xl:col-span-3">
                  <Field label="Address">
                    <textarea name="address" value={form.address} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing, true)} />
                  </Field>
                </div>
                <Field label="City">
                  <input name="city" value={form.city} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
                </Field>
                <Field label="District">
                  <input name="district" value={form.district} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
                </Field>
                <Field label="State">
                  <input name="state" value={form.state} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
                </Field>
                <Field label="Country">
                  <input name="country" value={form.country} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
                </Field>
                <Field label="Pincode">
                  <input name="pincode" value={form.pincode} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
                </Field>
              </div>
            </div>
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <div className="rounded-[1.2rem] border border-slate-200 bg-white px-5 py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-on-surface">Permanent Address</p>
                  <p className="mt-1 text-xs text-on-surface-variant">Permanent residential address kept on the employee record.</p>
                </div>
                <label className={`inline-flex items-center gap-3 rounded-full border border-outline-variant/15 bg-white px-4 py-2 text-sm font-semibold text-on-surface ${!isEditing ? 'opacity-60' : ''}`}>
                  <input
                    type="checkbox"
                    checked={sameAsCurrentAddress}
                    onChange={(event) => handleSameAsCurrentAddressChange(event.target.checked)}
                    disabled={!isEditing}
                  />
                  Same as current address
                </label>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                <div className="md:col-span-2 xl:col-span-3">
                  <Field label="Address">
                    <textarea
                      name="permanentAddress"
                      value={form.permanentAddress}
                      onChange={handleChange}
                      disabled={!isEditing || sameAsCurrentAddress}
                      className={inputClassName(!isEditing || sameAsCurrentAddress, true)}
                    />
                  </Field>
                </div>
                <Field label="City">
                  <input name="permanentCity" value={form.permanentCity} onChange={handleChange} disabled={!isEditing || sameAsCurrentAddress} className={inputClassName(!isEditing || sameAsCurrentAddress)} />
                </Field>
                <Field label="District">
                  <input name="permanentDistrict" value={form.permanentDistrict} onChange={handleChange} disabled={!isEditing || sameAsCurrentAddress} className={inputClassName(!isEditing || sameAsCurrentAddress)} />
                </Field>
                <Field label="State">
                  <input name="permanentState" value={form.permanentState} onChange={handleChange} disabled={!isEditing || sameAsCurrentAddress} className={inputClassName(!isEditing || sameAsCurrentAddress)} />
                </Field>
                <Field label="Country">
                  <input name="permanentCountry" value={form.permanentCountry} onChange={handleChange} disabled={!isEditing || sameAsCurrentAddress} className={inputClassName(!isEditing || sameAsCurrentAddress)} />
                </Field>
                <Field label="Pincode">
                  <input name="permanentPincode" value={form.permanentPincode} onChange={handleChange} disabled={!isEditing || sameAsCurrentAddress} className={inputClassName(!isEditing || sameAsCurrentAddress)} />
                </Field>
              </div>
            </div>
          </div>
        </div>
      </SectionShell>
    );
  }

  function renderProfessionalSection() {
    return (
      <SectionShell
        title="Professional Details"
        subtitle="Position, reporting, schedule, and employment lifecycle information."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <Field label="Employee ID">
            <input name="employeeId" value={form.employeeId} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Employee Type">
            <select name="employeeType" value={form.employeeType} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)}>
              {EMPLOYEE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Date Of Joining">
            <input type="date" name="joinedOn" value={form.joinedOn} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Confirmation Date">
            <input type="date" name="confirmationDate" value={form.confirmationDate} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Department">
            <select name="department" value={form.department} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)}>
              <option value="">Select department</option>
              {(meta.departments || []).map((item: any) => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Division">
            <input name="division" value={form.division} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Designation">
            <div className="space-y-2">
              <select
                value={filteredDesignations.includes(form.designation) ? form.designation : (form.designation ? CUSTOM_DESIGNATION_VALUE : '')}
                onChange={(event) =>
                  handleChange({
                    target: {
                      name: 'designation',
                      value: event.target.value === CUSTOM_DESIGNATION_VALUE ? '' : event.target.value,
                    },
                  } as React.ChangeEvent<HTMLSelectElement>)
                }
                disabled={!isEditing}
                className={inputClassName(!isEditing)}
              >
                <option value="">Select designation</option>
                {filteredDesignations.map((designation: string) => (
                  <option key={designation} value={designation}>
                    {designation}
                  </option>
                ))}
                <option value={CUSTOM_DESIGNATION_VALUE}>Other, type manually</option>
              </select>
              <input
                list="employee-profile-designation-options"
                name="designation"
                value={form.designation}
                onChange={handleChange}
                disabled={!isEditing}
                className={inputClassName(!isEditing)}
                placeholder="Select or type designation"
              />
              {isEditing ? (
                <p className="text-xs text-on-surface-variant">
                  Select from dropdown, or choose &quot;Other&quot; and type a new designation.
                </p>
              ) : null}
              <datalist id="employee-profile-designation-options">
                {filteredDesignations.map((designation: string) => (
                  <option key={designation} value={designation} />
                ))}
              </datalist>
            </div>
          </Field>
          <Field label="Reporting To">
            <select name="reportingTo" value={form.reportingTo} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)}>
              <option value="">Manager not assigned</option>
              {superAdminOptions.length > 0 ? (
                <optgroup label="Super Admins">
                  {superAdminOptions.map((item: any) => (
                    <option key={`super-${item.id}`} value={`super_admin:${item.id}`}>
                      {item.name} {item.email ? `(${item.email})` : ''}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              <optgroup label="Employees">
                {reportingManagerOptions.map((item: any) => (
                  <option key={item.id} value={`employee:${item.id}`}>
                    {item.name} {item.employee_id ? `(${item.employee_id})` : ''}
                  </option>
                ))}
              </optgroup>
            </select>
          </Field>
          <Field label="Company">
            <input name="company" value={form.company} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Salary">
            <input name="salary" type="number" min="0" step="0.01" value={form.salary} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Referred By">
            <input name="referredBy" value={form.referredBy} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Experience Company Name">
            <input name="experienceCompanyName" value={form.experienceCompanyName} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Total Years Of Experience">
            <input name="totalExperience" value={form.totalExperience} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
           <Field label="Second Saturday Off">
            <select name="secondSaturdayOff" value={form.secondSaturdayOff} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)}>
              {YES_NO_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </Field>
          <Field label="Task Manager Access">
            <select name="taskManagerAccess" value={form.taskManagerAccess} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)}>
              {YES_NO_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </Field>
          <div className="md:col-span-2 xl:col-span-3">         <Field label="Working Schedule">
            {isEditing ? (
              <div className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-4">
                <div className="flex flex-wrap gap-2">
                  {(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const).map((day) => {
                    const checked = workingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setWorkingDays((prev) => checked ? prev.filter((d) => d !== day) : [...prev, day])}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          checked
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant hover:border-primary/40 hover:text-primary'
                        }`}
                      >
                        {checked ? <span className="material-symbols-outlined text-[15px]">check</span> : null}
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-on-surface-variant">
                  {workingDays.length > 0 ? `${workingDays.length} day(s) selected` : 'No working days selected'}
                </p>
              </div>
            ) : (
              <div className={inputClassName(true)}>
                {formatWorkingDays(workingDays)}
              </div>
            )}
          </Field>
</div>
        </div>
      </SectionShell>
    );
  }

  function renderIdentityFinanceSection() {
    return (
      <SectionShell
        title="Identity & Finance"
        subtitle="Compliance and bank details used for payroll and employee verification."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <Field label="Aadhaar Number">
            <input name="aadhaarNumber" value={form.aadhaarNumber} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="PAN Number">
            <input name="panNumber" value={form.panNumber} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Passport Number">
            <input name="passportNumber" value={form.passportNumber} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Bank Account Number">
            <input name="bankAccountNumber" value={form.bankAccountNumber} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Account Holder Name">
            <input name="bankAccountHolderName" value={form.bankAccountHolderName} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="IFSC Code">
            <input name="bankIfscCode" value={form.bankIfscCode} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Bank Name">
            <input name="bankName" value={form.bankName} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
        </div>
      </SectionShell>
    );
  }

  function renderEducationSection() {
    const educationRows = Array.isArray(employee?.education) ? employee.education : [];

    return (
      <SectionShell
        title="Educational Details"
        subtitle="Academic qualifications and educational records saved for this employee."
      >
        {educationRows.length === 0 ? (
          <div className="rounded-[1.25rem] border border-slate-200 bg-white px-6 py-10 text-center text-sm text-on-surface-variant">
            No educational details have been added for this employee yet.
          </div>
        ) : (
          <div className="space-y-4">
            {educationRows.map((entry: any, index: number) => (
              <div
                key={entry.id || `${entry.education_level || 'education'}-${index}`}
                className="relative rounded-[1.4rem] border border-slate-200 bg-white p-6"
              >
                {(() => {
                  const educationDocumentUrl = getEducationDocumentUrl(entry);
                  const educationKey = String(entry.id || `${entry.education_level || 'education'}-${index}`);
                  const selectedEducationFile = educationFiles[educationKey] || null;
                  const isEducationUploading = activeEducationId === educationKey;

                  return (
                    <>
                {educationDocumentUrl ? (
                  <a
                    href={educationDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute right-6 top-6 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-[#7c3aed] hover:text-[#7c3aed]"
                    title="View education document"
                    aria-label="View education document"
                  >
                    <span className="material-symbols-outlined text-[18px]">description</span>
                  </a>
                ) : null}

                <div className="flex flex-col gap-4 pr-12 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                      {formatEducationLevelLabel(entry.education_level)}
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-on-surface">
                      {entry.institution_name || 'Institution not provided'}
                    </h3>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {entry.board_university || 'Board / University not provided'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">Specialization</p>
                    <p className="mt-2 text-sm font-semibold text-on-surface">{entry.specialization || '--'}</p>
                  </div>
                  <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">Passing Year</p>
                    <p className="mt-2 text-sm font-semibold text-on-surface">{entry.passing_year || '--'}</p>
                  </div>
                  <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">Score</p>
                    <p className="mt-2 text-sm font-semibold text-on-surface">{entry.score || '--'}</p>
                  </div>
                  <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">Updated</p>
                    <p className="mt-2 text-sm font-semibold text-on-surface">
                      {toDisplayDate(entry.updated_at || entry.created_at)}
                    </p>
                  </div>
                </div>

                {educationDocumentUrl ? (
                  <div className="mt-5 rounded-[1rem] border border-slate-200 bg-slate-50/70 px-4 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                          Education Document
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-on-surface">
                          {getEducationDocumentLabel(entry)}
                        </p>
                      </div>
                      <a
                        href={educationDocumentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-[#7c3aed] hover:text-[#7c3aed]"
                      >
                        <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                        View Document
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[1rem] border border-dashed border-slate-300 bg-slate-50/70 px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700">
                          Education Document Missing
                        </p>
                        <p className="mt-1 text-sm text-on-surface-variant">
                          Upload the education document for this qualification.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:items-end">
                        <label className="flex min-w-0 max-w-[260px] cursor-pointer items-center justify-between gap-3 rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-on-surface">
                          <span className="truncate">
                            {selectedEducationFile?.name || 'Choose file to upload'}
                          </span>
                          <span className="material-symbols-outlined text-base">upload_file</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(event) => handleEducationFileChange(educationKey, event.target.files?.[0] || null)}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleEducationUpload(entry)}
                          disabled={isEducationUploading || !selectedEducationFile}
                          className="rounded-md border border-black bg-white px-3 py-1.5 text-[11px] font-semibold text-black transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isEducationUploading ? 'Uploading...' : 'Upload Document'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </SectionShell>
    );
  }

  function renderDocumentsSection() {
    return (
      <SectionShell
        title="Documents"
        subtitle="Keep each employee document in a simple card and replace files when needed."
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {documentSlots.map((slot) => {
              const item = slot.document;
              const isBusy = activeDocumentType === slot.key;
              const hasDocument = Boolean(item);

              return (
                <div
                  key={slot.key}
                  className="rounded-[1rem] border border-slate-200 bg-white px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center text-slate-500">
                        <span className="material-symbols-outlined text-[24px]">
                          {getDocumentIcon(slot.key, item?.file_name)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-on-surface">{slot.label}</p>
                        <p className={`mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${hasDocument ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {hasDocument ? 'Available' : 'Missing'}
                        </p>
                        <p className="mt-2 truncate text-xs text-on-surface-variant">
                          {hasDocument ? item?.file_name || 'Uploaded file' : 'Upload a file for this document slot.'}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] font-semibold text-on-surface-variant">
                        {hasDocument ? formatFileSize(item.file_size) : '--'}
                      </p>
                      <p className="mt-1 text-[11px] text-on-surface-variant">
                        {hasDocument ? toDisplayDate(item.updated_at || item.created_at) : '--'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <label className="flex min-w-0 max-w-[260px] cursor-pointer items-center justify-between gap-3 rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-on-surface">
                      <span className="truncate">
                        {slot.selectedFile?.name || (hasDocument ? 'Choose new file to replace' : 'Choose file to upload')}
                      </span>
                      <span className="material-symbols-outlined text-base">upload_file</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(event) => handleDocumentFileChange(slot.key, event.target.files?.[0] || null)}
                      />
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {hasDocument ? (
                        <a
                          href={item.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-black bg-white px-3 py-1.5 text-[11px] font-semibold text-black transition hover:bg-slate-50"
                        >
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                          View
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleDocumentUpload(slot.key)}
                        disabled={isBusy || !slot.selectedFile}
                        className="rounded-md border border-black bg-white px-3 py-1.5 text-[11px] font-semibold text-black transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isBusy ? 'Updating...' : hasDocument ? 'Update' : 'Upload'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </SectionShell>
    );
  }

  function renderLifecycleSection() {
    return (
      <SectionShell
        title="Lifecycle Summary"
        subtitle="Current lifecycle state, timeline dates, and access view for this employee."
      >
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(form.lifecycleStatus)}`}>
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              {formatStatus(form.lifecycleStatus)}
            </span>
            {form.currentStage && form.currentStage !== 'none' ? (
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${stageTone(form.currentStage)}`}>
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                {formatStatus(form.currentStage)}
              </span>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {form.employeeType === 'intern' ? (
              <div className="rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3 opacity-60">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Probation</p>
                <p className="mt-2 text-sm font-semibold text-on-surface">No Probation</p>
                <p className="mt-1 text-xs text-on-surface-variant">Exempt (Intern)</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Probation</p>
                <p className="mt-2 text-sm font-semibold text-on-surface">{DEFAULT_PROBATION_PERIOD_DAYS} days</p>
                <p className="mt-1 text-xs text-on-surface-variant">Ends {toDisplayDate(form.probationEndsAt)}</p>
              </div>
            )}
            <div className="rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Notice</p>
              <p className="mt-2 text-sm font-semibold text-on-surface">{form.noticePeriodDays ? `${form.noticePeriodDays} days` : 'Not started'}</p>
              <p className="mt-1 text-xs text-on-surface-variant">Starts {toDisplayDate(form.noticeStartedAt)}</p>
            </div>
            <div className="rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Separation</p>
              <p className="mt-2 text-sm font-semibold text-on-surface">{form.separatedAt ? toDisplayDate(form.separatedAt) : 'Not separated'}</p>
              <p className="mt-1 truncate text-xs text-on-surface-variant">{form.separationReason || 'No separation reason'}</p>
            </div>
            <div className="rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Access</p>
              <p className="mt-2 text-sm font-semibold text-on-surface">{form.accessDisabledAt ? 'Disabled' : 'Active'}</p>
              <p className="mt-1 text-xs text-on-surface-variant">{toDisplayDate(form.accessDisabledAt)}</p>
            </div>
          </div>
        </div>
      </SectionShell>
    );
  }

  const sections = [
    { id: 'personal', label: 'Personal Details' },
    { id: 'professional', label: 'Professional Details' },
    { id: 'education', label: 'Educational Details' },
    { id: 'identity', label: 'Identity & Finance' },
    { id: 'documents', label: 'Documents' },
    { id: 'lifecycle', label: 'Lifecycle Summary' },
  ];
  const activeSectionIndex = Math.max(
    sections.findIndex((section) => section.id === activeSection),
    0
  );

  let mainSection = renderPersonalSection();
  if (activeSection === 'professional') mainSection = renderProfessionalSection();
  if (activeSection === 'lifecycle') mainSection = renderLifecycleSection();
  if (activeSection === 'education') mainSection = renderEducationSection();
  if (activeSection === 'identity') mainSection = renderIdentityFinanceSection();
  if (activeSection === 'documents') mainSection = renderDocumentsSection();

  if (loading) {
    return (
      <div className={`${embedded ? 'w-full' : 'p-10 w-full'}`}>
        <div className="space-y-6 rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-sm">
          <LoadingPanel
            title="Loading employee profile"
            message="Personal details, documents, and professional records are being prepared."
            className="border-none bg-transparent px-0 py-0 shadow-none"
          />
          <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
            <Skeleton className="h-72 rounded-[1.6rem]" />
            <div className="space-y-4">
              <Skeleton className="h-12 rounded-2xl" />
              <Skeleton className="h-56 rounded-[1.6rem]" />
              <Skeleton className="h-56 rounded-[1.6rem]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!employeeId || !employee) {
    return (
      <div className={`${embedded ? 'w-full' : 'p-10 w-full'}`}>
        <div className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest px-8 py-20 text-center shadow-sm">
          <p className="text-2xl font-bold text-on-surface">Select an employee from the directory</p>
          <p className="mt-3 text-on-surface-variant">The detailed HR profile will open here for view, edit, status change, and record management.</p>
          {embedded ? null : (
            <button
              type="button"
              onClick={() => setCurrentTab?.('admin-employee-list')}
              className="mt-8 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-on-primary"
            >
              Back to Employee Directory
            </button>
          )}
        </div>
      </div>
    );
  }

  const lifecycleStatus = employee.resolved_employment_lifecycle_status || employee.employment_lifecycle_status;
  const currentStage = employee.resolved_current_stage || employee.current_stage || 'none';
  const probationStartDate = deriveProbationStartDate(currentStage, toInputDate(employee.date_of_joining), toInputDate(employee.probation_started_at));
  const probationEndDate = deriveProbationEndDate(currentStage, probationStartDate, toInputDate(employee.probation_ends_at));
  const todayDate = new Date().toISOString().slice(0, 10);
  const isProbationCompleted = currentStage === 'probation' && Boolean(probationEndDate) && probationEndDate < todayDate;

  return (
    <div className={`${embedded ? 'w-full space-y-6' : 'p-10 pb-14 w-full space-y-8'}`}>
      <section className="rounded-[1.6rem] border border-outline-variant/10 bg-surface-container-lowest px-7 py-6 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <div className="shrink-0">
              {employee.profile_picture_url ? (
                <Image src={employee.profile_picture_url} alt={employee.name || 'Employee'} width={156} height={156} className="h-[136px] w-[136px] rounded-[1.35rem] object-cover border border-slate-300 shadow-[0_10px_24px_rgba(15,23,42,0.08)]" unoptimized />
              ) : (
                <div className="flex h-[136px] w-[136px] items-center justify-center rounded-[1.35rem] border border-slate-300 bg-primary text-4xl font-extrabold text-on-primary shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
                  {getInitials(employee.name)}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <h1 className="text-[1.75rem] font-extrabold tracking-tight text-on-surface md:text-[1.9rem]">
                  {employee.name || 'Employee'}
                  <span className="ml-3 inline-flex align-middle rounded-full bg-surface-container-low px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-on-surface-variant">
                    {employee.employee_id || '--'}
                  </span>
                </h1>
              </div>
              <div className="space-y-2.5">
                <p className="text-lg font-semibold text-primary">
                  {employee.resolved_designation_title || employee.designation?.title || 'Designation not set'}
                  <span className="mx-2 text-on-surface-variant/40">|</span>
                  {employee.resolved_department_name || employee.department?.name || 'Department not set'}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-on-surface-variant">
                  <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base">call</span>{employee.resolved_phone_number || employee.phone || employee.mobile_phone || '--'}</span>
                  <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base">mail</span>{employee.email || '--'}</span>
                  <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base">account_tree</span>{formatReportingTarget(employee)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-on-surface-variant">
                  <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base">location_on</span>{[employee.city, employee.state].filter(Boolean).join(', ') || '--'}</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(lifecycleStatus)}`}>
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    {formatStatus(lifecycleStatus)}
                  </span>
                  {currentStage === 'probation' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {isProbationCompleted ? 'Probation Completed' : 'On Probation'}
                    </span>
                  ) : null}
                  {currentStage === 'notice_period' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                      <span className="material-symbols-outlined text-[14px]">event_upcoming</span>
                      On Notice
                    </span>
                  ) : null}
                </div>
                {currentStage === 'probation' ? (
                  <p className="text-xs font-medium text-violet-700">
                    Probation period end date: {toDisplayDate(probationEndDate)}
                  </p>
                ) : null}
                <p className="text-sm text-on-surface-variant">Created by <span className="font-semibold text-on-surface">{employee.created_by_name || 'HR Admin'}</span><span className="mx-2">•</span>Last updated {toDisplayDate(employee.updated_at)}</p>
              </div>
            </div>
          </div>

          <div className="w-full xl:w-auto xl:ml-auto">
            <div className="flex flex-col items-stretch gap-3 sm:flex-row xl:items-start">
              {!isEditing ? (
                <div className="flex flex-col items-stretch gap-1.5 xl:min-w-[148px]">
                  {currentStage === 'probation' ? (
                    <button
                      type="button"
                      onClick={() => openLifecycleDialog('remove_probation')}
                      disabled={saving || lifecycleStatus === 'separated' || !isProbationCompleted}
                      className="inline-flex items-center justify-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                      title={!isProbationCompleted ? `Available after ${toDisplayDate(probationEndDate)}` : 'Remove probation'}
                    >
                      <span className="material-symbols-outlined text-[15px]">assignment_turned_in</span>
                      Remove Probation
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => openLifecycleDialog('start_notice')}
                    disabled={saving || lifecycleStatus === 'separated'}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[15px]">notification_important</span>
                    Start Notice Period
                  </button>
                  <button
                    type="button"
                    onClick={() => openLifecycleDialog('mark_separation')}
                    disabled={saving || lifecycleStatus === 'separated'}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[15px]">person_off</span>
                    Mark Separation
                  </button>
                </div>
              ) : null}
              <div className="flex flex-col items-stretch gap-1.5 xl:min-w-[148px]">
                {embedded ? (
                  <button type="button" onClick={() => onBack?.()} className="inline-flex items-center justify-center gap-1.5 rounded-md border border-black bg-white px-3 py-1.5 text-[11px] font-semibold text-black transition hover:bg-slate-50">
                    <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                    Back
                  </button>
                ) : (
                  <button type="button" onClick={() => setCurrentTab?.('admin-employee-list')} className="inline-flex items-center justify-center gap-1.5 rounded-md border border-black bg-white px-3 py-1.5 text-[11px] font-semibold text-black transition hover:bg-slate-50">
                    <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                    Directory
                  </button>
                )}
                {isEditing ? (
                  <>
                    <button type="button" onClick={() => {
                      const nextForm = normalizeEmployeeToForm(employee);
                      setForm(nextForm);
                      setSameAsCurrentAddress(isPermanentAddressSameAsCurrent(nextForm));
                      setIsEditing(false);
                      setError('');
                      setMessage('');
                    }} className="inline-flex items-center justify-center gap-1.5 rounded-md border border-black bg-white px-3 py-1.5 text-[11px] font-semibold text-black transition hover:bg-slate-50">
                      <span className="material-symbols-outlined text-[14px]">close</span>
                      Cancel
                    </button>
                    <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center justify-center gap-1.5 rounded-md border border-black bg-white px-3 py-1.5 text-[11px] font-semibold text-black transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                      <span className="material-symbols-outlined text-[14px]">save</span>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setIsEditing(true)} className="inline-flex items-center justify-center gap-1.5 rounded-md border border-black bg-white px-3 py-1.5 text-[11px] font-semibold text-black transition hover:bg-slate-50">
                    <span className="material-symbols-outlined text-[14px]">edit_square</span>
                    Edit Employee
                  </button>
                )}
                <button type="button" onClick={() => handleStatusUpdate('inactive')} disabled={saving} className="inline-flex items-center justify-center gap-1.5 rounded-md border border-black bg-white px-3 py-1.5 text-[11px] font-semibold text-black transition hover:bg-slate-50 disabled:opacity-60">
                  <span className="material-symbols-outlined text-[14px]">pause_circle</span>
                  Mark Inactive
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="overflow-x-auto">
        <div
          className="relative inline-grid min-w-[900px] rounded-full bg-surface-container-low/70 p-1"
          style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}
        >
          <div
            className="absolute inset-y-1 rounded-full bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out"
            style={{
              width: `calc(${100 / sections.length}% - 0.4rem)`,
              transform: `translateX(calc(${activeSectionIndex * 100}% + ${activeSectionIndex * (0.4 / sections.length)}rem + 0.2rem))`,
            }}
          />
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`relative z-10 whitespace-nowrap rounded-full px-5 py-3 text-sm font-semibold transition ${
                activeSection === section.id ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
        <div>{mainSection}</div>
        <aside className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-sm xl:sticky xl:top-8">
          <h2 className="text-2xl font-bold text-on-surface">Employee Details</h2>
          <div className="mt-6 space-y-5">
            {summaryItems.map((item) => (
              <div key={item.label} className="border-b border-outline-variant/10 pb-4 last:border-b-0 last:pb-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{item.label}</p>
                <p className="mt-2 text-base font-semibold text-on-surface">{item.value || '--'}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {lifecycleDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-[1.8rem] border border-outline-variant/10 bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-on-surface">
                  {lifecycleDialog.type === 'remove_probation'
                    ? 'Remove Probation'
                    : lifecycleDialog.type === 'start_notice'
                      ? 'Start Notice Period'
                      : 'Mark Separation'}
                </h3>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {lifecycleDialog.type === 'remove_probation'
                    ? 'Choose the effective date when probation was completed or removed.'
                    : lifecycleDialog.type === 'start_notice'
                      ? 'Save the agreed notice start date and notice period days.'
                      : 'Save the employee separation date and reason.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLifecycleDialog(null)}
                className="rounded-full border border-outline-variant/15 bg-white p-2 text-on-surface-variant transition hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <Field label="Effective Date">
                <input
                  type="date"
                  value={lifecycleDialog.effectiveDate}
                  onChange={(event) => setLifecycleDialog((current) => current ? { ...current, effectiveDate: event.target.value } : current)}
                  className={inputClassName(false)}
                />
              </Field>

              {lifecycleDialog.type === 'start_notice' ? (
                <Field label="Notice Period (days)">
                  <select
                    value={lifecycleDialog.noticePeriodDays}
                    onChange={(event) => setLifecycleDialog((current) => current ? { ...current, noticePeriodDays: event.target.value } : current)}
                    className={inputClassName(false)}
                  >
                    {NOTICE_PERIOD_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option} days</option>
                    ))}
                  </select>
                </Field>
              ) : null}

              {lifecycleDialog.type === 'mark_separation' ? (
                <>
                  <Field label="Separation Reason Code">
                    <select
                      value={lifecycleDialog.separationReasonCode}
                      onChange={(event) => setLifecycleDialog((current) => current ? { ...current, separationReasonCode: event.target.value } : current)}
                      className={inputClassName(false)}
                    >
                      <option value="">Select reason</option>
                      {SEPARATION_REASON_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Separation Reason">
                    <textarea
                      value={lifecycleDialog.separationReason}
                      onChange={(event) => setLifecycleDialog((current) => current ? { ...current, separationReason: event.target.value } : current)}
                      className={inputClassName(false, true)}
                    />
                  </Field>
                </>
              ) : null}
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setLifecycleDialog(null)}
                className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-2.5 text-sm font-semibold text-on-surface-variant"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitLifecycleDialog}
                disabled={saving || !lifecycleDialog.effectiveDate}
                className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Lifecycle Action'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
