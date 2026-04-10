'use client';

import React, { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CURRENT_STAGE_OPTIONS,
  EMPLOYEE_TYPE_OPTIONS,
  EMPLOYMENT_LIFECYCLE_STATUS_OPTIONS,
} from '@/utils/hrm-employment';

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
  bloodGroup: string;
  fatherName: string;
  maritalStatus: string;
  marriageDate: string;
  spouseName: string;
  nationality: string;
  residentialStatus: string;
  placeOfBirth: string;
  countryOfOrigin: string;
  religion: string;
  isInternational: string;
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
const RESIDENTIAL_STATUS_OPTIONS = ['Resident', 'Non-Resident', 'Resident but Not Ordinarily Resident'];
const RELIGION_OPTIONS = ['Hindu', 'Muslim', 'Sikh', 'Christian', 'Buddhist', 'Jain', 'Parsi', 'Other'];
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
  bloodGroup: '',
  fatherName: '',
  maritalStatus: '',
  marriageDate: '',
  spouseName: '',
  nationality: 'Indian',
  residentialStatus: '',
  placeOfBirth: '',
  countryOfOrigin: 'India',
  religion: '',
  isInternational: 'No',
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
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}

function inputClassName(multiline = false) {
  return `w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200 ${multiline ? 'min-h-[120px] resize-y' : ''}`;
}

function selectClassName() {
  return 'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200';
}

function fileButtonClassName() {
  return 'inline-flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-500 hover:bg-slate-100';
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

export default function AddEmployee({ setCurrentTab }: { setCurrentTab?: (tab: string) => void }) {
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
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadMeta() {
      setLoadingMeta(true);
      setError('');

      try {
        const response = await fetch('/HRM/api/employees?includeMeta=1');
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load employee form data');
        }

        if (!active) {
          return;
        }

        setDepartments(result.departments || []);
        setDesignations(result.designations || []);
        setEmployees(result.employeeOptions || result.employees || []);
        setSuperAdmins((result.superAdminOptions || []).map((item) => ({ ...item, optionType: 'super_admin' })));
      } catch (requestError) {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Failed to load employee form data');
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
  }, []);

  const filteredDesignations = useMemo(() => {
    const selectedDepartment = departments.find((department) => department.name === form.department);
    if (!selectedDepartment?.id) {
      return designations;
    }

    return designations.filter((designation) => !designation.department_id || designation.department_id === selectedDepartment.id);
  }, [departments, designations, form.department]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, files } = event.target as HTMLInputElement;
    setMessage('');
    setError('');

    if (name === 'profilePicture') {
      setForm((current) => ({ ...current, profilePicture: files?.[0] || null }));
      return;
    }

    setForm((current) => {
      const permanentField = CURRENT_TO_PERMANENT_FIELD_MAP[name];
      const nextForm = {
        ...current,
        [name]: value,
        ...(sameAsCurrentAddress && permanentField ? { [permanentField]: value } : {}),
      };

      if (name === 'lifecycleStatus' && value === 'terminated') {
        nextForm.currentStage = 'none';
      }

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
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
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

      const response = await fetch('/HRM/api/employees', {
        method: 'POST',
        body: payload,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save employee');
      }

      setMessage(result.message || 'Employee added successfully.');
      resetForm();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to save employee');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-10 pb-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-on-surface-variant">Directory / Add New Employee</p>
            <h1 className="mt-3 text-5xl font-extrabold tracking-tight text-on-surface">Add New Employee</h1>
            <p className="mt-3 max-w-3xl text-lg text-on-surface-variant">
              HR creates the employee, login credentials, master employee record, education, experience, and document access from one form.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setCurrentTab?.('admin-employee-list')}
              className="rounded-2xl border border-outline-variant/15 bg-surface px-6 py-3 text-sm font-bold text-on-surface"
            >
              Cancel
            </button>
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

        {loadingMeta && (
          <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low px-5 py-4 text-sm text-on-surface-variant">
            Loading employee form options...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-sm font-medium text-emerald-700">
            {message}
          </div>
        )}

        <form id="add-employee-form" className="space-y-8" onSubmit={handleSubmit}>
          <Section title="Account & Access" subtitle="Create the login credentials and primary employee access.">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Employee ID">
                <input className={inputClassName()} name="employeeId" value={form.employeeId} onChange={handleInputChange} required />
              </Field>
              <Field label="Work Email">
                <input className={inputClassName()} name="email" type="email" value={form.email} onChange={handleInputChange} required />
              </Field>
              <Field label="Password">
                <input className={inputClassName()} name="password" type="text" value={form.password} onChange={handleInputChange} required />
              </Field>
              <Field label="Phone Number">
                <input className={inputClassName()} name="phone" value={form.phone} onChange={handleInputChange} />
              </Field>
              <Field label="Task Manager Access">
                <select className={selectClassName()} name="taskManagerAccess" value={form.taskManagerAccess} onChange={handleInputChange}>
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </Field>
              <Field label="Profile Picture">
                <label className={fileButtonClassName()}>
                  <span>{form.profilePicture ? form.profilePicture.name : 'Choose Profile Image'}</span>
                  <input className="hidden" name="profilePicture" type="file" accept="image/*" onChange={handleInputChange} />
                </label>
              </Field>
            </div>
          </Section>

          <Section title="Personal Information" subtitle="Capture the employee's core identity and personal details.">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Full Name">
                <input className={inputClassName()} name="name" value={form.name} onChange={handleInputChange} required />
              </Field>
              <Field label="Personal Email">
                <input className={inputClassName()} name="personalEmail" type="email" value={form.personalEmail} onChange={handleInputChange} />
              </Field>
              <Field label="Date Of Birth">
                <input className={inputClassName()} name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleInputChange} />
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
              <Field label="Marriage Date">
                <input className={inputClassName()} name="marriageDate" type="date" value={form.marriageDate} onChange={handleInputChange} />
              </Field>
              <Field label="Spouse Name">
                <input className={inputClassName()} name="spouseName" value={form.spouseName} onChange={handleInputChange} />
              </Field>
              <Field label="Nationality">
                <input className={inputClassName()} name="nationality" value={form.nationality} onChange={handleInputChange} />
              </Field>
              <Field label="Residential Status">
                <select className={selectClassName()} name="residentialStatus" value={form.residentialStatus} onChange={handleInputChange}>
                  <option value="">Select residential status</option>
                  {RESIDENTIAL_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Place Of Birth">
                <input className={inputClassName()} name="placeOfBirth" value={form.placeOfBirth} onChange={handleInputChange} />
              </Field>
              <Field label="Country Of Origin">
                <input className={inputClassName()} name="countryOfOrigin" value={form.countryOfOrigin} onChange={handleInputChange} />
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
              <Field label="International Employee">
                <select className={selectClassName()} name="isInternational" value={form.isInternational} onChange={handleInputChange}>
                  <option>No</option>
                  <option>Yes</option>
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

          <Section title="Joining Details" subtitle="Record employee type, lifecycle status, current stage, and onboarding references.">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Employee Type">
                <select className={selectClassName()} name="employeeType" value={form.employeeType} onChange={handleInputChange}>
                  {EMPLOYEE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Lifecycle Status">
                <select className={selectClassName()} name="lifecycleStatus" value={form.lifecycleStatus} onChange={handleInputChange}>
                  {EMPLOYMENT_LIFECYCLE_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Current Stage">
                <select className={selectClassName()} name="currentStage" value={form.currentStage} onChange={handleInputChange}>
                  {CURRENT_STAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Joining Date">
                <input className={inputClassName()} name="joinedOn" type="date" value={form.joinedOn} onChange={handleInputChange} />
              </Field>
              <Field label="Confirmation Date">
                <input className={inputClassName()} name="confirmationDate" type="date" value={form.confirmationDate} onChange={handleInputChange} />
              </Field>
              <Field label="Probation Period (days)">
                <select className={selectClassName()} name="probationPeriodDays" value={form.probationPeriodDays} onChange={handleInputChange}>
                  <option value="">Select probation period</option>
                  {PROBATION_PERIOD_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option} days
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Notice Period (days)">
                <select className={selectClassName()} name="noticePeriodDays" value={form.noticePeriodDays} onChange={handleInputChange}>
                  <option value="">Select notice period</option>
                  {NOTICE_PERIOD_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option} days
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Referred By">
                <input className={inputClassName()} name="referredBy" value={form.referredBy} onChange={handleInputChange} />
              </Field>
            </div>
          </Section>

          <Section title="Current Position" subtitle="Define reporting structure, work schedule, and position details.">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Department">
                <input className={inputClassName()} list="department-options" name="department" value={form.department} onChange={handleInputChange} required />
              </Field>
              <Field label="Division">
                <input className={inputClassName()} name="division" value={form.division} onChange={handleInputChange} />
              </Field>
              <Field label="Designation">
                <input className={inputClassName()} list="designation-options" name="designation" value={form.designation} onChange={handleInputChange} required />
              </Field>
              <Field label="Reporting To">
                <select className={selectClassName()} name="reportingTo" value={form.reportingTo} onChange={handleInputChange}>
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

            <datalist id="department-options">
              {departments.map((department) => (
                <option key={department.id} value={department.name} />
              ))}
            </datalist>

            <datalist id="designation-options">
              {filteredDesignations.map((designation) => (
                <option key={designation.id} value={designation.title} />
              ))}
            </datalist>

          </Section>

          <Section title="Identity & Financials" subtitle="Save government identity numbers and banking details in the employee master record.">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Aadhaar Number">
                <input className={inputClassName()} name="aadhaarNumber" inputMode="numeric" maxLength={12} value={form.aadhaarNumber} onChange={handleInputChange} />
              </Field>
              <Field label="PAN Number">
                <input className={inputClassName()} name="panNumber" maxLength={10} value={form.panNumber} onChange={handleInputChange} />
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
                    <Field label="Upload Degree / Marksheet">
                      <label className={fileButtonClassName()}>
                        <span>{entry.file ? entry.file.name : 'Choose File'}</span>
                        <input type="file" className="hidden" onChange={(event) => updateEducationEntry(index, 'file', event.target.files?.[0] || null)} />
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
                    <Field label="Upload Certificate">
                      <label className={fileButtonClassName()}>
                        <span>{entry.file ? entry.file.name : 'Choose File'}</span>
                        <input type="file" className="hidden" onChange={(event) => updateCertificationEntry(entry.id, 'file', event.target.files?.[0] || null)} />
                      </label>
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Documents Upload" subtitle="Upload the core compliance and onboarding documents for the employee file.">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {DOCUMENT_TYPES.map((document) => (
                <Field key={document.key} label={document.label}>
                  <label className={fileButtonClassName()}>
                    <span>{documents[document.key] ? documents[document.key]?.name : 'Choose File'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(event) => handleDocumentChange(document.key, event.target.files?.[0] || null)}
                    />
                  </label>
                </Field>
              ))}
            </div>
          </Section>
        </form>
      </div>
    </div>
  );
}
