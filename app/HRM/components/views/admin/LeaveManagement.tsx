'use client';

import React, { useEffect, useState } from 'react';

type LeaveAdminItem = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  status: string;
  totalDays: number;
  approvedDays: number;
  paidDays: number;
  lopDays: number;
  session: string;
  reason: string;
  reviewNote: string;
  rejectionReason: string;
  reviewedAt: string;
  reviewedByName: string;
};

type LeaveAdminBalance = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  leaveTypeName: string;
  availableDays: number;
  usedDays: number;
  creditedDays: number;
  lopDays: number;
};

type LeaveAdminResponse = {
  pending: LeaveAdminItem[];
  history: LeaveAdminItem[];
  balances: LeaveAdminBalance[];
  setupPending?: boolean;
  error?: string;
};

function formatDateRange(startDate: string, endDate: string) {
  const formatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const start = formatter.format(new Date(`${startDate}T00:00:00`));
  const end = formatter.format(new Date(`${endDate}T00:00:00`));
  return startDate === endDate ? start : `${start} - ${end}`;
}

function formatLeaveDays(value: number) {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function statusTone(status: string) {
  switch (String(status || '').toLowerCase()) {
    case 'approved':
      return 'bg-secondary-container text-on-secondary-container';
    case 'rejected':
      return 'bg-error-container text-on-error-container';
    default:
      return 'bg-primary/10 text-primary';
  }
}

export default function LeaveManagement() {
  const [data, setData] = useState<LeaveAdminResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string>('');
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [activeActionId, setActiveActionId] = useState<string>('');

  async function loadData() {
    try {
      setIsLoading(true);
      const response = await fetch('/HRM/api/admin/leaves', { method: 'GET', cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) {
        setData(null);
        setFeedback(result.error || 'Failed to load leave inbox.');
        return;
      }
      setData(result);
      setFeedback('');
    } catch {
      setData(null);
      setFeedback('Failed to load leave inbox.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function reviewRequest(id: string, action: 'approve' | 'reject') {
    try {
      setActiveActionId(id);
      setFeedback('');
      const response = await fetch(`/HRM/api/admin/leaves/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewNote: reviewNotes[id] || '' }),
      });
      const result = await response.json();
      if (!response.ok) {
        setFeedback(result.error || 'Failed to review leave request.');
        return;
      }
      setFeedback(result.message || 'Leave request updated.');
      await loadData();
    } catch {
      setFeedback('Failed to review leave request.');
    } finally {
      setActiveActionId('');
    }
  }

  async function syncAccrual() {
    try {
      setFeedback('');
      const response = await fetch('/HRM/api/admin/leaves/accrual', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) {
        setFeedback(result.error || 'Failed to sync leave accrual.');
        return;
      }
      setFeedback(result.message || 'Leave accrual synced.');
      await loadData();
    } catch {
      setFeedback('Failed to sync leave accrual.');
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold text-on-background">Leave Management</h1>
          <p className="text-sm text-on-surface-variant">Review leave requests, monthly balances, and LOP impact in one place.</p>
        </div>
        <button type="button" onClick={syncAccrual} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-sm hover:opacity-90">
          <span className="material-symbols-outlined text-base">sync</span>
          Sync Monthly Leave Credit
        </button>
      </div>

      {feedback && <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 text-sm text-on-surface">{feedback}</div>}
      {data?.setupPending && <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 text-sm text-on-surface">Leave schema update is pending. Please apply the latest migration first.</div>}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-headline font-bold text-on-background">Pending Requests</h2>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{(data?.pending || []).length} pending</span>
        </div>

        {isLoading ? (
          <div className="rounded-3xl bg-surface-container-lowest p-10 text-center text-sm text-on-surface-variant editorial-shadow">Loading leave requests...</div>
        ) : (data?.pending || []).length === 0 ? (
          <div className="rounded-3xl bg-surface-container-lowest p-10 text-center text-sm text-on-surface-variant editorial-shadow">No pending leave requests.</div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {(data?.pending || []).map((item) => (
              <article key={item.id} className="rounded-3xl bg-surface-container-lowest p-6 editorial-shadow space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-headline font-bold text-on-background">{item.employeeName}</p>
                    <p className="text-xs text-on-surface-variant">{item.employeeCode} • {item.leaveTypeName}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusTone(item.status)}`}>{item.status}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Date Range</p>
                    <p className="mt-1 text-on-surface">{formatDateRange(item.startDate, item.endDate)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Requested Days</p>
                    <p className="mt-1 text-on-surface">{formatLeaveDays(item.totalDays)} day(s)</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Reason</p>
                  <p className="mt-1 text-sm text-on-surface leading-relaxed">{item.reason}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Review Note</label>
                  <textarea rows={3} value={reviewNotes[item.id] || ''} onChange={(event) => setReviewNotes((current) => ({ ...current, [item.id]: event.target.value }))} className="w-full rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none" placeholder="Optional note for the employee..." />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => reviewRequest(item.id, 'approve')} disabled={activeActionId === item.id} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary disabled:opacity-70">
                    {activeActionId === item.id ? 'Approving...' : 'Approve'}
                  </button>
                  <button type="button" onClick={() => reviewRequest(item.id, 'reject')} disabled={activeActionId === item.id} className="rounded-full bg-error-container px-5 py-2 text-sm font-semibold text-on-error-container disabled:opacity-70">
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-surface-container-lowest p-6 editorial-shadow">
          <h2 className="text-xl font-headline font-bold text-on-background mb-4">Reviewed History</h2>
          <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1">
            {(data?.history || []).length === 0 ? (
              <p className="text-sm text-on-surface-variant">No reviewed leave requests yet.</p>
            ) : (
              (data?.history || []).map((item) => (
                <div key={item.id} className="rounded-2xl bg-surface-container-low px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{item.employeeName}</p>
                      <p className="text-xs text-on-surface-variant">{item.employeeCode} • {item.leaveTypeName}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusTone(item.status)}`}>{item.status}</span>
                  </div>
                  <p className="mt-3 text-xs text-on-surface-variant">{formatDateRange(item.startDate, item.endDate)}</p>
                  <p className="mt-2 text-sm text-on-surface">{item.reason}</p>
                  <p className="mt-2 text-xs text-on-surface-variant">Paid: {formatLeaveDays(item.paidDays)} day(s) • LOP: {formatLeaveDays(item.lopDays)} day(s)</p>
                  {item.reviewNote && <p className="mt-2 text-xs text-primary">HR Note: {item.reviewNote}</p>}
                  {item.rejectionReason && item.status === 'rejected' && <p className="mt-2 text-xs text-error">Reason: {item.rejectionReason}</p>}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-surface-container-lowest p-6 editorial-shadow">
          <h2 className="text-xl font-headline font-bold text-on-background mb-4">Employee Leave Balances</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/10">
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Employee</th>
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Type</th>
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Available</th>
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Used</th>
                  <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">LOP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {(data?.balances || []).map((balance, index) => (
                  <tr key={`${balance.employeeId}-${balance.leaveTypeName}-${index}`}>
                    <td className="py-3 text-sm text-on-surface"><p className="font-medium">{balance.employeeName}</p><p className="text-xs text-on-surface-variant">{balance.employeeCode}</p></td>
                    <td className="py-3 text-sm text-on-surface">{balance.leaveTypeName}</td>
                    <td className="py-3 text-sm text-on-surface">{formatLeaveDays(balance.availableDays)}</td>
                    <td className="py-3 text-sm text-on-surface">{formatLeaveDays(balance.usedDays)}</td>
                    <td className="py-3 text-sm text-on-surface">{formatLeaveDays(balance.lopDays)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
