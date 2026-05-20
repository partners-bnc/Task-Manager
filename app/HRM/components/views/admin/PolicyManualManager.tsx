'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import HrmEmptyState from '../../ui/HrmEmptyState';
import { useHrmFeedback } from '../../ui/HrmFeedback';

type PolicyDocument = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  viewUrl: string;
};

type PolicyItem = {
  id: string;
  title: string;
  summary: string;
  isPublished: boolean;
  updatedAt: string | null;
  documentCount: number;
  documents: PolicyDocument[];
};

type FormState = {
  title: string;
  summary: string;
};

const defaultForm: FormState = {
  title: '',
  summary: '',
};

function getPolicyIcon(index: number) {
  if (index % 3 === 0) return 'calendar_month';
  if (index % 3 === 1) return 'badge';
  return 'apartment';
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes?: number) {
  const size = Number(bytes || 0);
  if (!size) return 'Unknown size';
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${size} B`;
}

async function downloadFile(url: string, fileName: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to download document.');
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName || 'document';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export default function PolicyManualManager() {
  const { showFeedback, confirmFeedback } = useHrmFeedback();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [editingId, setEditingId] = useState('');
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;

    async function loadPolicies() {
      setLoading(true);
      try {
        const response = await fetch('/HRM/api/admin/policies', { method: 'GET' });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load policies');
        }

        if (active) {
          setPolicies(result.policies || []);
        }
      } catch (error) {
        if (active) {
          showFeedback({
            type: 'error',
            title: 'Policies Not Loaded',
            message: error instanceof Error ? error.message : 'Failed to load policies.',
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPolicies();
    return () => {
      active = false;
    };
  }, [showFeedback]);

  const filteredPolicies = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return policies;
    return policies.filter((policy) =>
      `${policy.title} ${policy.summary}`.toLowerCase().includes(query)
    );
  }, [policies, search]);

  const editingPolicy = editingId ? policies.find((policy) => policy.id === editingId) || null : null;

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId('');
    setNewFiles([]);
  };

  const handleEdit = (policy: PolicyItem) => {
    setEditingId(policy.id);
    setForm({
      title: policy.title,
      summary: policy.summary,
    });
    setNewFiles([]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim() || !form.summary.trim()) {
      showFeedback({
        type: 'warning',
        title: 'Policy Details Required',
        message: 'Add a policy title and summary before saving.',
      });
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();
      formData.append(
        'payload',
        JSON.stringify({
          title: form.title,
          summary: form.summary,
        })
      );
      newFiles.forEach((file) => formData.append('files', file));

      const endpoint = editingId ? `/HRM/api/admin/policies/${editingId}` : '/HRM/api/admin/policies';
      const method = editingId ? 'PATCH' : 'POST';
      const response = await fetch(endpoint, {
        method,
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save policy');
      }

      const savedPolicy = result.policy as PolicyItem;
      setPolicies((current) => {
        const exists = current.some((item) => item.id === savedPolicy.id);
        const next = exists
          ? current.map((item) => (item.id === savedPolicy.id ? savedPolicy : item))
          : [savedPolicy, ...current];
        return next.sort((left, right) => {
          const leftTime = new Date(left.updatedAt || 0).getTime();
          const rightTime = new Date(right.updatedAt || 0).getTime();
          return rightTime - leftTime;
        });
      });

      showFeedback({
        type: 'success',
        title: editingId ? 'Policy Updated' : 'Policy Added',
        message: editingId
          ? 'Policy details and attachments were updated successfully.'
          : 'Policy added successfully.',
      });
      resetForm();
    } catch (error) {
      showFeedback({
        type: 'error',
        title: 'Policy Not Saved',
        message: error instanceof Error ? error.message : 'Failed to save policy.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePolicy = async (policyId: string) => {
    const confirmed = await confirmFeedback({
      type: 'warning',
      title: 'Delete Policy',
      message: 'Delete this policy and all of its uploaded documents?',
      confirmLabel: 'Delete Policy',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/HRM/api/admin/policies/${policyId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete policy');
      }

      setPolicies((current) => current.filter((item) => item.id !== policyId));
      if (editingId === policyId) {
        resetForm();
      }
      showFeedback({
        type: 'success',
        title: 'Policy Deleted',
        message: 'Policy and attached documents were deleted successfully.',
      });
    } catch (error) {
      showFeedback({
        type: 'error',
        title: 'Policy Not Deleted',
        message: error instanceof Error ? error.message : 'Failed to delete policy.',
      });
    }
  };

  const handleDeleteDocument = async (policyId: string, documentId: string) => {
    const confirmed = await confirmFeedback({
      type: 'warning',
      title: 'Delete Document',
      message: 'Delete this document from the policy?',
      confirmLabel: 'Delete Document',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/HRM/api/admin/policies/${policyId}/documents/${documentId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete document');
      }

      setPolicies((current) =>
        current.map((policy) =>
          policy.id === policyId
            ? {
                ...policy,
                documents: policy.documents.filter((document) => document.id !== documentId),
                documentCount: Math.max(0, policy.documentCount - 1),
              }
            : policy
        )
      );

      showFeedback({
        type: 'success',
        title: 'Document Deleted',
        message: 'The selected policy document was removed successfully.',
      });
    } catch (error) {
      showFeedback({
        type: 'error',
        title: 'Document Not Deleted',
        message: error instanceof Error ? error.message : 'Failed to delete document.',
      });
    }
  };

  const handleLocalFileRemove = (index: number) => {
    setNewFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleViewPolicy = (policy: PolicyItem) => {
    const firstDocument = policy.documents[0];
    if (!firstDocument?.viewUrl) {
      showFeedback({
        type: 'warning',
        title: 'No PDF Available',
        message: 'This policy does not have a PDF document available to view yet.',
      });
      return;
    }

    window.open(firstDocument.viewUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="p-8 pb-14">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100/90 text-violet-700 shadow-sm">
                <span className="material-symbols-outlined text-[20px]">menu_book</span>
              </div>
              <h1 className="text-[2rem] font-headline font-bold text-on-background">Policy Manual</h1>
            </div>
            <p className="pl-[3.25rem] text-sm text-on-surface-variant">
              Review official company guidelines and procedures.
            </p>
          </div>

          <label className="relative block w-full max-w-sm lg:mt-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[19px]">
              search
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search policies..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
            />
          </label>
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
          <section>
            {loading ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[232px] animate-pulse rounded-[1.5rem] border border-slate-200 bg-white"
                  />
                ))}
              </div>
            ) : filteredPolicies.length === 0 ? (
              <HrmEmptyState
                compact
                icon="policy"
                title={search ? 'No matching policies' : 'No policies added yet'}
                message={
                  search
                    ? 'Try a different search term or clear the search to see all policy entries.'
                    : 'Create the first policy so employees can start reading the policy manual.'
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {filteredPolicies.map((policy, index) => (
                  <article
                    key={policy.id}
                    className="group rounded-[1.55rem] border border-slate-100 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_22px_42px_rgba(109,40,217,0.14)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-xl font-headline font-bold text-on-surface">{policy.title}</h3>
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-on-surface-variant">{policy.summary || '-'}</p>
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 transition-colors duration-200 group-hover:bg-violet-700 group-hover:text-white">
                        <span className="material-symbols-outlined text-[21px]">{getPolicyIcon(index)}</span>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-4">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Updated</p>
                        <p className="mt-2 text-sm leading-5 text-on-surface">{formatDateTime(policy.updatedAt)}</p>
                      </div>
                      <div className="flex items-end justify-end">
                        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                          {policy.documentCount} {policy.documentCount === 1 ? 'doc' : 'docs'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewPolicy(policy)}
                        className="rounded-xl bg-violet-100 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-200"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(policy)}
                        className="rounded-xl bg-violet-100 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePolicy(policy.id)}
                        className="rounded-xl bg-violet-100 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-200"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="self-start rounded-[1.75rem] border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm xl:sticky xl:top-8">
            <div className="mb-6">
              <h2 className="text-[1.45rem] font-bold text-on-surface">{editingId ? 'Edit Policy' : 'Add Policy'}</h2>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Policy Title</span>
                <input
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Attendance Policy"
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Policy Summary</span>
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  value={form.summary}
                  onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                  placeholder="Brief summary of this policy"
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  {editingId ? 'Add More Documents' : 'Upload Documents'}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,application/pdf"
                  onChange={(event) => setNewFiles(Array.from(event.target.files || []))}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="group flex min-h-44 w-full flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-slate-300 bg-[linear-gradient(180deg,rgba(250,251,255,1)_0%,rgba(255,255,255,1)_100%)] px-6 py-7 text-center transition hover:border-violet-300 hover:bg-violet-50/30"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition group-hover:bg-violet-100 group-hover:text-violet-700">
                    <span className="material-symbols-outlined text-[24px]">upload</span>
                  </span>
                  <span className="mt-5 text-[1.02rem] font-semibold text-slate-800">
                    Drop document here or click to browse
                  </span>
                  <span className="mt-2 text-sm text-slate-400">
                    PDF only • Max 20 MB
                  </span>
                </button>
              </label>

              {newFiles.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">New Uploads</p>
                  <div className="mt-3 space-y-2">
                    {newFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-on-surface">{file.name}</p>
                          <p className="mt-1 text-xs text-on-surface-variant">{formatFileSize(file.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleLocalFileRemove(index)}
                          className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {editingPolicy?.documents?.length ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">Existing Documents</p>
                  <div className="mt-3 space-y-3">
                    {editingPolicy.documents.map((document) => (
                      <div key={document.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-on-surface">{document.fileName}</p>
                            <p className="mt-1 text-xs text-on-surface-variant">{formatFileSize(document.fileSizeBytes)}</p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => downloadFile(document.viewUrl, document.fileName).catch((error) => {
                                showFeedback({
                                  type: 'error',
                                  title: 'Download Failed',
                                  message: error instanceof Error ? error.message : 'Unable to download the file right now.',
                                });
                              })}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-on-surface"
                            >
                              Download
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(editingPolicy.id, document.id)}
                              className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Policy' : 'Add Policy'}
                </button>
                {(editingId || newFiles.length > 0 || form.title || form.summary !== defaultForm.summary) && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-2xl border border-outline-variant/15 bg-surface px-6 py-3 text-sm font-bold text-on-surface"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
