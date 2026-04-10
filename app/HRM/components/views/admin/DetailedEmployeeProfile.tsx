'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  CURRENT_STAGE_OPTIONS,
  EMPLOYEE_TYPE_OPTIONS,
  EMPLOYMENT_LIFECYCLE_STATUS_OPTIONS,
  formatEmploymentValue,
  getEmployeeTypeLabel,
} from '@/utils/hrm-employment';

const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const RESIDENTIAL_STATUS_OPTIONS = ['Resident', 'Non-Resident', 'Resident but Not Ordinarily Resident'];
const RELIGION_OPTIONS = ['Hindu', 'Muslim', 'Sikh', 'Christian', 'Buddhist', 'Jain', 'Parsi', 'Other'];
const YES_NO_OPTIONS = ['Yes', 'No'];
const PROBATION_PERIOD_OPTIONS = ['90', '180'];
const NOTICE_PERIOD_OPTIONS = ['30', '90', '180'];
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
  bloodGroup: '',
  fatherName: '',
  maritalStatus: '',
  marriageDate: '',
  spouseName: '',
  nationality: '',
  residentialStatus: '',
  placeOfBirth: '',
  countryOfOrigin: '',
  religion: '',
  isInternational: 'No',
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
  joinedOn: '',
  confirmationDate: '',
  employeeType: 'full_time_employee',
  lifecycleStatus: 'active',
  currentStage: 'none',
  probationPeriodDays: '',
  noticePeriodDays: '',
  referredBy: '',
  currentCompanyExperience: '',
  salary: '',
  previousExperience: '',
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
  if (normalized === 'terminated') return 'bg-rose-50 text-rose-700 border-rose-200';
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
  const name = employee?.reporting_manager_name || 'Not assigned';
  const kind = employee?.reporting_manager_kind || '';

  if (!employee?.reporting_manager_name) {
    return name;
  }

  if (kind === 'super_admin') {
    return `${name} (Super Admin)`;
  }

  return name;
}

function normalizeEmployeeToForm(employee: any) {
  const access = Array.isArray(employee?.module_access) ? employee.module_access[0] : employee?.module_access;

  return {
    employeeId: employee?.employee_id || '',
    name: employee?.name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    personalEmail: employee?.personal_email || '',
    dateOfBirth: toInputDate(employee?.date_of_birth),
    bloodGroup: employee?.blood_group || '',
    fatherName: employee?.father_name || '',
    maritalStatus: employee?.marital_status || '',
    marriageDate: toInputDate(employee?.marriage_date),
    spouseName: employee?.spouse_name || '',
    nationality: employee?.nationality || '',
    residentialStatus: employee?.residential_status || '',
    placeOfBirth: employee?.place_of_birth || '',
    countryOfOrigin: employee?.country_of_origin || '',
    religion: employee?.religion || '',
    isInternational: toYesNo(employee?.is_international),
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
    joinedOn: toInputDate(employee?.date_of_joining),
    confirmationDate: toInputDate(employee?.confirmation_date),
    employeeType: employee?.resolved_employee_type || employee?.employee_type || 'full_time_employee',
    lifecycleStatus: employee?.resolved_employment_lifecycle_status || employee?.employment_lifecycle_status || 'active',
    currentStage: employee?.resolved_current_stage || employee?.current_stage || 'none',
    probationPeriodDays: employee?.probation_period_days ? String(employee.probation_period_days) : '',
    noticePeriodDays: employee?.notice_period_days ? String(employee.notice_period_days) : '',
    referredBy: employee?.referred_by || '',
    currentCompanyExperience: employee?.current_company_experience || '',
    salary: employee?.salary !== undefined && employee?.salary !== null ? String(employee.salary) : '',
    previousExperience: employee?.previous_experience || '',
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
}: {
  employeeId?: string | null;
  setCurrentTab?: (tab: string) => void;
}) {
  const [employee, setEmployee] = useState<any>(null);
  const [form, setForm] = useState(defaultForm);
  const [meta, setMeta] = useState<any>({ employees: [], departments: [], designations: [] });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [sameAsCurrentAddress, setSameAsCurrentAddress] = useState(false);
  const [saving, setSaving] = useState(false);
  const [documentFiles, setDocumentFiles] = useState<Record<string, File | null>>({});
  const [activeDocumentType, setActiveDocumentType] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('personal');

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
        setSameAsCurrentAddress(isPermanentAddressSameAsCurrent(nextForm));
        setMeta({
          employees: result.employeeOptions || result.employees || [],
          superAdmins: result.superAdminOptions || [],
          departments: result.departments || [],
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

  const reportingManagerOptions = useMemo(() => {
    return (meta.employees || []).filter((item: any) => item.id !== employee?.id);
  }, [employee?.id, meta.employees]);

  const superAdminOptions = useMemo(() => meta.superAdmins || [], [meta.superAdmins]);

  const filteredDesignations = useMemo(() => {
    const selectedDepartment = (meta.departments || []).find((item: any) => item.name === form.department);
    if (!selectedDepartment?.id) {
      return meta.designations || [];
    }

    return (meta.designations || []).filter(
      (item: any) => !item.department_id || item.department_id === selectedDepartment.id
    );
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
    () => [
      { label: 'Employee Type', value: getEmployeeTypeLabel(employee?.resolved_employee_type || employee?.employee_type) },
      { label: 'Lifecycle Status', value: formatStatus(employee?.resolved_employment_lifecycle_status || employee?.employment_lifecycle_status) },
      { label: 'Current Stage', value: formatStatus(employee?.resolved_current_stage || employee?.current_stage) },
      { label: 'Department', value: employee?.resolved_department_name || employee?.department?.name || '--' },
      { label: 'Designation', value: employee?.resolved_designation_title || employee?.designation?.title || '--' },
      { label: 'Reporting To', value: formatReportingTarget(employee) },
      { label: 'Created By', value: employee?.created_by_name || 'HR Admin' },
      { label: 'Date Of Joining', value: toDisplayDate(employee?.date_of_joining) },
      { label: 'Salary', value: employee?.salary !== null && employee?.salary !== undefined ? `INR ${employee.salary}` : '--' },
      { label: 'Task Manager', value: form.taskManagerAccess === 'Yes' ? 'Enabled' : 'Disabled' },
    ],
    [employee, form.taskManagerAccess]
  );

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(sameAsCurrentAddress && CURRENT_TO_PERMANENT_FIELD_MAP[name]
        ? { [CURRENT_TO_PERMANENT_FIELD_MAP[name]]: value }
        : {}),
      ...(name === 'lifecycleStatus' && value === 'terminated' ? { currentStage: 'none' } : {}),
    }));
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
      setSameAsCurrentAddress(isPermanentAddressSameAsCurrent(nextForm));
      setIsEditing(false);
      setMessage('Employee details updated successfully.');
    } catch (requestError: any) {
      setError(requestError?.message || 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusUpdate(nextStatus: string) {
    if (!employee?.id) return;
    const confirmed = window.confirm(`Mark this employee as ${formatStatus(nextStatus)}?`);
    if (!confirmed) return;

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
        ...(nextStatus === 'terminated' ? { currentStage: 'none' } : {}),
      }));
      setMessage(`Employee marked as ${formatStatus(nextStatus)}.`);
    } catch (requestError: any) {
      setError(requestError?.message || 'Failed to update employee status');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!employee?.id) return;
    const confirmed = window.confirm('Delete this employee record permanently?');
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

  async function handleDocumentDelete(documentType: string) {
    if (!employee?.id) return;

    const confirmed = window.confirm('Delete this document? This will remove it from storage and the database.');
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
          <Field label="Marriage Date">
            <input type="date" name="marriageDate" value={form.marriageDate} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Spouse Name">
            <input name="spouseName" value={form.spouseName} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Nationality">
            <input name="nationality" value={form.nationality} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Residential Status">
            <select name="residentialStatus" value={form.residentialStatus} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)}>
              <option value="">Select residential status</option>
              {RESIDENTIAL_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </Field>
          <Field label="Place Of Birth">
            <input name="placeOfBirth" value={form.placeOfBirth} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Country Of Origin">
            <input name="countryOfOrigin" value={form.countryOfOrigin} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Religion">
            <select name="religion" value={form.religion} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)}>
              <option value="">Select religion</option>
              {RELIGION_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </Field>
          <Field label="International Employee">
            <select name="isInternational" value={form.isInternational} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)}>
              {YES_NO_OPTIONS.map((option) => (
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
          <div className="md:col-span-2 xl:col-span-3 mt-2">
            <div className="rounded-[1.5rem] border border-outline-variant/10 bg-surface-container-low px-5 py-5">
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
            <div className="rounded-[1.5rem] border border-outline-variant/10 bg-surface-container-low px-5 py-5">
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
          <Field label="Lifecycle Status">
            <select name="lifecycleStatus" value={form.lifecycleStatus} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)}>
              {EMPLOYMENT_LIFECYCLE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Current Stage">
            <select name="currentStage" value={form.currentStage} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)}>
              {CURRENT_STAGE_OPTIONS.map((option) => (
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
          <Field label="Probation Period (days)">
            <select name="probationPeriodDays" value={form.probationPeriodDays} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)}>
              <option value="">Select probation period</option>
              {PROBATION_PERIOD_OPTIONS.map((option) => (
                <option key={option} value={option}>{option} days</option>
              ))}
            </select>
          </Field>
          <Field label="Notice Period (days)">
            <select name="noticePeriodDays" value={form.noticePeriodDays} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)}>
              <option value="">Select notice period</option>
              {NOTICE_PERIOD_OPTIONS.map((option) => (
                <option key={option} value={option}>{option} days</option>
              ))}
            </select>
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
            <select name="designation" value={form.designation} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)}>
              <option value="">Select designation</option>
              {filteredDesignations.map((item: any) => (
                <option key={item.id} value={item.title}>{item.title}</option>
              ))}
            </select>
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
          <Field label="Company Experience">
            <input name="currentCompanyExperience" value={form.currentCompanyExperience} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Previous Experience">
            <input name="previousExperience" value={form.previousExperience} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Total Experience">
            <input name="totalExperience" value={form.totalExperience} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
          </Field>
          <Field label="Working Schedule">
            <input name="workingScheduleLabel" value={form.workingScheduleLabel} onChange={handleChange} disabled={!isEditing} className={inputClassName(!isEditing)} />
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

  function renderDocumentsSection() {
    return (
      <SectionShell
        title="Documents & Record Snapshot"
        subtitle="See all required document slots and upload, replace, or delete files from one simple panel."
      >
        <div className="space-y-5">
          <div className="rounded-[1.75rem] border border-outline-variant/10 bg-white/85 p-6 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/75">Employee Documents</p>
                <h3 className="mt-2 text-2xl font-bold text-on-surface">All required employee documents</h3>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Every required document stays visible here, including missing ones, so HR can upload or replace them anytime.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:min-w-[360px] lg:grid-cols-3">
                <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Uploaded</p>
                  <p className="mt-2 text-lg font-bold text-on-surface">{documentSummary.totalDocuments}</p>
                </div>
                <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Storage</p>
                  <p className="mt-2 text-lg font-bold text-on-surface">{documentSummary.totalSizeLabel}</p>
                </div>
                <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest px-4 py-3 col-span-2 lg:col-span-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Latest Update</p>
                  <p className="mt-2 text-lg font-bold text-on-surface">{documentSummary.latestUpdatedLabel}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {documentSlots.map((slot) => {
              const item = slot.document;
              const isBusy = activeDocumentType === slot.key;
              const hasDocument = Boolean(item);

              return (
                <div
                  key={slot.key}
                  className="rounded-[1.5rem] border border-outline-variant/10 bg-white p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.18)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${hasDocument ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <span className="material-symbols-outlined text-[24px]">
                          {getDocumentIcon(slot.key, item?.file_name)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full bg-primary/8 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                            {slot.label}
                          </span>
                          <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${hasDocument ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-amber-200 bg-amber-50 text-amber-700'}`}>
                            {hasDocument ? 'Uploaded' : 'Missing'}
                          </span>
                        </div>
                        <h4 className="mt-3 break-words text-lg font-bold text-on-surface">
                          {item?.file_name || 'No file uploaded yet'}
                        </h4>
                        <p className="mt-1 text-sm text-on-surface-variant">
                          {hasDocument
                            ? `Updated ${toDisplayDate(item.updated_at || item.created_at)}`
                            : 'Upload this required document for the employee record.'}
                        </p>
                      </div>
                    </div>
                    {hasDocument ? (
                      <a
                        href={item.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-outline-variant/10 bg-surface-container-lowest text-on-surface-variant transition hover:border-primary/20 hover:text-primary"
                      >
                        <span className="material-symbols-outlined">open_in_new</span>
                      </a>
                    ) : null}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-surface-container-lowest px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">File Size</p>
                      <p className="mt-1 text-sm font-semibold text-on-surface">{hasDocument ? formatFileSize(item.file_size) : '--'}</p>
                    </div>
                    <div className="rounded-2xl bg-surface-container-lowest px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">Updated</p>
                      <p className="mt-1 text-sm font-semibold text-on-surface">
                        {hasDocument ? toDisplayDate(item.updated_at || item.created_at) : '--'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest px-4 py-4">
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-outline-variant/20 bg-white px-4 py-3 text-sm font-semibold text-on-surface">
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

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleDocumentUpload(slot.key)}
                        disabled={isBusy || !slot.selectedFile}
                        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isBusy ? 'Saving...' : hasDocument ? 'Replace' : 'Upload'}
                      </button>
                      {hasDocument ? (
                        <button
                          type="button"
                          onClick={() => handleDocumentDelete(slot.key)}
                          disabled={isBusy}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-[1.75rem] border border-outline-variant/10 bg-white/85 p-6 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.3)] backdrop-blur">
            <h3 className="text-lg font-bold text-on-surface">Quick Facts</h3>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-outline-variant/10 bg-surface-container-lowest px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Created On</p>
                <p className="mt-2 text-base font-semibold text-on-surface">{toDisplayDate(employee?.created_at)}</p>
              </div>
              <div className="rounded-[1.5rem] border border-outline-variant/10 bg-surface-container-lowest px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Last Updated</p>
                <p className="mt-2 text-base font-semibold text-on-surface">{toDisplayDate(employee?.updated_at)}</p>
              </div>
              <div className="rounded-[1.5rem] border border-outline-variant/10 bg-surface-container-lowest px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Working Days</p>
                <p className="mt-2 text-base font-semibold text-on-surface">
                  {Array.isArray(employee?.working_days) && employee.working_days.length
                    ? employee.working_days.join(', ')
                    : '--'}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-outline-variant/10 bg-surface-container-lowest px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Document Count</p>
                <p className="mt-2 text-base font-semibold text-on-surface">{documentSummary.totalDocuments}</p>
              </div>
              <div className="rounded-[1.5rem] border border-outline-variant/10 bg-surface-container-lowest px-4 py-4 sm:col-span-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Employee UUID</p>
                <p className="mt-2 break-all text-sm font-medium text-on-surface">{employee?.id || '--'}</p>
              </div>
            </div>
          </div>
        </div>
      </SectionShell>
    );
  }

  const sections = [
    { id: 'personal', label: 'Personal Details' },
    { id: 'professional', label: 'Professional Details' },
    { id: 'identity', label: 'Identity & Finance' },
    { id: 'documents', label: 'Documents' },
  ];

  let mainSection = renderPersonalSection();
  if (activeSection === 'professional') mainSection = renderProfessionalSection();
  if (activeSection === 'identity') mainSection = renderIdentityFinanceSection();
  if (activeSection === 'documents') mainSection = renderDocumentsSection();

  if (loading) {
    return (
      <div className="p-10 w-full">
        <div className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest px-8 py-20 text-center text-on-surface-variant shadow-sm">
          Loading employee profile...
        </div>
      </div>
    );
  }

  if (!employeeId || !employee) {
    return (
      <div className="p-10 w-full">
        <div className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest px-8 py-20 text-center shadow-sm">
          <p className="text-2xl font-bold text-on-surface">Select an employee from the directory</p>
          <p className="mt-3 text-on-surface-variant">The detailed HR profile will open here for view, edit, status change, and record management.</p>
          <button
            type="button"
            onClick={() => setCurrentTab?.('admin-employee-list')}
            className="mt-8 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-on-primary"
          >
            Back to Employee Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 pb-14 w-full space-y-8">
      <section className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest px-8 py-8 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-8">
          <div className="flex flex-col lg:flex-row gap-6 lg:items-center">
            <button type="button" onClick={() => setCurrentTab?.('admin-employee-list')} className="flex h-12 w-12 items-center justify-center rounded-2xl border border-outline-variant/10 bg-surface text-on-surface-variant transition hover:border-primary/20 hover:text-primary">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="flex flex-col md:flex-row md:items-center gap-5">
              {employee.profile_picture_url ? (
                <Image src={employee.profile_picture_url} alt={employee.name || 'Employee'} width={112} height={112} className="h-28 w-28 rounded-[2rem] object-cover border border-outline-variant/10 shadow-sm" unoptimized />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] bg-primary text-3xl font-extrabold text-on-primary shadow-lg shadow-primary/15">
                  {getInitials(employee.name)}
                </div>
              )}
              <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-extrabold tracking-tight text-on-surface">{employee.employee_id || '--'} - {employee.name || 'Employee'}</h1>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${statusTone(employee.resolved_employment_lifecycle_status || employee.employment_lifecycle_status)}`}>
                    {formatStatus(employee.resolved_employment_lifecycle_status || employee.employment_lifecycle_status)}
                  </span>
                  {(employee.resolved_current_stage || employee.current_stage) && (employee.resolved_current_stage || employee.current_stage) !== 'none' ? (
                    <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${stageTone(employee.resolved_current_stage || employee.current_stage)}`}>
                      {formatStatus(employee.resolved_current_stage || employee.current_stage)}
                    </span>
                  ) : null}
                </div>
                <p className="text-lg font-semibold text-primary">
                  {employee.resolved_designation_title || employee.designation?.title || 'Designation not set'}
                  <span className="mx-2 text-on-surface-variant/40">|</span>
                  {employee.resolved_department_name || employee.department?.name || 'Department not set'}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-on-surface-variant">
                  <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base">call</span>{employee.resolved_phone_number || employee.phone || employee.mobile_phone || '--'}</span>
                  <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base">mail</span>{employee.email || '--'}</span>
                  <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base">account_tree</span>{formatReportingTarget(employee)}</span>
                  <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base">location_on</span>{[employee.city, employee.state].filter(Boolean).join(', ') || '--'}</span>
                </div>
                <p className="text-sm text-on-surface-variant">Created by <span className="font-semibold text-on-surface">{employee.created_by_name || 'HR Admin'}</span><span className="mx-2">•</span>Last updated {toDisplayDate(employee.updated_at)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {isEditing ? (
              <>
                <button type="button" onClick={() => {
                  const nextForm = normalizeEmployeeToForm(employee);
                  setForm(nextForm);
                  setSameAsCurrentAddress(isPermanentAddressSameAsCurrent(nextForm));
                  setIsEditing(false);
                  setError('');
                  setMessage('');
                }} className="rounded-2xl border border-outline-variant/15 bg-white px-5 py-3 text-sm font-bold text-on-surface">
                  Cancel
                </button>
                <button type="button" onClick={handleSave} disabled={saving} className="rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setIsEditing(true)} className="rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-on-primary shadow-lg shadow-primary/20">
                Edit Employee
              </button>
            )}
            <button type="button" onClick={() => handleStatusUpdate('inactive')} disabled={saving} className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-700 disabled:opacity-60">Mark Inactive</button>
            <button type="button" onClick={() => handleStatusUpdate('terminated')} disabled={saving} className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700 disabled:opacity-60">Terminate</button>
            <button type="button" onClick={handleDelete} disabled={saving} className="rounded-2xl border border-outline-variant/15 bg-white px-5 py-3 text-sm font-bold text-on-surface-variant disabled:opacity-60">Delete</button>
          </div>
        </div>
      </section>

      <div className="flex gap-3 overflow-x-auto rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest px-5 py-4 shadow-sm">
        {sections.map((section) => (
          <button key={section.id} type="button" onClick={() => setActiveSection(section.id)} className={`whitespace-nowrap rounded-2xl px-5 py-3 text-sm font-bold transition ${activeSection === section.id ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'bg-surface text-on-surface-variant hover:text-on-surface'}`}>
            {section.label}
          </button>
        ))}
      </div>

      {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">{message}</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">{error}</div>}

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
    </div>
  );
}
