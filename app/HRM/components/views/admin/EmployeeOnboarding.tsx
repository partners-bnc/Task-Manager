'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import EmployeePageHeader from '../../ui/EmployeePageHeader';
import HrmEmptyState from '../../ui/HrmEmptyState';
import { LoadingPanel } from '../../ui/Skeleton';
import { useHrmFeedback } from '../../ui/HrmFeedback';
import AddEmployee from './AddEmployee';

const FILTERS = [
  { key: 'all', label: 'All Active' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'approved', label: 'Approved' },
  { key: 'changes_requested', label: 'Changes Requested' },
  { key: 'converted', label: 'Converted' },
];

function formatDateTime(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getExpiryHint(expiresAt?: string | null) {
  if (!expiresAt) {
    return 'This secure one-time link can be copied now and regenerated later if needed.';
  }

  const expiresAtDate = new Date(expiresAt);
  if (Number.isNaN(expiresAtDate.getTime())) {
    return `This secure one-time link expires on ${expiresAt}. Copy it now or regenerate it later from this onboarding request.`;
  }

  const remainingMs = expiresAtDate.getTime() - Date.now();
  const remainingDays = Math.max(0, Math.round(remainingMs / (24 * 60 * 60 * 1000)));
  const durationLabel = remainingDays === 1 ? '1 day' : `${remainingDays} days`;

  return `This secure one-time link is valid for ${durationLabel} and will expire on ${formatDateTime(expiresAt)}. Copy it now or regenerate it later from this onboarding request.`;
}

function statusLabel(status?: string | null) {
  return String(status || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Unknown';
}

function humanizeText(value?: string | null) {
  return String(value || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || '--';
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-b-0">
      <div className="flex items-start gap-4">
        <p className="w-[180px] shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <p className="min-w-0 text-sm font-medium text-slate-900">{value || '--'}</p>
      </div>
    </div>
  );
}

function ReviewSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-slate-200 pb-6 last:border-b-0">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

export default function EmployeeOnboarding({
  onConvertOnboarding,
  currentTab = 'admin-onboarding',
  setCurrentTab,
  onboardingRequestId = null,
  setOnboardingRequestId,
}: {
  onConvertOnboarding: (requestId: string) => void;
  currentTab?: string;
  setCurrentTab?: (tab: string) => void;
  onboardingRequestId?: string | null;
  setOnboardingRequestId?: (requestId: string | null) => void;
}) {
  const { showFeedback } = useHrmFeedback();
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [filter, setFilter] = useState('all');
  const [inviteForm, setInviteForm] = useState({ candidateName: '', candidateEmail: '', sendEmail: true });
  const [reviewNote, setReviewNote] = useState('');
  const activeMode = currentTab === 'admin-add-employee' ? 'add' : 'queue';

  const showInviteLinkCard = useCallback((title: string, inviteLink: string, expiresAt?: string | null) => {
    showFeedback({
      type: 'success',
      title,
      message: 'The onboarding invite is ready to share with the candidate.',
      linkLabel: 'Invite Link',
      linkValue: inviteLink,
      linkHint: getExpiryHint(expiresAt),
      secondaryActionLabel: 'Copy Link',
      onSecondaryAction: async () => {
        if (typeof window === 'undefined') return;
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(inviteLink);
          return;
        }

        const textArea = document.createElement('textarea');
        textArea.value = inviteLink;
        textArea.setAttribute('readonly', 'true');
        textArea.style.position = 'absolute';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      },
      confirmLabel: 'OK',
    });
  }, [showFeedback]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/HRM/api/admin/onboarding');
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to load onboarding requests');
      }
      setRequests(Array.isArray(result?.requests) ? result.requests : []);
      setSelectedId((current) => current || result?.requests?.[0]?.id || null);
    } catch (error: any) {
      showFeedback({ type: 'error', title: 'Load Failed', message: error.message || 'Failed to load onboarding requests' });
    } finally {
      setLoading(false);
    }
  }, [showFeedback]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const response = await fetch(`/HRM/api/admin/onboarding/${id}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to load onboarding detail');
      }
      setDetail(result);
      setReviewNote(result?.request?.review_note || '');
    } catch (error: any) {
      showFeedback({ type: 'error', title: 'Load Failed', message: error.message || 'Failed to load onboarding detail' });
    } finally {
      setDetailLoading(false);
    }
  }, [showFeedback]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    loadDetail(selectedId);
  }, [loadDetail, selectedId]);

  const filteredRequests = useMemo(() => {
    if (filter === 'all') {
      return requests.filter((item) => item.status !== 'converted');
    }
    return requests.filter((item) => item.status === filter);
  }, [filter, requests]);

  async function handleCreateInvite(event: React.FormEvent) {
    event.preventDefault();
    setBusyAction('create');
    try {
      const response = await fetch('/HRM/api/admin/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to create onboarding invite');
      }
      setInviteForm({ candidateName: '', candidateEmail: '', sendEmail: true });
      await loadRequests();
      if (result?.request?.id) {
        setSelectedId(result.request.id);
      }
      if (result?.inviteLink) {
        showInviteLinkCard('Invite Created', result.inviteLink, result?.request?.token_expires_at);
      } else {
        showFeedback({ type: 'success', title: 'Invite Created', message: 'Onboarding invite created successfully.' });
      }
    } catch (error: any) {
      showFeedback({ type: 'error', title: 'Invite Failed', message: error.message || 'Failed to create invite' });
    } finally {
      setBusyAction('');
    }
  }

  async function runAction(action: string, sendEmail = true) {
    if (!selectedId) return;
    setBusyAction(action);
    try {
      const response = await fetch(`/HRM/api/admin/onboarding/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reviewNote,
          sendEmail,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to update onboarding request');
      }

      setDetail(result);
      await loadRequests();
      if (result?.inviteLink) {
        showInviteLinkCard(action === 'regenerate_link' ? 'Link Regenerated' : 'Invite Link Ready', result.inviteLink, result?.request?.token_expires_at);
      } else {
        showFeedback({ type: 'success', title: 'Saved', message: `Onboarding request ${statusLabel(action)}.` });
      }
    } catch (error: any) {
      showFeedback({ type: 'error', title: 'Action Failed', message: error.message || 'Failed to update onboarding request' });
    } finally {
      setBusyAction('');
    }
  }

  if (loading) {
    return <LoadingPanel title="Loading onboarding workspace" message="Preparing candidate onboarding requests and review queue." />;
  }

  const switchAction = (
    <div className="inline-flex rounded-full bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] p-1 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      {[
        { id: 'queue', label: 'Current Onboarding', icon: 'how_to_reg' },
        { id: 'add', label: 'Add New Employee', icon: 'person_add' },
      ].map((option) => {
        const isActive = activeMode === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              if (option.id === 'queue') {
                setCurrentTab?.('admin-onboarding');
                return;
              }

              setCurrentTab?.('admin-add-employee');
            }}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
              isActive
                ? 'bg-[linear-gradient(180deg,#eadcff_0%,#cfbdfd_100%)] text-violet-950 shadow-[0_10px_18px_rgba(167,139,250,0.16)]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{option.icon}</span>
            {option.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-7 py-7 pb-10">
      <EmployeePageHeader
        icon="how_to_reg"
        title="Employee Onboarding"
        description="Invite candidates, collect onboarding details through secure one-time links, review submissions, and continue into Add New Employee only after approval."
        action={switchAction}
      />

      {activeMode === 'add' ? (
        <div className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest shadow-sm">
          <AddEmployee
            embedded
            setCurrentTab={setCurrentTab}
            cancelTab="admin-onboarding"
            onboardingRequestId={onboardingRequestId}
            onConvertedOnboarding={() => {
              setOnboardingRequestId?.(null);
              setCurrentTab?.('admin-onboarding');
            }}
          />
        </div>
      ) : (
      <div className="grid gap-6 xl:grid-cols-[360px,minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
            <h2 className="text-lg font-bold text-on-surface">Create Invite</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Start with candidate name and email. We will create a secure onboarding link.</p>
            <form className="mt-5 space-y-4" onSubmit={handleCreateInvite}>
              <input
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                placeholder="Candidate full name"
                value={inviteForm.candidateName}
                onChange={(event) => setInviteForm((current) => ({ ...current, candidateName: event.target.value }))}
              />
              <input
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                placeholder="Candidate email"
                type="email"
                value={inviteForm.candidateEmail}
                onChange={(event) => setInviteForm((current) => ({ ...current, candidateEmail: event.target.value }))}
              />
              <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={inviteForm.sendEmail}
                  onChange={(event) => setInviteForm((current) => ({ ...current, sendEmail: event.target.checked }))}
                />
                Queue invite email automatically
              </label>
              <button
                type="submit"
                disabled={busyAction === 'create'}
                className="w-full rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-on-primary disabled:opacity-70"
              >
                {busyAction === 'create' ? 'Creating...' : 'Create Onboarding Invite'}
              </button>
            </form>
          </section>

          <section className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => {
                const active = filter === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active ? 'bg-primary text-on-primary' : 'bg-slate-100 text-slate-700'}`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-3">
              {filteredRequests.length === 0 ? (
                <HrmEmptyState title="No onboarding requests" message="New candidate invites and submissions will appear here." />
              ) : (
                <div className="overflow-hidden rounded-[1.5rem] border border-slate-200">
                  <div className="hidden grid-cols-[minmax(180px,1.2fr)_minmax(220px,1.5fr)_minmax(150px,1fr)_minmax(150px,1fr)_120px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 md:grid">
                    <span>Name</span>
                    <span>Email</span>
                    <span>Created</span>
                    <span>Submitted</span>
                    <span>Status</span>
                  </div>

                  <div className="divide-y divide-slate-200">
                    {filteredRequests.map((item) => {
                      const active = selectedId === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          className={`w-full px-5 py-4 text-left transition ${
                            active ? 'bg-violet-50' : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="grid gap-3 md:grid-cols-[minmax(180px,1.2fr)_minmax(220px,1.5fr)_minmax(150px,1fr)_minmax(150px,1fr)_120px] md:items-center">
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 md:hidden">Name</p>
                              <p className="truncate text-sm font-bold text-slate-900">{item.candidate_name}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 md:hidden">Email</p>
                              <p className="truncate text-sm text-slate-600">{item.candidate_email}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 md:hidden">Created</p>
                              <p className="text-sm text-slate-600">{formatDateTime(item.created_at)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 md:hidden">Submitted</p>
                              <p className="text-sm text-slate-600">{formatDateTime(item.submitted_at)}</p>
                            </div>
                            <div className="md:text-right">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 md:hidden">Status</p>
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                active ? 'bg-white text-violet-700' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {statusLabel(item.status)}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
          {!selectedId ? (
            <HrmEmptyState title="Select an onboarding request" message="Choose an invite or submission from the left to review candidate details and take action." />
          ) : detailLoading ? (
            <LoadingPanel title="Loading request detail" message="Pulling candidate submission, documents, and review history." />
          ) : !detail?.request ? (
            <HrmEmptyState title="Request not found" message="This onboarding request could not be loaded." />
          ) : (
            <div className="space-y-6">
              <ReviewSection title="Candidate" subtitle="Submitted candidate identity and invite details.">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.35rem] border border-slate-200 bg-slate-100">
                      {detail.request.profile_picture_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={detail.request.profile_picture_url}
                          alt={detail.request.candidate_name || 'Candidate'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">No Photo</span>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Candidate</p>
                      <h2 className="mt-2 text-[1.8rem] font-bold leading-tight text-on-surface">{detail.request.candidate_name}</h2>
                      <p className="mt-2 text-sm text-on-surface-variant">{detail.request.candidate_email}</p>
                      {detail.request.profile_picture_url ? (
                        <a
                          href={detail.request.profile_picture_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex text-xs font-semibold text-sky-700 hover:text-sky-800"
                        >
                          View profile picture
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-800">
                      {statusLabel(detail.request.status)}
                    </div>
                    <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                      Submitted: {formatDateTime(detail.request.submitted_at)}
                    </div>
                  </div>
                </div>
              </ReviewSection>

              <ReviewSection title="Personal Information" subtitle="Candidate personal and contact details exactly as submitted in the form.">
                <div className="space-y-1">
                  <DetailField label="Phone" value={detail.request.phone} />
                  <DetailField label="Personal Email" value={detail.request.personal_email} />
                  <DetailField label="Date Of Birth" value={detail.request.date_of_birth} />
                  <DetailField label="Gender" value={detail.request.gender} />
                  <DetailField label="Blood Group" value={detail.request.blood_group} />
                  <DetailField label="Father Name" value={detail.request.father_name} />
                  <DetailField label="Marital Status" value={detail.request.marital_status} />
                  <DetailField label="Spouse Name" value={detail.request.spouse_name} />
                  <DetailField label="Nationality" value={detail.request.nationality} />
                  <DetailField label="Religion" value={detail.request.religion} />
                  <DetailField label="Emergency Contact" value={detail.request.emergency_contact_name} />
                  <DetailField label="Emergency Number" value={detail.request.emergency_contact_number} />
                </div>
              </ReviewSection>

              <ReviewSection title="Current Address" subtitle="Current address and active contact details submitted by the candidate.">
                <div className="space-y-1">
                  <DetailField label="Address" value={detail.request.address} />
                  <DetailField label="City" value={detail.request.city} />
                  <DetailField label="District" value={detail.request.district} />
                  <DetailField label="State" value={detail.request.state} />
                  <DetailField label="Country" value={detail.request.country} />
                  <DetailField label="Pincode" value={detail.request.pincode} />
                  <DetailField label="Alternate Phone" value={detail.request.alternate_phone} />
                  <DetailField label="Mobile" value={detail.request.mobile_phone} />
                </div>
              </ReviewSection>

              <ReviewSection title="Permanent Address" subtitle="Permanent residential address from the submitted onboarding form.">
                <div className="space-y-1">
                  <DetailField label="Address" value={detail.request.permanent_address} />
                  <DetailField label="City" value={detail.request.permanent_city} />
                  <DetailField label="District" value={detail.request.permanent_district} />
                  <DetailField label="State" value={detail.request.permanent_state} />
                  <DetailField label="Country" value={detail.request.permanent_country} />
                  <DetailField label="Pincode" value={detail.request.permanent_pincode} />
                </div>
              </ReviewSection>

              <ReviewSection title="Identity & Financials" subtitle="Identity numbers, bank details, and experience details from the candidate submission.">
                <div className="space-y-1">
                  <DetailField label="Aadhaar" value={detail.request.aadhaar_number} />
                  <DetailField label="PAN" value={detail.request.pan_number} />
                  <DetailField label="Passport" value={detail.request.passport_number} />
                  <DetailField label="Bank Name" value={detail.request.bank_name} />
                  <DetailField label="Account Holder" value={detail.request.bank_account_holder_name} />
                  <DetailField label="Bank Account Number" value={detail.request.bank_account_number} />
                  <DetailField label="IFSC Code" value={detail.request.bank_ifsc} />
                  <DetailField label="Experience Company" value={detail.request.experience_company_name} />
                  <DetailField label="Total Experience" value={detail.request.total_experience} />
                </div>
              </ReviewSection>

              <div className="grid gap-6 xl:grid-cols-2">
                <ReviewSection title="Education" subtitle="Education records and uploaded supporting files.">
                  <div className="space-y-3">
                    {(detail.education || []).length === 0 ? (
                      <p className="text-sm text-slate-500">No education records submitted yet.</p>
                    ) : (
                      detail.education.map((entry: any) => (
                        <div key={entry.id} className="border-b border-slate-100 py-3 last:border-b-0">
                          <p className="font-semibold text-slate-900">{humanizeText(entry.education_level)}</p>
                          <div className="mt-3 space-y-1">
                            <DetailField label="Institution" value={entry.institution_name} />
                            <DetailField label="Board / University" value={entry.board_university} />
                            <DetailField label="Specialization" value={entry.specialization || 'No specialization'} />
                            <DetailField label="Passing Year" value={entry.passing_year ? String(entry.passing_year) : '--'} />
                            <DetailField label="Score" value={entry.score} />
                            <DetailField label="File" value={entry.degree_file_name || 'No file uploaded'} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ReviewSection>

                <ReviewSection title="Documents Upload" subtitle="Uploaded onboarding documents submitted by the candidate.">
                  <div className="space-y-3">
                    {(detail.documents || []).length === 0 ? (
                      <p className="text-sm text-slate-500">No documents uploaded yet.</p>
                    ) : (
                      detail.documents.map((entry: any) => (
                        <a
                          key={entry.id}
                          href={entry.file_url || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 text-sm text-slate-800 transition hover:text-slate-950 last:border-b-0"
                        >
                          <span className="font-medium text-slate-600">{humanizeText(entry.document_type)}</span>
                          <span className="truncate text-right font-semibold text-slate-900">{entry.file_name}</span>
                        </a>
                      ))
                    )}
                  </div>
                </ReviewSection>
              </div>

              <ReviewSection title="Review Note" subtitle="Add a short review note, correction instruction, or decision summary before taking action.">
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr),auto] xl:items-end">
                  <div>
                    <textarea
                      className="min-h-[120px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                      value={reviewNote}
                      onChange={(event) => setReviewNote(event.target.value)}
                      placeholder="Add HR review notes, correction instructions, or final decision comments."
                    />
                  </div>

                  <div className="flex flex-nowrap gap-3 overflow-x-auto pb-1 xl:justify-end">
                    <button
                      type="button"
                      disabled={busyAction === 'approve'}
                      onClick={() => runAction('approve', false)}
                      className="whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-70"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyAction === 'request_changes'}
                      onClick={() => runAction('request_changes', true)}
                      className="whitespace-nowrap rounded-full border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-bold text-sky-800 transition hover:bg-sky-100 disabled:opacity-70"
                    >
                      Request Changes
                    </button>
                    <button
                      type="button"
                      disabled={busyAction === 'regenerate_link'}
                      onClick={() => runAction('regenerate_link', true)}
                      className="whitespace-nowrap rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                    >
                      Regenerate Link
                    </button>
                    <button
                      type="button"
                      disabled={detail.request.status !== 'approved'}
                      onClick={() => {
                        setOnboardingRequestId?.(detail.request.id);
                        onConvertOnboarding(detail.request.id);
                      }}
                      className="whitespace-nowrap rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Continue To Add Employee
                    </button>
                  </div>
                </div>
              </ReviewSection>
            </div>
          )}
        </section>
      </div>
      )}
    </div>
  );
}
