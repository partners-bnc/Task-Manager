'use client';

import Image from 'next/image';
import React, { useMemo, useState } from 'react';
import { formatEmploymentValue, getEmployeeTypeLabel } from '@/utils/hrm-employment';

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{label}</p>
      <p className="text-xs font-semibold text-on-surface">{value || 'Not available'}</p>
    </div>
  );
}

function formatSalary(value?: string | number | null) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'Not available';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(numeric);
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatStatus(status?: string | null) {
  return formatEmploymentValue(status || 'active');
}

function formatReportingTarget(employee?: any) {
  const name = employee?.reporting_manager_name || employee?.directory_reporting_manager || 'Not assigned';
  const kind = employee?.reporting_manager_kind || '';

  if (!employee?.reporting_manager_name && !employee?.directory_reporting_manager) {
    return name;
  }

  if (kind === 'super_admin') {
    return `${name} (Super Admin)`;
  }

  return name;
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

  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getDocumentIcon(documentType?: string | null, fileName?: string | null) {
  const normalizedType = String(documentType || '').toLowerCase();
  const extension = String(fileName || '').split('.').pop()?.toLowerCase();

  if (normalizedType.includes('aadhaar') || normalizedType.includes('pan') || normalizedType.includes('passport')) {
    return 'badge';
  }

  if (normalizedType.includes('salary')) return 'receipt_long';
  if (normalizedType.includes('letter')) return 'description';
  if (extension === 'pdf') return 'picture_as_pdf';
  if (['jpg', 'jpeg', 'png', 'webp'].includes(extension || '')) return 'image';

  return 'folder_open';
}

export default function Profile({ employee }: { employee?: any }) {
  const [activeSection, setActiveSection] = useState('personal');

  const name = employee?.name || 'Employee';
  const employeeId = employee?.employee_id || 'Not assigned';
  const loginId = employee?.employee_id || employee?.email || 'Not assigned';
  const designation = employee?.designation?.title || employee?.resolved_designation_title || employee?.role || 'Employee';
  const department = employee?.department?.name || employee?.resolved_department_name || 'Unassigned';
  const avatar = employee?.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=F3E8FF&color=6D28D9`;

  const lifecycleStatus = formatStatus(employee?.employment_lifecycle_status || employee?.employee_status);
  const currentStage = formatStatus(employee?.current_stage);
  const employeeType = getEmployeeTypeLabel(employee?.resolved_employee_type || employee?.employee_type);
  const reportingManager = formatReportingTarget(employee);
  const workPhone = pickFirstText(employee?.phone, employee?.mobile_phone, employee?.alternate_phone, 'Not available');
  const moduleAccess = Array.isArray(employee?.module_access) ? employee.module_access[0] : employee?.module_access;
  const address = pickFirstText(
    employee?.address,
    [employee?.city, employee?.district, employee?.state, employee?.country].filter(Boolean).join(', ')
  ) || 'Not available';
  const documents = useMemo(() => {
    if (!Array.isArray(employee?.documents)) return [];

    return [...employee.documents].sort((left: any, right: any) => {
      const leftTime = new Date(left?.updated_at || left?.created_at || 0).getTime();
      const rightTime = new Date(right?.updated_at || right?.created_at || 0).getTime();
      return rightTime - leftTime;
    });
  }, [employee?.documents]);

  const sections = [
    { id: 'personal', label: 'Personal Info' },
    { id: 'job', label: 'Job Details' },
    { id: 'documents', label: 'Documents' },
    { id: 'performance', label: 'Performance' },
    { id: 'skills', label: 'Skills & Certs' },
  ];

  function renderPersonalSection() {
    return {
      main: (
        <div className="bg-surface-container-lowest p-6 rounded-3xl editorial-shadow">
          <h2 className="text-lg font-bold font-headline mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">badge</span>
            Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
            <InfoRow label="Full Name" value={name} />
            <InfoRow label="Login ID" value={loginId} />
            <InfoRow label="Employee Code" value={employeeId} />
            <InfoRow label="Date of Joining" value={formatDate(employee?.date_of_joining)} />
            <InfoRow label="Designation" value={designation} />
            <InfoRow label="Nationality" value={employee?.nationality} />
            <InfoRow label="Marital Status" value={employee?.marital_status} />
            <InfoRow label="Date of Birth" value={formatDate(employee?.date_of_birth)} />
          </div>

          <div className="mt-8 pt-6 border-t border-outline-variant/10">
            <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant text-base">alternate_email</span>
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant">Work Email</p>
                  <p className="text-xs font-semibold text-on-surface mt-0.5">{employee?.email || 'Not available'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant text-base">call</span>
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant">Phone Number</p>
                  <p className="text-xs font-semibold text-on-surface mt-0.5">{workPhone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 md:col-span-2">
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant text-base">location_on</span>
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant">Current Address</p>
                  <p className="text-xs font-semibold text-on-surface mt-0.5">{address}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      side: (
        <>
          <div className="bg-surface-container-lowest p-6 rounded-3xl editorial-shadow">
            <h3 className="text-base font-bold font-headline mb-5">Profile Snapshot</h3>
            <div className="space-y-5">
              <InfoRow label="Lifecycle Status" value={lifecycleStatus} />
              <InfoRow label="Employee Type" value={employeeType} />
              <InfoRow label="Current Stage" value={currentStage} />
              <InfoRow label="Department" value={department} />
              <InfoRow label="Designation" value={designation} />
              <InfoRow label="Reporting To" value={reportingManager} />
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-3xl editorial-shadow">
            <h3 className="text-base font-bold font-headline mb-5">Quick Contact</h3>
            <div className="space-y-3 text-sm text-on-surface-variant">
              <p>{employee?.email || 'No work email available.'}</p>
              <p>{workPhone}</p>
            </div>
          </div>
        </>
      ),
    };
  }

  function renderJobSection() {
    return {
      main: (
        <div className="bg-surface-container-lowest p-6 rounded-3xl editorial-shadow">
          <h2 className="text-lg font-bold font-headline mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">business_center</span>
            Job Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
            <InfoRow label="Department" value={department} />
            <InfoRow label="Designation" value={designation} />
            <InfoRow label="Reporting To" value={reportingManager} />
            <InfoRow label="Lifecycle Status" value={lifecycleStatus} />
            <InfoRow label="Employee Type" value={employeeType} />
            <InfoRow label="Current Stage" value={currentStage} />
            <InfoRow label="Date of Joining" value={formatDate(employee?.date_of_joining)} />
            <InfoRow label="Confirmation Date" value={formatDate(employee?.confirmation_date)} />
            <InfoRow label="Salary" value={formatSalary(employee?.salary)} />
            <InfoRow label="Current Company Experience" value={employee?.current_company_experience} />
            <InfoRow label="Total Experience" value={employee?.total_experience} />
            <InfoRow label="Previous Experience" value={employee?.previous_experience} />
            <InfoRow label="Working Schedule" value={employee?.working_schedule_label} />
            <InfoRow label="Second Saturday Off" value={employee?.second_saturday_off ? 'Yes' : 'No'} />
            <InfoRow label="Task Manager Access" value={moduleAccess?.task_manager ? 'Enabled' : 'Not enabled'} />
          </div>
        </div>
      ),
      side: (
        <>
          <div className="bg-surface-container-lowest p-6 rounded-3xl editorial-shadow">
            <h3 className="text-base font-bold font-headline mb-5">Employment Summary</h3>
            <div className="space-y-5">
              <InfoRow label="Employee ID" value={employeeId} />
              <InfoRow label="Join Date" value={formatDate(employee?.date_of_joining)} />
              <InfoRow label="Company" value={employee?.company} />
              <InfoRow label="Salary" value={formatSalary(employee?.salary)} />
              <InfoRow label="Division" value={employee?.division} />
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-3xl editorial-shadow">
            <h3 className="text-base font-bold font-headline mb-5">Manager Notes</h3>
            <div className="text-sm text-on-surface-variant">
              Reporting structure and additional role details will continue to appear here as HR completes the employee setup.
            </div>
          </div>
        </>
      ),
    };
  }

  function renderDocumentsSection() {
    return {
      main: (
        <div className="bg-surface-container-lowest p-6 rounded-3xl editorial-shadow">
          <h2 className="text-lg font-bold font-headline mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">folder_open</span>
            Documents
          </h2>
          <div className="space-y-4">
            {documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-outline-variant/20 bg-surface-container-low px-4 py-8 text-sm text-on-surface-variant">
                Documents uploaded by HR will appear here once they are available.
              </div>
            ) : (
              documents.map((item: any) => (
                <a
                  key={item.id}
                  href={item.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-4 rounded-2xl border border-outline-variant/10 bg-surface p-4 transition hover:border-primary/20 hover:bg-surface-container-low"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <span className="material-symbols-outlined">{getDocumentIcon(item.document_type, item.file_name)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-on-surface">{pickFirstText(item.file_name, 'Employee Document')}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">{formatDocumentLabel(item.document_type)}</p>
                    <p className="mt-2 text-[11px] text-on-surface-variant">Updated {formatDate(item.updated_at || item.created_at)}</p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant">open_in_new</span>
                </a>
              ))
            )}
          </div>
        </div>
      ),
      side: (
        <>
          <div className="bg-surface-container-lowest p-6 rounded-3xl editorial-shadow">
            <h3 className="text-base font-bold font-headline mb-5">Document Summary</h3>
            <div className="space-y-5">
              <InfoRow label="Uploaded Files" value={String(documents.length)} />
              <InfoRow label="Latest Update" value={formatDate(documents[0]?.updated_at || documents[0]?.created_at)} />
              <InfoRow label="Employee Code" value={employeeId} />
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-3xl editorial-shadow">
            <h3 className="text-base font-bold font-headline mb-5">Access</h3>
            <div className="text-sm text-on-surface-variant">
              These records are view-only for employees. Uploads and edits are managed by HR.
            </div>
          </div>
        </>
      ),
    };
  }

  function renderPerformanceSection() {
    return {
      main: (
        <div className="bg-surface-container-lowest p-6 rounded-3xl editorial-shadow">
          <h2 className="text-lg font-bold font-headline mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">monitoring</span>
            Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-surface-container-low p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Current Status</p>
              <p className="mt-3 text-lg font-bold text-on-surface">No active review cycle</p>
              <p className="mt-2 text-sm text-on-surface-variant">Performance reviews assigned by HR or managers will appear here.</p>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Manager Feedback</p>
              <p className="mt-3 text-lg font-bold text-on-surface">Awaiting updates</p>
              <p className="mt-2 text-sm text-on-surface-variant">You will be able to view published feedback once it is shared internally.</p>
            </div>
          </div>
        </div>
      ),
      side: (
        <>
          <div className="bg-surface-container-lowest p-6 rounded-3xl editorial-shadow">
            <h3 className="text-base font-bold font-headline mb-5">Review Snapshot</h3>
            <div className="space-y-5">
              <InfoRow label="Last Published Review" value="Not available" />
              <InfoRow label="Goals" value="Not linked yet" />
              <InfoRow label="Appraisal Status" value="No pending action" />
            </div>
          </div>
        </>
      ),
    };
  }

  function renderSkillsSection() {
    return {
      main: (
        <div className="space-y-6">
          <div className="bg-surface-container-lowest p-6 rounded-3xl editorial-shadow">
            <h2 className="text-lg font-bold font-headline mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">workspace_premium</span>
              Skills
            </h2>
            <div className="text-sm text-on-surface-variant">
              Skills are not linked yet.
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-3xl editorial-shadow">
            <h2 className="text-lg font-bold font-headline mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">military_tech</span>
              Certifications
            </h2>
            <div className="text-sm text-on-surface-variant">
              Certifications will appear here after they are uploaded from HR.
            </div>
          </div>
        </div>
      ),
      side: (
        <>
          <div className="bg-surface-container-lowest p-6 rounded-3xl editorial-shadow">
            <h3 className="text-base font-bold font-headline mb-5">Development Summary</h3>
            <div className="space-y-5">
              <InfoRow label="Skill Records" value="0 linked" />
              <InfoRow label="Certifications" value="0 uploaded" />
              <InfoRow label="Learning Status" value="Managed by HR" />
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-3xl editorial-shadow">
            <h3 className="text-base font-bold font-headline mb-5">Team Members</h3>
            <div className="space-y-3 text-sm text-on-surface-variant">
              <p>Team details will appear here once reporting structure is configured.</p>
            </div>
            <button className="w-full mt-6 py-2 border border-outline-variant/20 text-[10px] font-bold text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors">
              View Org Chart
            </button>
          </div>
        </>
      ),
    };
  }

  let sectionContent = renderPersonalSection();
  if (activeSection === 'job') sectionContent = renderJobSection();
  if (activeSection === 'documents') sectionContent = renderDocumentsSection();
  if (activeSection === 'performance') sectionContent = renderPerformanceSection();
  if (activeSection === 'skills') sectionContent = renderSkillsSection();

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 bg-surface-container-lowest p-6 rounded-3xl flex flex-col md:flex-row gap-6 items-center md:items-start relative overflow-hidden editorial-shadow">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>

          <div className="relative z-10">
            <Image
              className="w-32 h-32 rounded-2xl object-cover shadow-xl shadow-on-surface/5 border-4 border-surface-container-lowest"
              alt={`${name} profile avatar`}
              src={avatar}
              width={128}
              height={128}
              unoptimized={!employee?.profile_picture_url}
            />
            <div className="absolute -bottom-2 -right-2 bg-primary text-on-primary p-2 rounded-lg shadow-lg">
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-3 text-center md:text-left z-10">
            <div>
              <h1 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">{name}</h1>
              <p className="text-primary font-semibold text-sm mt-1">
                {designation} <span className="text-on-surface-variant font-medium mx-1">|</span>
                <span className="text-on-surface-variant font-medium">{department}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-3 items-center justify-center md:justify-start">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-container-low rounded-full">
                <span className="material-symbols-outlined text-sm text-on-surface-variant">id_card</span>
                <span className="text-[10px] font-medium text-on-surface-variant">{loginId}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-secondary-container rounded-full">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="text-[10px] font-bold text-on-secondary-container uppercase tracking-wider">Active Now</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-3 justify-center md:justify-start">
              <a
                href={employee?.email ? `mailto:${employee.email}` : '#'}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-surface-container-low text-on-surface rounded-lg font-bold text-xs hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-sm">mail</span>
                Email
              </a>
              <button className="flex items-center justify-center w-9 h-9 bg-surface-container-low text-on-surface rounded-lg hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined text-sm">chat</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 grid grid-cols-2 gap-4">
          <div className="bg-surface-container-lowest p-5 rounded-3xl flex flex-col justify-center items-center text-center editorial-shadow">
            <span className="text-2xl font-extrabold font-headline text-on-surface">{status}</span>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Status</span>
          </div>
          <div className="bg-tertiary-container p-5 rounded-3xl flex flex-col justify-center items-center text-center editorial-shadow">
            <span className="text-2xl font-extrabold font-headline text-on-tertiary-container">{department}</span>
            <span className="text-[10px] font-bold text-on-tertiary-container uppercase tracking-widest mt-1">Department</span>
          </div>
          <div className="col-span-2 bg-surface-container-lowest p-5 rounded-3xl flex items-center gap-3 editorial-shadow">
            <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-xl">work_history</span>
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">{employee?.current_company_experience || 'Not available'}</p>
              <p className="text-[10px] text-on-surface-variant mt-0.5">Experience</p>
            </div>
          </div>
        </div>
      </section>

      <nav className="flex items-center gap-8 border-b border-outline-variant/15 overflow-x-auto no-scrollbar pt-4">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActiveSection(section.id)}
            className={`pb-4 whitespace-nowrap transition-colors ${
              activeSection === section.id
                ? 'text-sm font-bold text-primary border-b-2 border-primary'
                : 'text-sm font-medium text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {section.label}
          </button>
        ))}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {sectionContent.main}
        </div>

        <div className="lg:col-span-4 space-y-6">
          {sectionContent.side}
        </div>
      </div>
    </div>
  );
}
