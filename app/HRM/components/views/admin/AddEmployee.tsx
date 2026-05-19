'use client';

import React, { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  EMPLOYEE_TYPE_OPTIONS,
} from '@/utils/hrm-employment';
import { DEFAULT_PROBATION_PERIOD_DAYS } from '@/utils/employee-lifecycle';
import { useHrmFeedback } from '../../ui/HrmFeedback';

type Option = {
  id: string;
  name?: string;
  title?: string;
  employee_id?: string;
  email?: string;
  department_id?: string;
  auth_user_id?: string;
  optionType?: 'employee' | 'super_admin';
};

type EducationEntry = {
  educationLevel: string;
  institutionName: string;
  boardUniversity: string;
  specialization: string;
  passingYear: string;
  score: string;
  file: File | null;
};

type CertificationEntry = {
  id: string;
  certificationName: string;
  issuer: string;
  issuedYear: string;
  file: File | null;
};

type DocumentState = Record<string, File | null>;
type ErrorMap = Record<string, string>;
type SectionErrorMap = Record<string, string>;

type FormState = {
  employeeId: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  taskManagerAccess: string;
  profilePicture: File | null;
  personalEmail: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  fatherName: string;
  maritalStatus: string;
  spouseName: string;
  nationality: string;
  religion: string;
  isPhysicallyChallenged: string;
  address: string;
  city: string;
  district: string;
  state: string;
  country: string;
  pincode: string;
  permanentAddress: string;
  permanentCity: string;
  permanentDistrict: string;
  permanentState: string;
  permanentCountry: string;
  permanentPincode: string;
  phone2: string;
  mobile: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  joinedOn: string;
  confirmationDate: string;
  employeeType: string;
  lifecycleStatus: string;
  currentStage: string;
  probationPeriodDays: string;
  noticePeriodDays: string;
  referredBy: string;
  currentCompanyExperience: string;
  salary: string;
  previousExperience: string;
  totalExperience: string;
  department: string;
  division: string;
  designation: string;
  reportingTo: string;
  company: string;
  workingScheduleLabel: string;
  secondSaturdayOff: string;
  aadhaarNumber: string;
  panNumber: string;
  passportNumber: string;
  bankAccountNumber: string;
  bankAccountHolderName: string;
  bankIfscCode: string;
  bankName: string;
};

const WORKING_DAY_PRESETS = [
  { label: 'Monday to Friday', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
  { label: 'Monday to Saturday', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
  { label: 'Monday to Half Saturday', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
  { label: 'Custom', days: [] },
];

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'others', label: 'Others' },
];
const RELIGION_OPTIONS = ['Hindu', 'Muslim', 'Sikh', 'Christian', 'Buddhist', 'Jain', 'Parsi', 'Other'];
const FIXED_DEPARTMENT_OPTIONS = [
  'Finance & Accounts',
  'Marketing',
  'Cyber Security',
  'Artificial Intelligence',
  'Information Technology',
  'Human Resource',
];
const DEPARTMENT_DESIGNATION_SUGGESTIONS: Record<string, string[]> = {
  'Human Resource': ['Manager', 'HR Manager', 'HR Executive', 'HR Recruiter', 'Talent Acquisition Executive'],
  'Finance & Accounts': ['Manager', 'Accounts Manager', 'Account Manager', 'Accountant', 'Finance Executive'],
  Marketing: ['Manager', 'Marketing Manager', 'Digital Marketing Executive', 'SEO Executive', 'Brand Executive'],
  'Cyber Security': ['Manager', 'Security Manager', 'Security Analyst', 'Cyber Security Analyst', 'Compliance Analyst'],
  'Artificial Intelligence': ['Manager', 'AI Manager', 'AI Engineer', 'ML Engineer', 'Data Scientist'],
  'Information Technology': ['Manager', 'IT Manager', 'Software Developer', 'Frontend Developer', 'Backend Developer'],
};

const DOCUMENT_TYPES = [
  { key: 'aadhaar_card', label: 'Aadhaar Card' },
  { key: 'pan_card', label: 'PAN Card' },
  { key: 'passport', label: 'Passport' },
  { key: 'appointment_letter', label: 'Appointment Letter (Previous Organisation)' },
  { key: 'experience_letter', label: 'Experience Letter' },
  { key: 'salary_slip', label: 'Salary Slip' },
];
const PROFILE_PICTURE_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PROFILE_PICTURE_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const EMPLOYEE_FILE_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const EMPLOYEE_FILE_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
const PROFILE_PICTURE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const EMPLOYEE_FILE_MAX_SIZE_BYTES = 10 * 1024 * 1024;
const TOTAL_UPLOAD_MAX_SIZE_BYTES = 30 * 1024 * 1024;

const defaultEducation = (): EducationEntry[] => [
  { educationLevel: '10th', institutionName: '', boardUniversity: '', specialization: '', passingYear: '', score: '', file: null },
  { educationLevel: '12th', institutionName: '', boardUniversity: '', specialization: '', passingYear: '', score: '', file: null },
  { educationLevel: 'graduation', institutionName: '', boardUniversity: '', specialization: '', passingYear: '', score: '', file: null },
  { educationLevel: 'post_graduation', institutionName: '', boardUniversity: '', specialization: '', passingYear: '', score: '', file: null },
];

const defaultFormState: FormState = {
  employeeId: '',
  name: '',
  email: '',
  password: '',
  phone: '',
  taskManagerAccess: 'Yes',
  profilePicture: null,
  personalEmail: '',
  dateOfBirth: '',
  gender: '',
  bloodGroup: '',
  fatherName: '',
  maritalStatus: '',
  spouseName: '',
  nationality: 'Indian',
  religion: '',
  isPhysicallyChallenged: 'No',
  address: '',
  city: '',
  district: '',
  state: '',
  country: 'India',
  pincode: '',
  permanentAddress: '',
  permanentCity: '',
  permanentDistrict: '',
  permanentState: '',
  permanentCountry: 'India',
  permanentPincode: '',
  phone2: '',
  mobile: '',
  emergencyContactName: '',
  emergencyContactNumber: '',
  joinedOn: '',
  confirmationDate: '',
  employeeType: 'full_time_employee',
  lifecycleStatus: 'active',
  currentStage: 'probation',
  probationPeriodDays: String(DEFAULT_PROBATION_PERIOD_DAYS),
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
  workingScheduleLabel: 'Monday to Friday',
  secondSaturdayOff: 'No',
  aadhaarNumber: '',
  panNumber: '',
  passportNumber: '',
  bankAccountNumber: '',
  bankAccountHolderName: '',
  bankIfscCode: '',
  bankName: '',
};

const CUSTOM_DESIGNATION_VALUE = '__custom_designation__';

function Section({
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

function Field({
  label,
  required = false,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
        {label}
        {required ? <span className="ml-1 text-rose-600">*</span> : null}
      </span>
      {children}
      {error ? <span className="text-sm font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}

function inputClassName(multiline = false, hasError = false) {
  return `w-full rounded-2xl border ${hasError ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-300 bg-white focus:border-slate-900 focus:ring-slate-200'} px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 ${multiline ? 'min-h-[120px] resize-y' : ''}`;
}

function getSuggestedDesignations(departmentName: string, designations: Option[]) {
  const normalizedDepartment = String(departmentName || '').trim();
  const curated = DEPARTMENT_DESIGNATION_SUGGESTIONS[normalizedDepartment] || [];
  const apiOptions = designations
    .map((designation) => String(designation.title || '').trim())
    .filter(Boolean);

  return [...new Set([...curated, ...apiOptions])].sort((left, right) => left.localeCompare(right));
}

function selectClassName(hasError = false) {
  return `w-full rounded-2xl border ${hasError ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-300 bg-white focus:border-slate-900 focus:ring-slate-200'} px-4 py-3 text-sm text-slate-900 outline-none transition`;
}

function fileButtonClassName(hasError = false) {
  return `inline-flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border ${hasError ? 'border-rose-400 bg-rose-50 text-rose-700 hover:border-rose-500 hover:bg-rose-100/70' : 'border-slate-300 bg-slate-50 text-slate-800 hover:border-slate-500 hover:bg-slate-100'} px-4 py-3 text-sm font-semibold transition`;
}

function compactUploadCardClassName(hasError = false, hasFile = false) {
  if (hasError) {
    return 'group flex min-h-[188px] w-full cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-rose-300 bg-rose-50/70 px-5 py-6 text-center transition hover:border-rose-400 hover:bg-rose-100/70';
  }

  if (hasFile) {
    return 'group flex min-h-[188px] w-full cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-emerald-300 bg-emerald-50/70 px-5 py-6 text-center transition hover:border-emerald-400 hover:bg-emerald-100/70';
  }

  return 'group flex min-h-[188px] w-full cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/80 px-5 py-6 text-center transition hover:border-slate-400 hover:bg-white';
}

function UploadArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <path
        d="M12 16V8m0 0-3 3m3-3 3 3M6 16.5v.75A1.75 1.75 0 0 0 7.75 19h8.5A1.75 1.75 0 0 0 18 17.25v-.75"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CompactUploadField({
  id,
  name,
  accept,
  title,
  helperText,
  file,
  error,
  onChange,
}: {
  id: string;
  name?: string;
  accept: string;
  title: string;
  helperText: string;
  file: File | null;
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const hasFile = Boolean(file);

  return (
    <label htmlFor={id} className={compactUploadCardClassName(!!error, hasFile)}>
      <span className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${error ? 'bg-rose-100 text-rose-700' : hasFile ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'} transition group-hover:scale-[1.02]`}>
        <UploadArrowIcon />
      </span>
      <span className="text-sm font-semibold text-slate-900">
        {hasFile ? file?.name : title}
      </span>
      <span className="mt-2 text-xs text-slate-500">{helperText}</span>
      <input
        id={id}
        name={name}
        type="file"
        className="hidden"
        accept={accept}
        onChange={onChange}
      />
    </label>
  );
}

function SectionError({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{message}</div>;
}

function getFileExtension(fileName: string) {
  const normalized = String(fileName || '').trim();
  if (!normalized.includes('.')) return '';
  return normalized.split('.').pop()?.toLowerCase() || '';
}

function formatMaxSize(maxSizeBytes: number) {
  return `${Math.round((maxSizeBytes / (1024 * 1024)) * 10) / 10} MB`;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isDigitsOnly(value: string) {
  return /^\d+$/.test(value.trim());
}

function isAlphaText(value: string) {
  return /^[A-Za-z][A-Za-z\s.'-]*$/.test(value.trim());
}

function isAlphaNumericText(value: string) {
  return /^[A-Za-z0-9\s./&(),'-]+$/.test(value.trim());
}

function isStrongPassword(value: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value.trim());
}

function isValidDateValue(value: string) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(Date.parse(`${value}T00:00:00`));
}

function validateFileAgainstRules(
  file: File | null,
  label: string,
  allowedTypes: string[],
  allowedExtensions: string[],
  maxSizeBytes: number
) {
  if (!file) return null;

  const extension = getFileExtension(file.name);
  const mimeType = String(file.type || '').toLowerCase();
  const isHeicLike = ['heic', 'heif'].includes(extension) || mimeType.includes('heic') || mimeType.includes('heif');

  if (isHeicLike) {
    if (label === 'Profile picture') {
      return 'This image format is not supported. Please upload JPG, PNG, or WebP.';
    }

    return `${label} uses an unsupported image format. Please upload PDF, JPG, PNG, or WebP.`;
  }

  if (!allowedExtensions.includes(extension) || !allowedTypes.includes(mimeType)) {
    const supportedFormats = label === 'Profile picture' ? 'JPG, PNG, or WebP' : 'PDF, JPG, PNG, or WebP';
    return `${label} must be ${supportedFormats}.`;
  }

  if (file.size > maxSizeBytes) {
    return `${label} must be smaller than ${formatMaxSize(maxSizeBytes)}.`;
  }

  return null;
}

function getTotalUploadSizeBytes({
  profilePicture,
  documents,
  educationEntries,
  certificationEntries,
}: {
  profilePicture: File | null;
  documents: DocumentState;
  educationEntries: EducationEntry[];
  certificationEntries: CertificationEntry[];
}) {
  const files = [
    profilePicture,
    ...Object.values(documents),
    ...educationEntries.map((entry) => entry.file),
    ...certificationEntries.map((entry) => entry.file),
  ];

  return files.reduce((total, file) => total + (file?.size || 0), 0);
}

function extractPlainErrorText(rawText: string) {
  const normalized = String(rawText || '').trim();
  if (!normalized) return '';
  if (normalized.startsWith('<!DOCTYPE') || normalized.startsWith('<html')) {
    return '';
  }
  return normalized;
}

async function parseApiResponse(response: Response) {
  const rawText = await response.text();
  const contentType = response.headers.get('content-type') || '';
  const plainText = extractPlainErrorText(rawText);

  if (!rawText) {
    return { data: null as Record<string, unknown> | null, plainText: '' };
  }

  if (contentType.includes('application/json')) {
    try {
      return { data: JSON.parse(rawText) as Record<string, unknown>, plainText };
    } catch {
      return { data: null, plainText };
    }
  }

  try {
    return { data: JSON.parse(rawText) as Record<string, unknown>, plainText };
  } catch {
    return { data: null, plainText };
  }
}

function isUploadErrorKey(key: string) {
  return key === 'profilePicture' || key.startsWith('document_') || key.startsWith('education_file_') || key.startsWith('certification_file_');
}

const CURRENT_TO_PERMANENT_FIELD_MAP: Record<string, keyof FormState> = {
  address: 'permanentAddress',
  city: 'permanentCity',
  district: 'permanentDistrict',
  state: 'permanentState',
  country: 'permanentCountry',
  pincode: 'permanentPincode',
};

function buildPermanentAddressPatch(form: FormState) {
  return {
    permanentAddress: form.address,
    permanentCity: form.city,
    permanentDistrict: form.district,
    permanentState: form.state,
    permanentCountry: form.country,
    permanentPincode: form.pincode,
  };
}

type AddEmployeeProps = {
  setCurrentTab?: (tab: string) => void;
  metaUrl?: string;
  submitUrl?: string;
  publicMode?: boolean;
  embedded?: boolean;
};

export default function AddEmployee({
  setCurrentTab,
  metaUrl = '/HRM/api/employees?includeMeta=1',
  submitUrl = '/HRM/api/employees',
  publicMode = false,
  embedded = false,
}: AddEmployeeProps) {
  const { showFeedback } = useHrmFeedback();
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [sameAsCurrentAddress, setSameAsCurrentAddress] = useState(false);
  const [workingDays, setWorkingDays] = useState<string[]>(WORKING_DAY_PRESETS[0].days);
  const [educationEntries, setEducationEntries] = useState<EducationEntry[]>(defaultEducation);
  const [certificationEntries, setCertificationEntries] = useState<CertificationEntry[]>([]);
  const [documents, setDocuments] = useState<DocumentState>({
    aadhaar_card: null,
    pan_card: null,
    passport: null,
    appointment_letter: null,
    experience_letter: null,
    salary_slip: null,
  });
  const [departments, setDepartments] = useState<Option[]>([]);
  const [designations, setDesignations] = useState<Option[]>([]);
  const [employees, setEmployees] = useState<Option[]>([]);
  const [superAdmins, setSuperAdmins] = useState<Option[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ErrorMap>({});
  const [uploadErrors, setUploadErrors] = useState<ErrorMap>({});
  const [sectionErrors, setSectionErrors] = useState<SectionErrorMap>({});

  useEffect(() => {
    let active = true;

    async function loadMeta() {
      setLoadingMeta(true);

      try {
        const response = await fetch(metaUrl);
        const { data: result, plainText } = await parseApiResponse(response);

        if (!response.ok) {
          throw new Error(
            (typeof result?.error === 'string' && result.error) ||
            plainText ||
            'Failed to load employee form data'
          );
        }

        if (!active) {
          return;
        }

        setDepartments(Array.isArray(result?.departments) ? result.departments as Option[] : []);
        setDesignations(Array.isArray(result?.designations) ? result.designations as Option[] : []);
        setEmployees(
          Array.isArray(result?.employeeOptions)
            ? result.employeeOptions as Option[]
            : Array.isArray(result?.employees)
              ? result.employees as Option[]
              : []
        );
        setSuperAdmins(
          (Array.isArray(result?.superAdminOptions) ? result.superAdminOptions : []).map((item) => ({
            ...(item as Option),
            optionType: 'super_admin',
          }))
        );
      } catch (requestError) {
        if (active) {
          const nextError = requestError instanceof Error ? requestError.message : 'Failed to load employee form data';
          showFeedback({ type: 'error', title: 'Form Data Not Loaded', message: nextError });
        }
      } finally {
        if (active) {
          setLoadingMeta(false);
        }
      }
    }

    loadMeta();
    return () => {
      active = false;
    };
  }, [metaUrl, showFeedback]);

  const filteredDesignations = useMemo(() => {
    const selectedDepartment = departments.find((department) => department.name === form.department);
    const departmentMatchedDesignations = !selectedDepartment?.id
      ? designations
      : designations.filter((designation) => !designation.department_id || designation.department_id === selectedDepartment.id);

    return getSuggestedDesignations(form.department, departmentMatchedDesignations);
  }, [departments, designations, form.department]);

  const clearFieldError = (fieldKey: string) => {
    setFieldErrors((current) => {
      if (!current[fieldKey]) return current;
      const next = { ...current };
      delete next[fieldKey];
      return next;
    });
  };

  const clearUploadError = (fieldKey: string) => {
    setUploadErrors((current) => {
      if (!current[fieldKey]) return current;
      const next = { ...current };
      delete next[fieldKey];
      return next;
    });
  };

  const clearSectionError = (sectionKey: string) => {
    setSectionErrors((current) => {
      if (!current[sectionKey]) return current;
      const next = { ...current };
      delete next[sectionKey];
      return next;
    });
  };

  const applyStructuredErrors = ({
    error,
    fieldErrors: nextFieldErrors = {},
    uploadErrors: nextUploadErrors = {},
    sectionErrors: nextSectionErrors = {},
    details = [],
  }: {
    error: string;
    fieldErrors?: ErrorMap;
    uploadErrors?: ErrorMap;
    sectionErrors?: SectionErrorMap;
    details?: string[];
  }) => {
    setFieldErrors(nextFieldErrors);
    setUploadErrors(nextUploadErrors);
    setSectionErrors(nextSectionErrors);
    showFeedback({
      type: 'error',
      title: 'Save Error',
      message: [error, ...(details.length ? details : [])].filter(Boolean).join('\n'),
    });
  };

  const validateForm = () => {
    const nextFieldErrors: ErrorMap = {};
    const nextUploadErrors: ErrorMap = {};
    const nextSectionErrors: SectionErrorMap = {};

    if (!form.employeeId.trim()) nextFieldErrors.employeeId = 'Employee ID is required.';
    if (!form.name.trim()) nextFieldErrors.name = 'Full name is required.';
    if (!form.email.trim()) {
      nextFieldErrors.email = 'Work email is required.';
    } else if (!isValidEmail(form.email)) {
      nextFieldErrors.email = 'Please enter a valid work email address.';
    }

    if (!form.password.trim()) {
      nextFieldErrors.password = 'Password is required.';
    } else if (!isStrongPassword(form.password)) {
      nextFieldErrors.password = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';
    }

    if (!form.department.trim()) nextFieldErrors.department = 'Department is required.';
    if (!form.designation.trim()) nextFieldErrors.designation = 'Designation is required.';

    if (form.employeeId.trim() && !isAlphaNumericText(form.employeeId)) {
      nextFieldErrors.employeeId = 'Employee ID can contain only letters, numbers, spaces, and basic separators.';
    }

    if (form.name.trim() && !isAlphaText(form.name)) {
      nextFieldErrors.name = 'Full name can contain only letters and common name characters.';
    }

    if (form.personalEmail.trim() && !isValidEmail(form.personalEmail)) {
      nextFieldErrors.personalEmail = 'Please enter a valid personal email address.';
    }

    if (!isValidDateValue(form.dateOfBirth)) nextFieldErrors.dateOfBirth = 'Please enter a valid date of birth.';
    if (!isValidDateValue(form.joinedOn)) nextFieldErrors.joinedOn = 'Please enter a valid joining date.';
    if (!isValidDateValue(form.confirmationDate)) nextFieldErrors.confirmationDate = 'Please enter a valid confirmation date.';

    if (form.aadhaarNumber.trim() && !/^\d{12}$/.test(form.aadhaarNumber.trim())) {
      nextFieldErrors.aadhaarNumber = 'Aadhaar number must be exactly 12 digits.';
    }

    if (form.panNumber.trim() && !/^[A-Z0-9]{10}$/i.test(form.panNumber.trim())) {
      nextFieldErrors.panNumber = 'PAN number must be exactly 10 characters.';
    }

    if (form.phone.trim() && (!isDigitsOnly(form.phone) || form.phone.trim().length < 10 || form.phone.trim().length > 15)) {
      nextFieldErrors.phone = 'Phone number must contain only digits and be between 10 and 15 digits.';
    }

    if (form.phone2.trim() && (!isDigitsOnly(form.phone2) || form.phone2.trim().length < 10 || form.phone2.trim().length > 15)) {
      nextFieldErrors.phone2 = 'Alternate phone must contain only digits and be between 10 and 15 digits.';
    }

    if (form.mobile.trim() && (!isDigitsOnly(form.mobile) || form.mobile.trim().length < 10 || form.mobile.trim().length > 15)) {
      nextFieldErrors.mobile = 'Mobile number must contain only digits and be between 10 and 15 digits.';
    }

    if (
      form.emergencyContactNumber.trim() &&
      (!isDigitsOnly(form.emergencyContactNumber) || form.emergencyContactNumber.trim().length < 10 || form.emergencyContactNumber.trim().length > 15)
    ) {
      nextFieldErrors.emergencyContactNumber = 'Emergency contact number must contain only digits and be between 10 and 15 digits.';
    }

    if (form.emergencyContactName.trim() && !isAlphaText(form.emergencyContactName)) {
      nextFieldErrors.emergencyContactName = 'Emergency contact name can contain only letters and common name characters.';
    }

    if (form.fatherName.trim() && !isAlphaText(form.fatherName)) {
      nextFieldErrors.fatherName = 'Father name can contain only letters and common name characters.';
    }

    if (form.spouseName.trim() && !isAlphaText(form.spouseName)) {
      nextFieldErrors.spouseName = 'Spouse name can contain only letters and common name characters.';
    }

    if (form.pincode.trim() && (!isDigitsOnly(form.pincode) || form.pincode.trim().length !== 6)) {
      nextFieldErrors.pincode = 'Pincode must contain exactly 6 digits.';
    }

    if (form.permanentPincode.trim() && (!isDigitsOnly(form.permanentPincode) || form.permanentPincode.trim().length !== 6)) {
      nextFieldErrors.permanentPincode = 'Permanent pincode must contain exactly 6 digits.';
    }

    if (form.salary.trim() && Number.isNaN(Number(form.salary.trim()))) {
      nextFieldErrors.salary = 'Salary must be a valid number.';
    }

    if (form.bankAccountNumber.trim() && !isDigitsOnly(form.bankAccountNumber)) {
      nextFieldErrors.bankAccountNumber = 'Bank account number must contain only digits.';
    }

    if (form.bankAccountHolderName.trim() && !isAlphaText(form.bankAccountHolderName)) {
      nextFieldErrors.bankAccountHolderName = 'Account holder name can contain only letters and common name characters.';
    }

    if (form.passportNumber.trim() && !/^[A-Z0-9]{6,20}$/i.test(form.passportNumber.trim())) {
      nextFieldErrors.passportNumber = 'Passport number can contain only letters and numbers.';
    }

    const profilePictureError = validateFileAgainstRules(
      form.profilePicture,
      'Profile picture',
      PROFILE_PICTURE_ALLOWED_TYPES,
      PROFILE_PICTURE_ALLOWED_EXTENSIONS,
      PROFILE_PICTURE_MAX_SIZE_BYTES
    );

    if (profilePictureError) {
      nextUploadErrors.profilePicture = profilePictureError;
      nextSectionErrors.accountAccess = 'Some account details need attention.';
    }

    DOCUMENT_TYPES.forEach((document) => {
      const key = `document_${document.key}`;
      const error = validateFileAgainstRules(
        documents[document.key],
        document.label,
        EMPLOYEE_FILE_ALLOWED_TYPES,
        EMPLOYEE_FILE_ALLOWED_EXTENSIONS,
        EMPLOYEE_FILE_MAX_SIZE_BYTES
      );

      if (error) {
        nextUploadErrors[key] = error;
        nextSectionErrors.documents = 'Some uploaded documents need attention.';
      }
    });

    educationEntries.forEach((entry, index) => {
      const key = `education_file_${index}`;
      const label = `${entry.educationLevel.replace(/_/g, ' ')} education file`;
      const error = validateFileAgainstRules(
        entry.file,
        label,
        EMPLOYEE_FILE_ALLOWED_TYPES,
        EMPLOYEE_FILE_ALLOWED_EXTENSIONS,
        EMPLOYEE_FILE_MAX_SIZE_BYTES
      );

      if (error) {
        nextUploadErrors[key] = error;
        nextSectionErrors.education = 'Some education uploads need attention.';
      }
    });

    certificationEntries.forEach((entry, index) => {
      const key = `certification_file_${index}`;
      const label = entry.certificationName.trim() ? `${entry.certificationName.trim()} certificate` : 'Certification file';
      const error = validateFileAgainstRules(
        entry.file,
        label,
        EMPLOYEE_FILE_ALLOWED_TYPES,
        EMPLOYEE_FILE_ALLOWED_EXTENSIONS,
        EMPLOYEE_FILE_MAX_SIZE_BYTES
      );

      if (error) {
        nextUploadErrors[key] = error;
        nextSectionErrors.certifications = 'Some certification uploads need attention.';
      }
    });

    const totalUploadSizeBytes = getTotalUploadSizeBytes({
      profilePicture: form.profilePicture,
      documents,
      educationEntries,
      certificationEntries,
    });

    if (totalUploadSizeBytes > TOTAL_UPLOAD_MAX_SIZE_BYTES) {
      nextSectionErrors.documents = 'The total upload size is too large.';
      nextUploadErrors.documents = `Total uploaded files must be smaller than ${formatMaxSize(TOTAL_UPLOAD_MAX_SIZE_BYTES)}.`;
    }

    const details = [
      ...Object.values(nextFieldErrors),
      ...Object.values(nextUploadErrors),
    ];

    return {
      isValid: details.length === 0,
      fieldErrors: nextFieldErrors,
      uploadErrors: nextUploadErrors,
      sectionErrors: nextSectionErrors,
      details,
    };
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, files } = event.target as HTMLInputElement;

    if (name === 'profilePicture') {
      clearUploadError('profilePicture');
      clearSectionError('accountAccess');
      setForm((current) => ({ ...current, profilePicture: files?.[0] || null }));
      return;
    }

    clearFieldError(name);
    if (['employeeId', 'email', 'password', 'phone'].includes(name)) {
      clearSectionError('accountAccess');
    }
    if (['department', 'designation', 'reportingTo'].includes(name)) {
      clearSectionError('currentPosition');
    }
    if (['aadhaarNumber', 'panNumber'].includes(name)) {
      clearSectionError('identityFinancials');
    }

    setForm((current) => {
      const permanentField = CURRENT_TO_PERMANENT_FIELD_MAP[name];
      const nextForm = {
        ...current,
        [name]: value,
        ...(sameAsCurrentAddress && permanentField ? { [permanentField]: value } : {}),
      };

      return nextForm;
    });

    if (name === 'workingScheduleLabel') {
      const preset = WORKING_DAY_PRESETS.find((item) => item.label === value);
      if (preset && preset.days.length > 0) {
        setWorkingDays(preset.days);
      }
    }
  };

  const toggleWorkingDay = (day: string) => {
    setForm((current) => ({ ...current, workingScheduleLabel: 'Custom' }));
    setWorkingDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day]
    );
  };

  const updateEducationEntry = (index: number, key: keyof EducationEntry, value: string | File | null) => {
    if (key === 'file') {
      clearUploadError(`education_file_${index}`);
      clearSectionError('education');
    }
    setEducationEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index
          ? {
              ...entry,
              [key]: value,
            }
          : entry
      )
    );
  };

  const updateCertificationEntry = (
    id: string,
    key: keyof CertificationEntry,
    value: string | File | null
  ) => {
    const targetIndex = certificationEntries.findIndex((entry) => entry.id === id);
    if (key === 'file' && targetIndex >= 0) {
      clearUploadError(`certification_file_${targetIndex}`);
      clearSectionError('certifications');
    }
    setCertificationEntries((current) =>
      current.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              [key]: value,
            }
          : entry
      )
    );
  };

  const addCertificationEntry = () => {
    setCertificationEntries((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        certificationName: '',
        issuer: '',
        issuedYear: '',
        file: null,
      },
    ]);
  };

  const removeCertificationEntry = (id: string) => {
    setCertificationEntries((current) => current.filter((entry) => entry.id !== id));
  };

  const handleDocumentChange = (type: string, file: File | null) => {
    clearUploadError(`document_${type}`);
    clearSectionError('documents');
    setDocuments((current) => ({
      ...current,
      [type]: file,
    }));
  };

  const handleSameAsCurrentAddressChange = (checked: boolean) => {
    setSameAsCurrentAddress(checked);

    if (!checked) {
      return;
    }

    setForm((current) => ({
      ...current,
      ...buildPermanentAddressPatch(current),
    }));
  };

  const resetForm = () => {
    setForm(defaultFormState);
    setSameAsCurrentAddress(false);
    setWorkingDays(WORKING_DAY_PRESETS[0].days);
    setEducationEntries(defaultEducation());
    setCertificationEntries([]);
    setDocuments({
      aadhaar_card: null,
      pan_card: null,
      passport: null,
      appointment_letter: null,
      experience_letter: null,
      salary_slip: null,
    });
    setFieldErrors({});
    setUploadErrors({});
    setSectionErrors({});
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setUploadErrors({});
    setSectionErrors({});

    try {
      const validation = validateForm();
      if (!validation.isValid) {
        applyStructuredErrors({
          error: 'Please fix the highlighted fields and try again.',
          fieldErrors: validation.fieldErrors,
          uploadErrors: validation.uploadErrors,
          sectionErrors: validation.sectionErrors,
          details: validation.details,
        });
        return;
      }

      const payload = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        if (key === 'profilePicture') {
          if (value) {
            payload.append(key, value);
          }
          return;
        }

        payload.append(key, value || '');
      });

      payload.set('workingDays', JSON.stringify(workingDays));

      const educationPayload = educationEntries.map((entry, index) => {
        const fileKey = `education_file_${index}`;
        if (entry.file) {
          payload.append(fileKey, entry.file);
        }

        return {
          educationLevel: entry.educationLevel,
          institutionName: entry.institutionName,
          boardUniversity: entry.boardUniversity,
          specialization: entry.specialization,
          passingYear: entry.passingYear,
          score: entry.score,
          fileKey,
        };
      });
      payload.set('educationEntries', JSON.stringify(educationPayload));

      const certificationPayload = certificationEntries.map((entry, index) => {
        const fileKey = `certification_file_${index}`;
        if (entry.file) {
          payload.append(fileKey, entry.file);
        }

        return {
          certificationName: entry.certificationName,
          issuer: entry.issuer,
          issuedYear: entry.issuedYear,
          fileKey,
        };
      });
      payload.set('certificationEntries', JSON.stringify(certificationPayload));

      Object.entries(documents).forEach(([documentType, file]) => {
        if (file) {
          payload.append(`document_${documentType}`, file);
        }
      });

      const response = await fetch(submitUrl, {
        method: 'POST',
        body: payload,
      });
      const { data: result, plainText } = await parseApiResponse(response);

      if (!response.ok) {
        const nextFieldErrors: ErrorMap = {};
        const nextUploadErrors: ErrorMap = {};
        Object.entries((result?.fieldErrors as Record<string, unknown>) || {}).forEach(([key, value]) => {
          if (typeof value !== 'string' || !value) return;
          if (isUploadErrorKey(key)) {
            nextUploadErrors[key] = value;
            return;
          }
          nextFieldErrors[key] = value;
        });

        const responseError =
          (typeof result?.error === 'string' && result.error) ||
          plainText ||
          'Please fix the highlighted fields and try again.';

        const responseDetails = Array.isArray(result?.details)
          ? result.details.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
          : plainText
            ? [plainText]
            : [responseError];

        applyStructuredErrors({
          error: responseError,
          fieldErrors: nextFieldErrors,
          uploadErrors: nextUploadErrors,
          sectionErrors: (result?.sectionErrors as SectionErrorMap) || {},
          details: responseDetails,
        });
        return;
      }

      showFeedback({
        type: 'success',
        title: publicMode ? 'Form Submitted' : 'Employee Added',
        message: publicMode
          ? 'Your employee information has been submitted successfully.'
          : ((typeof result?.message === 'string' && result.message) || 'Employee added successfully.'),
      });
      resetForm();
    } catch (requestError) {
      const nextError = requestError instanceof Error ? requestError.message : 'We could not save the employee form right now. Please try again or contact HR.';
      applyStructuredErrors({
        error: nextError,
        details: [nextError],
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={embedded ? 'p-7 pb-10' : 'p-10 pb-16'}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        {embedded ? (
          <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
                Employee Intake Form
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
                HR creates the employee, login credentials, master employee record, education, experience, and documents from one place.
              </p>
            </div>

            <div className="flex gap-4">
              {setCurrentTab ? (
                <button
                  type="button"
                  onClick={() => setCurrentTab('admin-employee-list')}
                  className="rounded-2xl border border-outline-variant/15 bg-surface px-6 py-3 text-sm font-bold text-on-surface"
                >
                  Cancel
                </button>
              ) : null}
              <button
                type="submit"
                form="add-employee-form"
                disabled={submitting}
                className="rounded-2xl bg-primary px-8 py-3 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? 'Saving Employee...' : 'Save Employee'}
              </button>
            </div>
          </section>
        ) : (
          <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-on-surface-variant">
                {publicMode ? 'Public Employee Intake' : 'Directory / Add New Employee'}
              </p>
              <h1 className="mt-3 text-5xl font-extrabold tracking-tight text-on-surface">
                {publicMode ? 'Employee Information Form' : 'Add New Employee'}
              </h1>
              <p className="mt-3 max-w-3xl text-lg text-on-surface-variant">
                {publicMode
                  ? 'Fill all employee details, upload documents, and submit your information directly into the employee database.'
                  : 'HR creates the employee, login credentials, master employee record, education, experience, and document access from one form.'}
              </p>
            </div>

            <div className="flex gap-4">
              {setCurrentTab ? (
                <button
                  type="button"
                  onClick={() => setCurrentTab('admin-employee-list')}
                  className="rounded-2xl border border-outline-variant/15 bg-surface px-6 py-3 text-sm font-bold text-on-surface"
                >
                  Cancel
                </button>
              ) : null}
              <button
                type="submit"
                form="add-employee-form"
                disabled={submitting}
                className="rounded-2xl bg-primary px-8 py-3 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? 'Saving Employee...' : 'Save Employee'}
              </button>
            </div>
          </section>
        )}

        {loadingMeta && (
          <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low px-5 py-4 text-sm text-on-surface-variant">
            Loading employee form options...
          </div>
        )}

        <form id="add-employee-form" className="space-y-8" onSubmit={handleSubmit}>
          <Section title="Account & Access" subtitle="Create the login credentials and primary employee access.">
            <SectionError message={sectionErrors.accountAccess} />
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Employee ID" required error={fieldErrors.employeeId}>
                <input className={inputClassName(false, !!fieldErrors.employeeId)} name="employeeId" value={form.employeeId} onChange={handleInputChange} />
              </Field>
              <Field label="Work Email" required error={fieldErrors.email}>
                <div className="space-y-2">
                  <input className={inputClassName(false, !!fieldErrors.email)} name="email" type="email" value={form.email} onChange={handleInputChange} />
                  <p className="text-xs text-on-surface-variant">
                    Use your BNC email if you have., If not, then use personal email
                  </p>
                </div>
              </Field>
              <Field label="Password" required error={fieldErrors.password}>
                <div className="space-y-2">
                  <input className={inputClassName(false, !!fieldErrors.password)} name="password" type="text" value={form.password} onChange={handleInputChange} />
                  <p className="text-xs text-on-surface-variant">
                    Create a password for logging in. This is not your email password.
                  </p>
                </div>
              </Field>
              <Field label="Phone Number" error={fieldErrors.phone}>
                <input className={inputClassName(false, !!fieldErrors.phone)} name="phone" value={form.phone} onChange={handleInputChange} />
              </Field>
              <Field label="Task Manager Access">
                <select className={selectClassName()} name="taskManagerAccess" value={form.taskManagerAccess} onChange={handleInputChange}>
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </Field>
              <Field label="Profile Picture" error={uploadErrors.profilePicture}>
                <div className="space-y-2">
                  <label className={fileButtonClassName(!!uploadErrors.profilePicture)}>
                    <span>{form.profilePicture ? form.profilePicture.name : 'Choose Profile Image'}</span>
                    <input className="hidden" name="profilePicture" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleInputChange} />
                  </label>
                  <p className="text-xs text-on-surface-variant">Supported formats: JPG, PNG, WebP up to {formatMaxSize(PROFILE_PICTURE_MAX_SIZE_BYTES)}.</p>
                </div>
              </Field>
            </div>
          </Section>

          <Section title="Personal Information" subtitle="Capture the employee's core identity and personal details.">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Full Name" required error={fieldErrors.name}>
                <input className={inputClassName(false, !!fieldErrors.name)} name="name" value={form.name} onChange={handleInputChange} />
              </Field>
              <Field label="Personal Email" error={fieldErrors.personalEmail}>
                <input className={inputClassName(false, !!fieldErrors.personalEmail)} name="personalEmail" type="email" value={form.personalEmail} onChange={handleInputChange} />
              </Field>
              <Field label="Date Of Birth" error={fieldErrors.dateOfBirth}>
                <input className={inputClassName(false, !!fieldErrors.dateOfBirth)} name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleInputChange} />
              </Field>
              <Field label="Gender">
                <select className={selectClassName()} name="gender" value={form.gender} onChange={handleInputChange}>
                  <option value="">Select gender</option>
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Blood Group">
                <select className={selectClassName()} name="bloodGroup" value={form.bloodGroup} onChange={handleInputChange}>
                  <option value="">Select blood group</option>
                  {BLOOD_GROUP_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Father Name">
                <input className={inputClassName()} name="fatherName" value={form.fatherName} onChange={handleInputChange} />
              </Field>
              <Field label="Marital Status">
                <select className={selectClassName()} name="maritalStatus" value={form.maritalStatus} onChange={handleInputChange}>
                  <option value="">Select</option>
                  <option>Single</option>
                  <option>Married</option>
                  <option>Divorced</option>
                  <option>Widowed</option>
                </select>
              </Field>
              <Field label="Spouse Name">
                <input className={inputClassName()} name="spouseName" value={form.spouseName} onChange={handleInputChange} />
              </Field>
              <Field label="Nationality">
                <input className={inputClassName()} name="nationality" value={form.nationality} onChange={handleInputChange} />
              </Field>
              <Field label="Religion">
                <select className={selectClassName()} name="religion" value={form.religion} onChange={handleInputChange}>
                  <option value="">Select religion</option>
                  {RELIGION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Physically Challenged">
                <select className={selectClassName()} name="isPhysicallyChallenged" value={form.isPhysicallyChallenged} onChange={handleInputChange}>
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Current Address" subtitle="Save the communication address and contact numbers for the employee.">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Address">
                <textarea className={inputClassName(true)} name="address" value={form.address} onChange={handleInputChange} />
              </Field>
              <Field label="City">
                <input className={inputClassName()} name="city" value={form.city} onChange={handleInputChange} />
              </Field>
              <Field label="District">
                <input className={inputClassName()} name="district" value={form.district} onChange={handleInputChange} />
              </Field>
              <Field label="State">
                <input className={inputClassName()} name="state" value={form.state} onChange={handleInputChange} />
              </Field>
              <Field label="Country">
                <input className={inputClassName()} name="country" value={form.country} onChange={handleInputChange} />
              </Field>
              <Field label="Pincode">
                <input className={inputClassName()} name="pincode" value={form.pincode} onChange={handleInputChange} />
              </Field>
              <Field label="Alternate Phone">
                <input className={inputClassName()} name="phone2" value={form.phone2} onChange={handleInputChange} />
              </Field>
              <Field label="Mobile">
                <input className={inputClassName()} name="mobile" value={form.mobile} onChange={handleInputChange} />
              </Field>
              <Field label="Emergency Contact Name">
                <input className={inputClassName()} name="emergencyContactName" value={form.emergencyContactName} onChange={handleInputChange} />
              </Field>
              <Field label="Emergency Contact Number">
                <input className={inputClassName()} name="emergencyContactNumber" value={form.emergencyContactNumber} onChange={handleInputChange} />
              </Field>
            </div>
          </Section>

          <Section title="Permanent Address" subtitle="Store the employee's permanent residential address for records and compliance.">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Same as current address</p>
                <p className="text-xs text-slate-500">Copy the current address into the permanent address fields.</p>
              </div>
              <label className="inline-flex items-center gap-3 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={sameAsCurrentAddress}
                  onChange={(event) => handleSameAsCurrentAddressChange(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                />
                Same as current address
              </label>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Address">
                <textarea
                  className={inputClassName(true)}
                  name="permanentAddress"
                  value={form.permanentAddress}
                  onChange={handleInputChange}
                  disabled={sameAsCurrentAddress}
                />
              </Field>
              <Field label="City">
                <input className={inputClassName()} name="permanentCity" value={form.permanentCity} onChange={handleInputChange} disabled={sameAsCurrentAddress} />
              </Field>
              <Field label="District">
                <input className={inputClassName()} name="permanentDistrict" value={form.permanentDistrict} onChange={handleInputChange} disabled={sameAsCurrentAddress} />
              </Field>
              <Field label="State">
                <input className={inputClassName()} name="permanentState" value={form.permanentState} onChange={handleInputChange} disabled={sameAsCurrentAddress} />
              </Field>
              <Field label="Country">
                <input className={inputClassName()} name="permanentCountry" value={form.permanentCountry} onChange={handleInputChange} disabled={sameAsCurrentAddress} />
              </Field>
              <Field label="Pincode">
                <input className={inputClassName()} name="permanentPincode" value={form.permanentPincode} onChange={handleInputChange} disabled={sameAsCurrentAddress} />
              </Field>
            </div>
          </Section>

          <Section title="Joining Details" subtitle="Record employee type, joining dates, and onboarding references.">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Employee Type">
                <select className={selectClassName()} name="employeeType" value={form.employeeType} onChange={handleInputChange}>
                  {EMPLOYEE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Joining Date" error={fieldErrors.joinedOn}>
                <input className={inputClassName(false, !!fieldErrors.joinedOn)} name="joinedOn" type="date" value={form.joinedOn} onChange={handleInputChange} />
              </Field>
              <Field label="Confirmation Date" error={fieldErrors.confirmationDate}>
                <input className={inputClassName(false, !!fieldErrors.confirmationDate)} name="confirmationDate" type="date" value={form.confirmationDate} onChange={handleInputChange} />
              </Field>
              <Field label="Probation Period (days)">
                <input className={inputClassName(true)} value={`${DEFAULT_PROBATION_PERIOD_DAYS} days`} disabled readOnly />
              </Field>
              <Field label="Referred By">
                <input className={inputClassName()} name="referredBy" value={form.referredBy} onChange={handleInputChange} />
              </Field>
              <div className="md:col-span-2 xl:col-span-3 rounded-[1.2rem] border border-slate-200 bg-white px-5 py-5">
                <p className="text-sm font-bold text-on-surface">Default Lifecycle</p>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Employees are created as <span className="font-semibold text-on-surface">Active + Probation</span>. Probation is fixed for {DEFAULT_PROBATION_PERIOD_DAYS} days from the joining date and can be removed later only from the HR employee profile action buttons.
                </p>
              </div>
            </div>
          </Section>

          <Section title="Current Position" subtitle="Define reporting structure, work schedule, and position details.">
            <SectionError message={sectionErrors.currentPosition} />
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Department" required error={fieldErrors.department}>
                <select className={selectClassName(!!fieldErrors.department)} name="department" value={form.department} onChange={handleInputChange}>
                  <option value="">Select department</option>
                  {FIXED_DEPARTMENT_OPTIONS.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Division">
                <input className={inputClassName()} name="division" value={form.division} onChange={handleInputChange} />
              </Field>
              <Field label="Designation" required error={fieldErrors.designation}>
                <div className="space-y-2">
                  <select
                    className={selectClassName(!!fieldErrors.designation)}
                    value={filteredDesignations.includes(form.designation) ? form.designation : (form.designation ? CUSTOM_DESIGNATION_VALUE : '')}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      handleInputChange({
                        target: {
                          name: 'designation',
                          value: nextValue === CUSTOM_DESIGNATION_VALUE ? '' : nextValue,
                        },
                      } as ChangeEvent<HTMLSelectElement>);
                    }}
                  >
                    <option value="">Select designation</option>
                    {filteredDesignations.map((designation) => (
                      <option key={designation} value={designation}>
                        {designation}
                      </option>
                    ))}
                    <option value={CUSTOM_DESIGNATION_VALUE}>Other, type manually</option>
                  </select>
                  <input
                    className={inputClassName(false, !!fieldErrors.designation)}
                    list="designation-options"
                    name="designation"
                    value={form.designation}
                    onChange={handleInputChange}
                    placeholder="Type custom designation if not in dropdown"
                  />
                  <p className="text-xs text-on-surface-variant">
                    Select from dropdown, or choose &quot;Other&quot; and type a new designation.
                  </p>
                </div>
              </Field>
              <Field label="Reporting To" error={fieldErrors.reportingTo}>
                <select className={selectClassName(!!fieldErrors.reportingTo)} name="reportingTo" value={form.reportingTo} onChange={handleInputChange}>
                  <option value="">Select reporting to</option>
                  {superAdmins.length > 0 ? (
                    <optgroup label="Super Admins">
                      {superAdmins.map((admin) => (
                        <option key={`super-${admin.id}`} value={`super_admin:${admin.id}`}>
                          {admin.name} {admin.email ? `(${admin.email})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  <optgroup label="Employees">
                  {employees.map((employee) => (
                    <option key={employee.id} value={`employee:${employee.id}`}>
                      {employee.name} {employee.employee_id ? `(${employee.employee_id})` : ''}
                    </option>
                  ))}
                  </optgroup>
                </select>
              </Field>
              <Field label="Company">
                <input className={inputClassName()} name="company" value={form.company} onChange={handleInputChange} />
              </Field>
              <Field label="Salary">
                <input
                  className={inputClassName()}
                  name="salary"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 35000"
                  value={form.salary}
                  onChange={handleInputChange}
                />
              </Field>
              <Field label="Working Day Pattern">
                <select className={selectClassName()} name="workingScheduleLabel" value={form.workingScheduleLabel} onChange={handleInputChange}>
                  {WORKING_DAY_PRESETS.map((preset) => (
                    <option key={preset.label} value={preset.label}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Second Saturday Off">
                <select className={selectClassName()} name="secondSaturdayOff" value={form.secondSaturdayOff} onChange={handleInputChange}>
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </Field>
            </div>

            <div className="mt-8">
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Working Days</p>
              <div className="flex flex-wrap gap-3">
                {WEEK_DAYS.map((day) => {
                  const selected = workingDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleWorkingDay(day)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        selected
                          ? 'bg-primary text-on-primary shadow-lg shadow-primary/20'
                          : 'border border-outline-variant/20 bg-surface text-on-surface-variant'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
            <datalist id="designation-options">
              {filteredDesignations.map((designation) => (
                <option key={designation} value={designation} />
              ))}
            </datalist>

          </Section>

          <Section title="Identity & Financials" subtitle="Save government identity numbers and banking details in the employee master record.">
            <SectionError message={sectionErrors.identityFinancials} />
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Aadhaar Number" error={fieldErrors.aadhaarNumber}>
                <input className={inputClassName(false, !!fieldErrors.aadhaarNumber)} name="aadhaarNumber" inputMode="numeric" maxLength={12} value={form.aadhaarNumber} onChange={handleInputChange} />
              </Field>
              <Field label="PAN Number" error={fieldErrors.panNumber}>
                <input className={inputClassName(false, !!fieldErrors.panNumber)} name="panNumber" maxLength={10} value={form.panNumber} onChange={handleInputChange} />
              </Field>
              <Field label="Passport Number">
                <input className={inputClassName()} name="passportNumber" value={form.passportNumber} onChange={handleInputChange} />
              </Field>
              <Field label="Bank Account Number">
                <input className={inputClassName()} name="bankAccountNumber" value={form.bankAccountNumber} onChange={handleInputChange} />
              </Field>
              <Field label="Bank Account Holder Name">
                <input className={inputClassName()} name="bankAccountHolderName" value={form.bankAccountHolderName} onChange={handleInputChange} />
              </Field>
              <Field label="IFSC Code">
                <input className={inputClassName()} name="bankIfscCode" value={form.bankIfscCode} onChange={handleInputChange} />
              </Field>
              <Field label="Bank Name">
                <input className={inputClassName()} name="bankName" value={form.bankName} onChange={handleInputChange} />
              </Field>
            </div>
          </Section>

          <Section title="Education" subtitle="Capture 10th, 12th, graduation, and post-graduation records with document uploads.">
            <SectionError message={sectionErrors.education} />
            <div className="space-y-6">
              {educationEntries.map((entry, index) => (
                <div key={entry.educationLevel} className="rounded-[1.5rem] border border-slate-300 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <h3 className="text-lg font-bold text-on-surface">{entry.educationLevel.replace('_', ' ').toUpperCase()}</h3>
                    <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-600">Qualification</span>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="School / College">
                      <input className={inputClassName()} value={entry.institutionName} onChange={(event) => updateEducationEntry(index, 'institutionName', event.target.value)} />
                    </Field>
                    <Field label="Board / University">
                      <input className={inputClassName()} value={entry.boardUniversity} onChange={(event) => updateEducationEntry(index, 'boardUniversity', event.target.value)} />
                    </Field>
                    <Field label="Specialization">
                      <input className={inputClassName()} value={entry.specialization} onChange={(event) => updateEducationEntry(index, 'specialization', event.target.value)} />
                    </Field>
                    <Field label="Passing Year">
                      <input className={inputClassName()} value={entry.passingYear} onChange={(event) => updateEducationEntry(index, 'passingYear', event.target.value)} />
                    </Field>
                    <Field label="Percentage / CGPA">
                      <input className={inputClassName()} value={entry.score} onChange={(event) => updateEducationEntry(index, 'score', event.target.value)} />
                    </Field>
                    <Field label="Upload Degree / Marksheet" error={uploadErrors[`education_file_${index}`]}>
                      <label className={fileButtonClassName(!!uploadErrors[`education_file_${index}`])}>
                        <span>{entry.file ? entry.file.name : 'Choose File'}</span>
                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => updateEducationEntry(index, 'file', event.target.files?.[0] || null)} />
                      </label>
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Experience" subtitle="Track current company experience, total prior experience, and overall experience.">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Current Company Experience">
                <input className={inputClassName()} name="currentCompanyExperience" placeholder="e.g. 1 year 8 months" value={form.currentCompanyExperience} onChange={handleInputChange} />
              </Field>
              <Field label="Previous Experience">
                <input className={inputClassName()} name="previousExperience" placeholder="e.g. 2 years 4 months" value={form.previousExperience} onChange={handleInputChange} />
              </Field>
              <Field label="Total Experience">
                <input className={inputClassName()} name="totalExperience" placeholder="e.g. 4 years" value={form.totalExperience} onChange={handleInputChange} />
              </Field>
            </div>
          </Section>

          <Section title="Certifications" subtitle="Add advanced certifications and upload supporting PDFs or certificates.">
            <SectionError message={sectionErrors.certifications} />
            <div className="space-y-6">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addCertificationEntry}
                  className="rounded-2xl bg-secondary-container px-5 py-3 text-sm font-bold text-on-surface"
                >
                  Add Certification
                </button>
              </div>

              {certificationEntries.length === 0 && (
                <div className="rounded-2xl border border-dashed border-outline-variant/20 bg-surface px-5 py-6 text-sm text-on-surface-variant">
                  No certifications added yet.
                </div>
              )}

              {certificationEntries.map((entry) => (
                <div key={entry.id} className="rounded-[1.5rem] border border-slate-300 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-on-surface">Certification</h3>
                    <button
                      type="button"
                      onClick={() => removeCertificationEntry(entry.id)}
                      className="text-sm font-semibold text-red-700 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    <Field label="Certification Name">
                      <input className={inputClassName()} value={entry.certificationName} onChange={(event) => updateCertificationEntry(entry.id, 'certificationName', event.target.value)} />
                    </Field>
                    <Field label="Issuer">
                      <input className={inputClassName()} value={entry.issuer} onChange={(event) => updateCertificationEntry(entry.id, 'issuer', event.target.value)} />
                    </Field>
                    <Field label="Issued Year">
                      <input className={inputClassName()} value={entry.issuedYear} onChange={(event) => updateCertificationEntry(entry.id, 'issuedYear', event.target.value)} />
                    </Field>
                    <Field label="Upload Certificate" error={uploadErrors[`certification_file_${certificationEntries.findIndex((item) => item.id === entry.id)}`]}>
                      <label className={fileButtonClassName(!!uploadErrors[`certification_file_${certificationEntries.findIndex((item) => item.id === entry.id)}`])}>
                        <span>{entry.file ? entry.file.name : 'Choose File'}</span>
                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => updateCertificationEntry(entry.id, 'file', event.target.files?.[0] || null)} />
                      </label>
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Documents Upload" subtitle="Upload the core compliance and onboarding documents for the employee file.">
            <SectionError message={sectionErrors.documents} />
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {DOCUMENT_TYPES.map((document) => (
                <Field key={document.key} label={document.label} error={uploadErrors[`document_${document.key}`]}>
                  <CompactUploadField
                    id={`document-${document.key}`}
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    title="Drop file here or click to browse"
                    helperText={`PDF, JPG, PNG, WebP • Max ${formatMaxSize(EMPLOYEE_FILE_MAX_SIZE_BYTES)}`}
                    file={documents[document.key]}
                    error={uploadErrors[`document_${document.key}`]}
                    onChange={(event) => handleDocumentChange(document.key, event.target.files?.[0] || null)}
                  />
                </Field>
              ))}
            </div>
          </Section>

          <div className="flex justify-end gap-4 pt-2">
            {setCurrentTab ? (
              <button
                type="button"
                onClick={() => setCurrentTab('admin-employee-list')}
                className="rounded-2xl border border-outline-variant/15 bg-surface px-6 py-3 text-sm font-bold text-on-surface"
              >
                Cancel
              </button>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="rounded-2xl bg-primary px-8 py-3 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Saving Employee...' : 'Save Employee'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes dash {
          from {
            stroke-dashoffset: 40;
          }
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes pulseRing {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          35% {
            opacity: 0.5;
          }
          100% {
            transform: scale(1.12);
            opacity: 0;
          }
        }

        @keyframes modalIconIn {
          from {
            transform: scale(0.82);
            opacity: 0.4;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
