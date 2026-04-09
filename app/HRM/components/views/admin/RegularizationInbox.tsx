'use client';

import React, { useEffect, useState } from 'react';

type InboxTab = 'pending' | 'cc' | 'history';

interface AdminRegularizationItem {
  id: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestType: string;
  timeRange: string;
  reason: string;
  appliedOn: string;
  currentStatusLabel?: string;
  sentToHr?: string;
  reportingManager?: string;
  approvalOutcome?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  canReview?: boolean;
  employeeName: string;
  employeeEmail: string;
  employeeCode: string;
}

function StatusBadge({ status }: { status: AdminRegularizationItem['status'] }) {
  const className =
    status === 'Approved'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'Rejected'
        ? 'bg-rose-50 text-rose-600'
        : 'bg-amber-50 text-amber-700';

  return <span className={`px-3 py-1 rounded-full text-xs font-bold ${className}`}>{status}</span>;
}

function RequestCard({
  item,
  onReview,
  isReviewing,
}: {
  item: AdminRegularizationItem;
  onReview: (id: string, decision: 'approved' | 'rejected', approvalOutcome?: 'full_day' | 'half_day') => Promise<void>;
  isReviewing: boolean;
}) {
  return (
    <div className="bg-surface-container-lowest rounded-[1.5rem] border border-outline-variant/10 p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-xl font-bold font-headline text-on-surface">{item.employeeName}</h3>
            <StatusBadge status={item.status} />
          </div>
          <p className="text-sm text-on-surface-variant mt-2">
            {item.employeeCode || 'Employee'} | {item.employeeEmail || '-'}
          </p>
          <p className="text-sm text-on-surface-variant mt-1">
            {item.date} | {item.requestType}
            {item.currentStatusLabel ? ` | Current status: ${item.currentStatusLabel}` : ''}
          </p>
        </div>

        <div className="text-sm text-on-surface-variant">Applied on {item.appliedOn}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <div className="rounded-2xl bg-surface-container-low p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">Requested Time</p>
          <p className="text-sm font-semibold text-on-surface">{item.timeRange}</p>
        </div>
        <div className="rounded-2xl bg-surface-container-low p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">Send To HR</p>
          <p className="text-sm font-semibold text-on-surface">{item.sentToHr || '-'}</p>
        </div>
        <div className="rounded-2xl bg-surface-container-low p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">Reporting Manager</p>
          <p className="text-sm font-semibold text-on-surface">{item.reportingManager || '-'}</p>
        </div>
        <div className="rounded-2xl bg-surface-container-low p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">Approval Result</p>
          <p className="text-sm font-semibold text-on-surface">{item.approvalOutcome || '-'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mt-4">
        <div className="rounded-2xl bg-surface-container-low p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">Reason</p>
          <p className="text-sm font-semibold text-on-surface">{item.reason}</p>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-outline-variant/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-sm text-on-surface-variant">
          {item.reviewedBy ? `Reviewed by ${item.reviewedBy}` : item.status === 'Pending' ? 'Awaiting approver action' : 'Request reviewed'}
          {item.reviewedAt ? ` on ${item.reviewedAt}` : ''}
        </div>

        {item.canReview ? (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isReviewing}
              onClick={() => onReview(item.id, 'rejected')}
              className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            >
              Reject
            </button>
            <button
              type="button"
              disabled={isReviewing}
              onClick={() => onReview(item.id, 'approved', 'half_day')}
              className="rounded-xl border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
            >
              Approve Half Day
            </button>
            <button
              type="button"
              disabled={isReviewing}
              onClick={() => onReview(item.id, 'approved', 'full_day')}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50"
            >
              Approve Full Day
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function RegularizationInbox() {
  const [activeTab, setActiveTab] = useState<InboxTab>('pending');
  const [pendingForMe, setPendingForMe] = useState<AdminRegularizationItem[]>([]);
  const [ccItems, setCcItems] = useState<AdminRegularizationItem[]>([]);
  const [history, setHistory] = useState<AdminRegularizationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewingId, setIsReviewingId] = useState('');
  const [error, setError] = useState('');
  const [setupPending, setSetupPending] = useState(false);

  const loadInbox = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/HRM/api/admin/regularization', { method: 'GET' });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load regularization inbox');
      }

      setPendingForMe(result.pendingForMe || []);
      setCcItems(result.ccItems || []);
      setHistory(result.history || []);
      setSetupPending(Boolean(result.setupPending));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load regularization inbox');
      setSetupPending(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInbox();
  }, []);

  const handleReview = async (id: string, decision: 'approved' | 'rejected', approvalOutcome?: 'full_day' | 'half_day') => {
    if (!id) {
      window.alert('This request is missing its id, so it cannot be reviewed yet.');
      return;
    }

    try {
      setIsReviewingId(id);
      const response = await fetch(`/HRM/api/attendance/regularization/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ decision, approvalOutcome }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to review request');
      }

      await loadInbox();
      window.dispatchEvent(new CustomEvent('hrm-attendance-updated'));
    } catch (requestError) {
      window.alert(requestError instanceof Error ? requestError.message : 'Failed to review request');
    } finally {
      setIsReviewingId('');
    }
  };

  const list = activeTab === 'pending' ? pendingForMe : activeTab === 'cc' ? ccItems : history;

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-8">
      <section className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <h1 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight mb-3">Attendance Regularization</h1>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-3xl">
            Review attendance regularization requests sent to you, track copied requests, and keep approval history visible for audit.
          </p>
        </div>
      </section>

      <div className="inline-flex rounded-2xl border border-outline-variant/30 overflow-hidden bg-surface-container-lowest">
        {([
          { key: 'pending', label: `Pending for Me (${pendingForMe.length})` },
          { key: 'cc', label: `CC / FYI (${ccItems.length})` },
          { key: 'history', label: `History (${history.length})` },
        ] as { key: InboxTab; label: string }[]).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-3 text-base font-medium transition-colors ${
              activeTab === tab.key ? 'bg-primary text-on-primary' : 'text-on-surface hover:bg-surface-container-low'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low px-5 py-4 text-sm text-on-surface-variant">
          Loading regularization inbox...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : setupPending ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-700">
          Regularization database setup is pending. Apply the latest migration so the recipient table exists in Supabase.
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low px-5 py-4 text-sm text-on-surface-variant">
          No requests in this section yet.
        </div>
      ) : (
        <div className="grid gap-5">
          {list.map((item) => (
            <RequestCard
              key={item.id}
              item={item}
              onReview={handleReview}
              isReviewing={isReviewingId === item.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
