'use client';

import React, { useEffect, useState } from 'react';

const DOCUMENT_TYPES = [
  { key: 'aadhaar_card', label: 'Aadhaar Card' },
  { key: 'pan_card', label: 'PAN Card' },
  { key: 'passport', label: 'Passport' },
  { key: 'appointment_letter', label: 'Appointment Letter (Previous Organisation)' },
  { key: 'experience_letter', label: 'Experience Letter' },
  { key: 'salary_slip', label: 'Salary Slip' },
];

const DEFAULT_EDUCATION = [
  { id: '', educationLevel: '10th', institutionName: '', boardUniversity: '', specialization: '', passingYear: '', score: '', file: null, fileName: '' },
  { id: '', educationLevel: '12th', institutionName: '', boardUniversity: '', specialization: '', passingYear: '', score: '', file: null, fileName: '' },
  { id: '', educationLevel: 'graduation', institutionName: '', boardUniversity: '', specialization: '', passingYear: '', score: '', file: null, fileName: '' },
  { id: '', educationLevel: 'post_graduation', institutionName: '', boardUniversity: '', specialization: '', passingYear: '', score: '', file: null, fileName: '' },
];

const DEFAULT_FORM = {
  name: '',
  candidateEmail: '',
  profilePictureName: '',
  profilePictureUrl: '',
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
  phone: '',
  phone2: '',
  mobile: '',
  emergencyContactName: '',
  emergencyContactNumber: '',
  experienceCompanyName: '',
  totalExperience: '',
  aadhaarNumber: '',
  panNumber: '',
  passportNumber: '',
  bankAccountNumber: '',
  bankAccountHolderName: '',
  bankIfscCode: '',
  bankName: '',
  declarationName: '',
  declarationAccepted: false,
  declarationDate: '',
};

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'others', label: 'Others' },
];

const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const RELIGION_OPTIONS = ['Hindu', 'Muslim', 'Sikh', 'Christian', 'Buddhist', 'Jain', 'Parsi', 'Other'];
const MARITAL_STATUS_OPTIONS = ['Single', 'Married', 'Divorced', 'Widowed'];

function extractPlainErrorText(rawText) {
  const normalized = String(rawText || '').trim();
  if (!normalized) return '';
  if (normalized.startsWith('<!DOCTYPE') || normalized.startsWith('<html')) {
    return '';
  }
  return normalized;
}

async function parseApiResponse(response) {
  const rawText = await response.text();
  const contentType = response.headers.get('content-type') || '';
  const plainText = extractPlainErrorText(rawText);

  if (!rawText) {
    return { data: null, plainText: '' };
  }

  if (contentType.includes('application/json')) {
    try {
      return { data: JSON.parse(rawText), plainText };
    } catch {
      return { data: null, plainText };
    }
  }

  try {
    return { data: JSON.parse(rawText), plainText };
  } catch {
    return { data: null, plainText };
  }
}

function inputClass(multiline = false, readOnly = false) {
  return `w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition ${readOnly ? 'bg-slate-100 text-slate-600' : 'bg-white'} ${multiline ? 'min-h-[120px] resize-y' : ''}`;
}

function selectClass() {
  return 'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition';
}

function fileButtonClassName(hasFile = false) {
  return `inline-flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${hasFile ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100/80' : 'border-slate-300 bg-slate-50 text-slate-800 hover:border-slate-400 hover:bg-white'}`;
}

function compactUploadCardClassName(hasFile = false) {
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
  accept,
  title,
  helperText,
  fileName,
  hasFile,
  onChange,
}) {
  return (
    <label htmlFor={id} className={compactUploadCardClassName(hasFile)}>
      <span className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl transition group-hover:scale-[1.02] ${hasFile ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
        <UploadArrowIcon />
      </span>
      <span className="text-sm font-semibold text-slate-900">{fileName || title}</span>
      <span className="mt-2 text-xs text-slate-500">{helperText}</span>
      <input id={id} type="file" className="hidden" accept={accept} onChange={onChange} />
    </label>
  );
}

function Section({ title, subtitle, children }) {
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

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}

function normalizePermanentAddressState(nextForm) {
  return Boolean(
    nextForm.address &&
      nextForm.address === nextForm.permanentAddress &&
      nextForm.city === nextForm.permanentCity &&
      nextForm.district === nextForm.permanentDistrict &&
      nextForm.state === nextForm.permanentState &&
      nextForm.country === nextForm.permanentCountry &&
      nextForm.pincode === nextForm.permanentPincode
  );
}

export default function OnboardingFormClient({ token }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [modal, setModal] = useState(null);
  const [sameAsCurrentAddress, setSameAsCurrentAddress] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [profilePicture, setProfilePicture] = useState(null);
  const [educationEntries, setEducationEntries] = useState(DEFAULT_EDUCATION);
  const [certificationEntries, setCertificationEntries] = useState([]);
  const [documents, setDocuments] = useState(
    DOCUMENT_TYPES.reduce((acc, item) => {
      acc[item.key] = { id: '', file: null, fileName: '', fileUrl: '' };
      return acc;
    }, {})
  );

  function hydrateFromBundle(bundle) {
    const request = bundle?.request || {};
    const nextForm = {
      ...DEFAULT_FORM,
      name: request.candidate_name || '',
      candidateEmail: request.candidate_email || '',
      profilePictureName: request.profile_picture_file_name || '',
      profilePictureUrl: request.profile_picture_url || '',
      personalEmail: request.personal_email || '',
      dateOfBirth: request.date_of_birth ? String(request.date_of_birth).slice(0, 10) : '',
      gender: request.gender || '',
      bloodGroup: request.blood_group || '',
      fatherName: request.father_name || '',
      maritalStatus: request.marital_status || '',
      spouseName: request.spouse_name || '',
      nationality: request.nationality || 'Indian',
      religion: request.religion || '',
      isPhysicallyChallenged: request.is_physically_challenged ? 'Yes' : 'No',
      address: request.address || '',
      city: request.city || '',
      district: request.district || '',
      state: request.state || '',
      country: request.country || 'India',
      pincode: request.pincode || '',
      permanentAddress: request.permanent_address || '',
      permanentCity: request.permanent_city || '',
      permanentDistrict: request.permanent_district || '',
      permanentState: request.permanent_state || '',
      permanentCountry: request.permanent_country || 'India',
      permanentPincode: request.permanent_pincode || '',
      phone: request.phone || '',
      phone2: request.alternate_phone || '',
      mobile: request.mobile_phone || '',
      emergencyContactName: request.emergency_contact_name || '',
      emergencyContactNumber: request.emergency_contact_number || '',
      experienceCompanyName: request.experience_company_name || '',
      totalExperience: request.total_experience || '',
      aadhaarNumber: request.aadhaar_number || '',
      panNumber: request.pan_number || '',
      passportNumber: request.passport_number || '',
      bankAccountNumber: request.bank_account_number || '',
      bankAccountHolderName: request.bank_account_holder_name || '',
      bankIfscCode: request.bank_ifsc || '',
      bankName: request.bank_name || '',
      declarationName: request.declaration_name || '',
      declarationAccepted: Boolean(request.declaration_accepted),
      declarationDate: request.declaration_date ? String(request.declaration_date).slice(0, 10) : '',
    };

    setForm(nextForm);
    setProfilePicture(null);
    setSameAsCurrentAddress(normalizePermanentAddressState(nextForm));

    const nextEducation = DEFAULT_EDUCATION.map((entry) => {
      const existing = (bundle?.education || []).find((item) => item.education_level === entry.educationLevel);
      return existing
        ? {
            ...entry,
            id: existing.id || '',
            institutionName: existing.institution_name || '',
            boardUniversity: existing.board_university || '',
            specialization: existing.specialization || '',
            passingYear: existing.passing_year ? String(existing.passing_year) : '',
            score: existing.score || '',
            fileName: existing.degree_file_name || '',
          }
        : entry;
    });
    setEducationEntries(nextEducation);

    const nextCertifications = Array.isArray(bundle?.certifications)
      ? bundle.certifications.map((entry) => ({
          id: entry.id || crypto.randomUUID(),
          certificationName: entry.certification_name || '',
          issuer: entry.issuer || '',
          issuedYear: entry.issued_year ? String(entry.issued_year) : '',
          file: null,
          fileName: entry.certificate_file_name || '',
        }))
      : [];
    setCertificationEntries(nextCertifications);

    const nextDocuments = DOCUMENT_TYPES.reduce((acc, item) => {
      const existing = (bundle?.documents || []).find((entry) => entry.document_type === item.key);
      acc[item.key] = {
        id: existing?.id || '',
        file: null,
        fileName: existing?.file_name || '',
        fileUrl: existing?.file_url || '',
      };
      return acc;
    }, {});
    setDocuments(nextDocuments);
  }

  useEffect(() => {
    let active = true;

    async function loadForm() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/onboarding/${token}`);
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result?.error || 'Failed to load onboarding form');
        }
        if (!active) return;
        hydrateFromBundle(result);
      } catch (requestError) {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Failed to load onboarding form');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadForm();
    return () => {
      active = false;
    };
  }, [token]);

  function updateForm(name, value) {
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (sameAsCurrentAddress && ['address', 'city', 'district', 'state', 'country', 'pincode'].includes(name)) {
        next.permanentAddress = name === 'address' ? value : next.permanentAddress;
        next.permanentCity = name === 'city' ? value : next.permanentCity;
        next.permanentDistrict = name === 'district' ? value : next.permanentDistrict;
        next.permanentState = name === 'state' ? value : next.permanentState;
        next.permanentCountry = name === 'country' ? value : next.permanentCountry;
        next.permanentPincode = name === 'pincode' ? value : next.permanentPincode;
      }
      return next;
    });
  }

  function handleSameAsCurrentAddressChange(checked) {
    setSameAsCurrentAddress(checked);
    if (!checked) return;

    setForm((current) => ({
      ...current,
      permanentAddress: current.address,
      permanentCity: current.city,
      permanentDistrict: current.district,
      permanentState: current.state,
      permanentCountry: current.country,
      permanentPincode: current.pincode,
    }));
  }

  function updateEducation(index, key, value) {
    setEducationEntries((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, [key]: value } : entry)));
  }

  function addCertification() {
    setCertificationEntries((current) => [...current, { id: crypto.randomUUID(), certificationName: '', issuer: '', issuedYear: '', file: null, fileName: '' }]);
  }

  function updateCertification(id, key, value) {
    setCertificationEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, [key]: value } : entry)));
  }

  function removeCertification(id) {
    setCertificationEntries((current) => current.filter((entry) => entry.id !== id));
  }

  function showModal(type, title, text) {
    setModal({ type, title, text });
  }

  function buildPayload(action, uploadTargets = []) {
      const payload = new FormData();
      payload.set('action', action);
      Object.entries(form).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
          payload.set(key, value ? 'true' : 'false');
        } else {
          payload.set(key, value || '');
        }
      });
      const targetSet = new Set(uploadTargets);

      if (profilePicture && targetSet.has('profilePicture')) {
        payload.append('profilePicture', profilePicture);
      }

      const educationPayload = educationEntries.map((entry, index) => {
        const fileKey = `education_file_${index}`;
        if (entry.file && targetSet.has(fileKey)) {
          payload.append(fileKey, entry.file);
        }
        return {
          id: entry.id || '',
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
        if (entry.file && targetSet.has(fileKey)) {
          payload.append(fileKey, entry.file);
        }
        return {
          id: entry.id || '',
          certificationName: entry.certificationName,
          issuer: entry.issuer,
          issuedYear: entry.issuedYear,
          fileKey,
        };
      });
      payload.set('certificationEntries', JSON.stringify(certificationPayload));

      Object.entries(documents).forEach(([key, value]) => {
        if (value.file && targetSet.has(`document_${key}`)) {
          payload.append(`document_${key}`, value.file);
        }
      });

      return payload;
  }

  function getPendingUploadTargets() {
    const targets = [];

    if (profilePicture) {
      targets.push('profilePicture');
    }

    educationEntries.forEach((entry, index) => {
      if (entry.file) {
        targets.push(`education_file_${index}`);
      }
    });

    certificationEntries.forEach((entry, index) => {
      if (entry.file) {
        targets.push(`certification_file_${index}`);
      }
    });

    Object.entries(documents).forEach(([key, value]) => {
      if (value.file) {
        targets.push(`document_${key}`);
      }
    });

    return targets;
  }

  async function sendOnboardingRequest(action, uploadTargets = []) {
    const response = await fetch(`/api/onboarding/${token}`, {
      method: 'POST',
      body: buildPayload(action, uploadTargets),
    });
    const { data: result, plainText } = await parseApiResponse(response);

    if (!response.ok) {
      throw new Error(
        (typeof result?.error === 'string' && result.error) ||
        plainText ||
        'Failed to save onboarding form'
      );
    }

    return result;
  }

  async function uploadPendingFilesInChunks() {
    const pendingTargets = getPendingUploadTargets();
    if (!pendingTargets.length) {
      return null;
    }

    let latestResult = null;
    for (const target of pendingTargets) {
      latestResult = await sendOnboardingRequest('save_draft', [target]);
    }

    return latestResult;
  }

  async function submitForm(action) {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const stagedUploadResult = await uploadPendingFilesInChunks();
      if (stagedUploadResult && action === 'save_draft') {
        hydrateFromBundle(stagedUploadResult);
        setMessage(stagedUploadResult?.message || 'Draft saved successfully.');
        return;
      }

      if (stagedUploadResult && action === 'submit') {
        hydrateFromBundle(stagedUploadResult);
      }

      const result = await sendOnboardingRequest(action, []);

      setMessage(result?.message || (action === 'submit' ? 'Submitted successfully.' : 'Draft saved successfully.'));
      if (action === 'submit') {
        setSubmitted(true);
        showModal('success', 'Form Submitted', 'Your onboarding form has been submitted successfully. HR will review it and contact you for the next step.');
      } else {
        hydrateFromBundle(result);
      }
    } catch (requestError) {
      const nextError = requestError instanceof Error ? requestError.message : 'Failed to save onboarding form';
      setError(nextError);
      showModal('error', action === 'submit' ? 'Submission Failed' : 'Save Failed', nextError);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface px-6 py-10">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest px-6 py-10 text-sm text-on-surface-variant shadow-sm">
          Loading your onboarding form...
        </div>
      </div>
    );
  }

  if (error && !form.name) {
    return (
      <div className="min-h-screen bg-surface px-6 py-10">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-10 text-sm text-rose-700 shadow-sm">
          {error}
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-surface px-6 py-10">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-emerald-200 bg-[linear-gradient(180deg,#f4fff8_0%,#e6fbef_100%)] px-6 py-12 text-center shadow-[0_20px_60px_rgba(16,185,129,0.15)]">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 shadow-inner shadow-emerald-200/70 animate-[successPulse_1.8s_ease-in-out_infinite]">
            <svg viewBox="0 0 52 52" className="h-12 w-12 text-emerald-700">
              <circle cx="26" cy="26" r="25" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-20" />
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 27l8 8 16-18"
                className="animate-[successStroke_0.7s_ease-out_forwards]"
                style={{ strokeDasharray: 40, strokeDashoffset: 40 }}
              />
            </svg>
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Submitted</p>
          <h1 className="mt-4 text-3xl font-bold text-emerald-950">Your onboarding form has been submitted.</h1>
          <p className="mt-3 text-sm leading-6 text-emerald-900">HR will review your details and contact you for the next step.</p>
        </div>
        <style jsx>{`
          @keyframes successPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes successStroke {
            to { stroke-dashoffset: 0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest px-6 py-8 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Candidate Onboarding</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-on-surface">Complete Your Joining Details</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-on-surface-variant">
            Please complete the same core details we use in our employee master form. HR will review your submission and then complete the internal sections like account access, joining details, and current position from the admin panel.
          </p>
          {message && !submitted ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
          {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        </section>

        <Section title="Personal Information" subtitle="Capture your core identity and personal details.">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Full Name">
              <input className={inputClass(false, true)} value={form.name} readOnly />
            </Field>
            <Field label="Invite Email">
              <input className={inputClass(false, true)} value={form.candidateEmail} readOnly />
            </Field>
            <Field label="Professional Profile Picture">
              <div className="space-y-3">
                <label className={fileButtonClassName(Boolean(profilePicture || form.profilePictureName))}>
                  <span>{profilePicture ? profilePicture.name : form.profilePictureName || 'Choose Profile Image'}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={(event) => setProfilePicture(event.target.files?.[0] || null)}
                  />
                </label>
                {form.profilePictureUrl && !profilePicture ? (
                  <a
                    href={form.profilePictureUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex text-xs font-semibold text-sky-700 hover:text-sky-800"
                  >
                    View uploaded profile picture
                  </a>
                ) : null}
              </div>
            </Field>
            <Field label="Personal Email">
              <input className={inputClass()} type="email" value={form.personalEmail} onChange={(event) => updateForm('personalEmail', event.target.value)} />
            </Field>
            <Field label="Phone Number">
              <input className={inputClass()} value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} />
            </Field>
            <Field label="Date Of Birth">
              <input className={inputClass()} type="date" value={form.dateOfBirth} onChange={(event) => updateForm('dateOfBirth', event.target.value)} />
            </Field>
            <Field label="Gender">
              <select className={selectClass()} value={form.gender} onChange={(event) => updateForm('gender', event.target.value)}>
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Blood Group">
              <select className={selectClass()} value={form.bloodGroup} onChange={(event) => updateForm('bloodGroup', event.target.value)}>
                <option value="">Select blood group</option>
                {BLOOD_GROUP_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>
            <Field label="Father Name">
              <input className={inputClass()} value={form.fatherName} onChange={(event) => updateForm('fatherName', event.target.value)} />
            </Field>
            <Field label="Marital Status">
              <select className={selectClass()} value={form.maritalStatus} onChange={(event) => updateForm('maritalStatus', event.target.value)}>
                <option value="">Select</option>
                {MARITAL_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>
            <Field label="Spouse Name">
              <input className={inputClass()} value={form.spouseName} onChange={(event) => updateForm('spouseName', event.target.value)} />
            </Field>
            <Field label="Nationality">
              <input className={inputClass()} value={form.nationality} onChange={(event) => updateForm('nationality', event.target.value)} />
            </Field>
            <Field label="Religion">
              <select className={selectClass()} value={form.religion} onChange={(event) => updateForm('religion', event.target.value)}>
                <option value="">Select religion</option>
                {RELIGION_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>
            <Field label="Physically Challenged">
              <select className={selectClass()} value={form.isPhysicallyChallenged} onChange={(event) => updateForm('isPhysicallyChallenged', event.target.value)}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </Field>
          </div>
        </Section>

        <Section title="Current Address" subtitle="Save your communication address and contact numbers.">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Address">
              <textarea className={inputClass(true)} value={form.address} onChange={(event) => updateForm('address', event.target.value)} />
            </Field>
            <Field label="City">
              <input className={inputClass()} value={form.city} onChange={(event) => updateForm('city', event.target.value)} />
            </Field>
            <Field label="District">
              <input className={inputClass()} value={form.district} onChange={(event) => updateForm('district', event.target.value)} />
            </Field>
            <Field label="State">
              <input className={inputClass()} value={form.state} onChange={(event) => updateForm('state', event.target.value)} />
            </Field>
            <Field label="Country">
              <input className={inputClass()} value={form.country} onChange={(event) => updateForm('country', event.target.value)} />
            </Field>
            <Field label="Pincode">
              <input className={inputClass()} value={form.pincode} onChange={(event) => updateForm('pincode', event.target.value)} />
            </Field>
            <Field label="Alternate Phone">
              <input className={inputClass()} value={form.phone2} onChange={(event) => updateForm('phone2', event.target.value)} />
            </Field>
            <Field label="Mobile">
              <input className={inputClass()} value={form.mobile} onChange={(event) => updateForm('mobile', event.target.value)} />
            </Field>
            <Field label="Emergency Contact Name">
              <input className={inputClass()} value={form.emergencyContactName} onChange={(event) => updateForm('emergencyContactName', event.target.value)} />
            </Field>
            <Field label="Emergency Contact Number">
              <input className={inputClass()} value={form.emergencyContactNumber} onChange={(event) => updateForm('emergencyContactNumber', event.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Permanent Address" subtitle="Store your permanent residential address for records and compliance.">
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
              <textarea className={inputClass(true, sameAsCurrentAddress)} value={form.permanentAddress} onChange={(event) => updateForm('permanentAddress', event.target.value)} disabled={sameAsCurrentAddress} />
            </Field>
            <Field label="City">
              <input className={inputClass(false, sameAsCurrentAddress)} value={form.permanentCity} onChange={(event) => updateForm('permanentCity', event.target.value)} disabled={sameAsCurrentAddress} />
            </Field>
            <Field label="District">
              <input className={inputClass(false, sameAsCurrentAddress)} value={form.permanentDistrict} onChange={(event) => updateForm('permanentDistrict', event.target.value)} disabled={sameAsCurrentAddress} />
            </Field>
            <Field label="State">
              <input className={inputClass(false, sameAsCurrentAddress)} value={form.permanentState} onChange={(event) => updateForm('permanentState', event.target.value)} disabled={sameAsCurrentAddress} />
            </Field>
            <Field label="Country">
              <input className={inputClass(false, sameAsCurrentAddress)} value={form.permanentCountry} onChange={(event) => updateForm('permanentCountry', event.target.value)} disabled={sameAsCurrentAddress} />
            </Field>
            <Field label="Pincode">
              <input className={inputClass(false, sameAsCurrentAddress)} value={form.permanentPincode} onChange={(event) => updateForm('permanentPincode', event.target.value)} disabled={sameAsCurrentAddress} />
            </Field>
          </div>
        </Section>

        <Section title="Identity & Financials" subtitle="Save government identity numbers and banking details.">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Aadhaar Number">
              <input className={inputClass()} value={form.aadhaarNumber} onChange={(event) => updateForm('aadhaarNumber', event.target.value)} />
            </Field>
            <Field label="PAN Number">
              <input className={inputClass()} value={form.panNumber} onChange={(event) => updateForm('panNumber', event.target.value)} />
            </Field>
            <Field label="Passport Number">
              <input className={inputClass()} value={form.passportNumber} onChange={(event) => updateForm('passportNumber', event.target.value)} />
            </Field>
            <Field label="Bank Account Number">
              <input className={inputClass()} value={form.bankAccountNumber} onChange={(event) => updateForm('bankAccountNumber', event.target.value)} />
            </Field>
            <Field label="Bank Account Holder Name">
              <input className={inputClass()} value={form.bankAccountHolderName} onChange={(event) => updateForm('bankAccountHolderName', event.target.value)} />
            </Field>
            <Field label="IFSC Code">
              <input className={inputClass()} value={form.bankIfscCode} onChange={(event) => updateForm('bankIfscCode', event.target.value)} />
            </Field>
            <Field label="Bank Name">
              <input className={inputClass()} value={form.bankName} onChange={(event) => updateForm('bankName', event.target.value)} />
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
                    <input className={inputClass()} value={entry.institutionName} onChange={(event) => updateEducation(index, 'institutionName', event.target.value)} />
                  </Field>
                  <Field label="Board / University">
                    <input className={inputClass()} value={entry.boardUniversity} onChange={(event) => updateEducation(index, 'boardUniversity', event.target.value)} />
                  </Field>
                  <Field label="Specialization">
                    <input className={inputClass()} value={entry.specialization} onChange={(event) => updateEducation(index, 'specialization', event.target.value)} />
                  </Field>
                  <Field label="Passing Year">
                    <input className={inputClass()} value={entry.passingYear} onChange={(event) => updateEducation(index, 'passingYear', event.target.value)} />
                  </Field>
                  <Field label="Percentage / CGPA">
                    <input className={inputClass()} value={entry.score} onChange={(event) => updateEducation(index, 'score', event.target.value)} />
                  </Field>
                  <Field label="Upload Degree / Marksheet">
                    <label className={fileButtonClassName(Boolean(entry.file || entry.fileName))}>
                      <span>{entry.file ? entry.file.name : entry.fileName || 'Choose File'}</span>
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => updateEducation(index, 'file', event.target.files?.[0] || null)} />
                    </label>
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Experience" subtitle="Provide your most recent company name and total years of work experience.">
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Company Name">
              <input className={inputClass()} placeholder="e.g. ABC Technologies Pvt. Ltd." value={form.experienceCompanyName} onChange={(event) => updateForm('experienceCompanyName', event.target.value)} />
            </Field>
            <Field label="Total Years Of Experience">
              <input className={inputClass()} type="number" min="0" step="0.1" placeholder="e.g. 4" value={form.totalExperience} onChange={(event) => updateForm('totalExperience', event.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Certifications" subtitle="Add advanced certifications and upload supporting PDFs or certificates.">
          <div className="space-y-6">
            <div className="flex justify-end">
              <button type="button" onClick={addCertification} className="rounded-2xl bg-secondary-container px-5 py-3 text-sm font-bold text-on-surface">
                Add Certification
              </button>
            </div>

            {certificationEntries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-outline-variant/20 bg-surface px-5 py-6 text-sm text-on-surface-variant">
                No certifications added yet.
              </div>
            ) : null}

            {certificationEntries.map((entry) => (
              <div key={entry.id} className="rounded-[1.5rem] border border-slate-300 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-on-surface">Certification</h3>
                  <button type="button" onClick={() => removeCertification(entry.id)} className="text-sm font-semibold text-rose-700 hover:underline">
                    Remove
                  </button>
                </div>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Certification Name">
                    <input className={inputClass()} value={entry.certificationName} onChange={(event) => updateCertification(entry.id, 'certificationName', event.target.value)} />
                  </Field>
                  <Field label="Issuer">
                    <input className={inputClass()} value={entry.issuer} onChange={(event) => updateCertification(entry.id, 'issuer', event.target.value)} />
                  </Field>
                  <Field label="Issued Year">
                    <input className={inputClass()} value={entry.issuedYear} onChange={(event) => updateCertification(entry.id, 'issuedYear', event.target.value)} />
                  </Field>
                  <Field label="Upload Certificate">
                    <label className={fileButtonClassName(Boolean(entry.file || entry.fileName))}>
                      <span>{entry.file ? entry.file.name : entry.fileName || 'Choose File'}</span>
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => updateCertification(entry.id, 'file', event.target.files?.[0] || null)} />
                    </label>
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Documents Upload" subtitle="Upload the core compliance and onboarding documents for your employee file.">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {DOCUMENT_TYPES.map((document) => {
              const currentDocument = documents[document.key];
              const selectedFileName = currentDocument?.file ? currentDocument.file.name : currentDocument?.fileName || '';
              return (
                <Field key={document.key} label={document.label}>
                  <CompactUploadField
                    id={`document-${document.key}`}
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    title="Drop file here or click to browse"
                    helperText="PDF, JPG, PNG, WebP • Max 10 MB"
                    fileName={selectedFileName}
                    hasFile={Boolean(selectedFileName)}
                    onChange={(event) => setDocuments((current) => ({
                      ...current,
                      [document.key]: { ...current[document.key], file: event.target.files?.[0] || null },
                    }))}
                  />
                </Field>
              );
            })}
          </div>
        </Section>

        <Section title="Declaration" subtitle="Confirm that the submitted details are correct.">
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Declaration Name">
              <input className={inputClass()} value={form.declarationName} onChange={(event) => updateForm('declarationName', event.target.value)} />
            </Field>
            <Field label="Declaration Date">
              <input className={inputClass()} type="date" value={form.declarationDate} onChange={(event) => updateForm('declarationDate', event.target.value)} />
            </Field>
          </div>
          <label className="mt-5 inline-flex items-center gap-3 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={form.declarationAccepted} onChange={(event) => updateForm('declarationAccepted', event.target.checked)} />
            I confirm that all information provided in this form is accurate to the best of my knowledge.
          </label>
        </Section>

        <div className="flex flex-wrap justify-end gap-4 pb-8">
          <button type="button" disabled={saving} onClick={() => submitForm('save_draft')} className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-800 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button type="button" disabled={saving} onClick={() => submitForm('submit')} className="rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-on-primary disabled:opacity-60">
            {saving ? 'Submitting...' : 'Final Submit'}
          </button>
        </div>

        {modal ? (
          <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/18 px-4 py-6 backdrop-blur-[3px]">
            <div className={`w-full max-w-[560px] overflow-hidden rounded-[2rem] border p-7 shadow-[0_28px_72px_rgba(15,23,42,0.20)] ${modal.type === 'success' ? 'border-emerald-200 bg-[linear-gradient(145deg,#ffffff_0%,#f4fff8_50%,#eafff1_100%)]' : 'border-rose-200 bg-[linear-gradient(145deg,#ffffff_0%,#fff8f8_50%,#fff0f0_100%)]'}`}>
              <div className="flex items-start gap-4">
                <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] ${modal.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  <span className="text-3xl font-bold">{modal.type === 'success' ? '✓' : '!'}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[1.8rem] font-extrabold leading-none text-slate-900">{modal.title}</p>
                  <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-slate-600">{modal.text}</p>
                </div>
              </div>
              <div className="mt-7 flex justify-end">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className={`rounded-full px-6 py-2.5 text-sm font-extrabold shadow-sm transition ${modal.type === 'success' ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200' : 'bg-rose-100 text-rose-900 hover:bg-rose-200'}`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
