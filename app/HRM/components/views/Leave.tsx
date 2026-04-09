'use client';

import React, { useEffect, useMemo, useState } from 'react';

type LeaveType = {
  id: string;
  name: string;
  monthlyCreditDays: number;
  isPaid: boolean;
};

type LeaveBalance = {
  id: string;
  leaveTypeId: string;
  leaveTypeName: string;
  totalDays: number;
  creditedDays: number;
  carryForwardDays: number;
  usedDays: number;
  availableDays: number;
  lopDays: number;
};

type LeaveHistoryItem = {
  id: string;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  status: string;
  session: string;
  sessionLabel: string;
  reason: string;
  totalDays: number;
  approvedDays: number;
  paidDays: number;
  lopDays: number;
  reviewNote: string;
  rejectionReason: string;
  createdAt: string;
  reviewedAt: string;
};

type LeaveResponse = {
  leaveTypes: LeaveType[];
  balances: LeaveBalance[];
  summary: {
    totalAvailable: number;
    lopDays: number;
    casualAvailable: number;
    sickAvailable: number;
  };
  history: LeaveHistoryItem[];
  year: number;
  setupPending?: boolean;
  error?: string;
};

const SESSION_OPTIONS = [
  { value: 'full_day', label: 'Full Day' },
  { value: 'first_half', label: 'First Half' },
  { value: 'second_half', label: 'Second Half' },
];

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

function getStatusPill(status: string) {
  switch (String(status || '').toLowerCase()) {
    case 'approved':
      return 'bg-secondary-container text-on-secondary-container';
    case 'rejected':
      return 'bg-error-container text-on-error-container';
    default:
      return 'bg-surface-container-high text-on-surface-variant';
  }
}

export default function Leave() {
  const [data, setData] = useState<LeaveResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [form, setForm] = useState({
    leaveTypeId: '',
    session: 'full_day',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const balancesByType = useMemo(() => {
    const map = new Map<string, LeaveBalance>();
    (data?.balances || []).forEach((balance) => {
      map.set(balance.leaveTypeName, balance);
    });
    return map;
  }, [data]);

  async function loadLeaveData() {
    try {
      setIsLoading(true);
      const response = await fetch('/HRM/api/leaves', { method: 'GET', cache: 'no-store' });
      const result = await response.json();

      if (!response.ok) {
        setData(null);
        setFeedback({ type: 'error', message: result.error || 'Failed to load leave data.' });
        return;
      }

      setData(result);
      setFeedback(null);
      setForm((current) => ({
        ...current,
        leaveTypeId: current.leaveTypeId || result.leaveTypes?.[0]?.id || '',
      }));
    } catch {
      setData(null);
      setFeedback({ type: 'error', message: 'Failed to load leave data.' });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLeaveData();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch('/HRM/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const result = await response.json();
      if (!response.ok) {
        setFeedback({ type: 'error', message: result.error || 'Failed to submit leave request.' });
        return;
      }

      setFeedback({ type: 'success', message: result.message || 'Leave request submitted successfully.' });
      setForm((current) => ({
        ...current,
        startDate: '',
        endDate: '',
        reason: '',
      }));
      await loadLeaveData();
    } catch {
      setFeedback({ type: 'error', message: 'Failed to submit leave request.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-8">
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 bg-primary text-on-primary p-6 rounded-3xl flex flex-col justify-between shadow-xl shadow-primary/20 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-medium opacity-80 mb-1">Available Days</p>
            <p className="text-4xl font-extrabold font-headline">
              {isLoading ? '--' : formatLeaveDays(data?.summary?.totalAvailable || 0)}
            </p>
          </div>
          <div className="mt-6 relative z-10">
            <p className="text-xs opacity-80">Paid balances keep accruing every month and unused leave continues to accumulate.</p>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary-container/20 rounded-full blur-3xl" />
        </div>

        {[
          {
            label: 'Casual',
            icon: 'event_note',
            container: 'bg-surface-container',
            value: balancesByType.get('Casual Leave')?.availableDays ?? data?.summary?.casualAvailable ?? 0,
            helper: 'Remaining days',
          },
          {
            label: 'Sick',
            icon: 'medical_services',
            container: 'bg-tertiary-container',
            value: balancesByType.get('Sick Leave')?.availableDays ?? data?.summary?.sickAvailable ?? 0,
            helper: 'Remaining days',
          },
          {
            label: 'LOP',
            icon: 'money_off',
            container: 'bg-error-container/20',
            value: data?.summary?.lopDays ?? 0,
            helper: 'Days marked for payroll deduction',
          },
        ].map((item) => (
          <div key={item.label} className="bg-surface-container-lowest p-6 rounded-3xl flex flex-col justify-between editorial-shadow">
            <div className="flex justify-between items-start">
              <div className={`p-2 ${item.container} rounded-xl`}>
                <span className="material-symbols-outlined text-on-surface text-xl">{item.icon}</span>
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">{item.label}</span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-extrabold font-headline text-on-background">{isLoading ? '--' : formatLeaveDays(item.value)}</p>
              <p className="text-xs text-on-surface-variant">{item.helper}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-3xl p-8 editorial-shadow border border-outline-variant/10">
          <div className="mb-6">
            <h2 className="text-xl font-bold font-headline text-on-background mb-1">Apply for Leave</h2>
            <p className="text-on-surface-variant text-xs">Submit a leave request. Holidays and off days are excluded automatically.</p>
          </div>

          {feedback && (
            <div className={`mb-5 rounded-2xl px-4 py-3 text-sm ${
              feedback.type === 'success' ? 'bg-secondary-container/60 text-on-secondary-container' : 'bg-error-container/60 text-on-error-container'
            }`}>
              {feedback.message}
            </div>
          )}

          {data?.setupPending ? (
            <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low px-5 py-4 text-sm text-on-surface-variant">
              Leave schema update is pending. Please apply the latest migration first.
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Leave Type</label>
                  <select
                    value={form.leaveTypeId}
                    onChange={(event) => setForm((current) => ({ ...current, leaveTypeId: event.target.value }))}
                    className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 text-sm text-on-surface font-medium outline-none appearance-none"
                  >
                    {(data?.leaveTypes || []).map((leaveType) => (
                      <option key={leaveType.id} value={leaveType.id}>{leaveType.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Session</label>
                  <select
                    value={form.session}
                    onChange={(event) => setForm((current) => ({ ...current, session: event.target.value }))}
                    className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 text-sm text-on-surface font-medium outline-none appearance-none"
                  >
                    {SESSION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Start Date</label>
                  <input className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 text-sm text-on-surface outline-none" type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">End Date</label>
                  <input className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 text-sm text-on-surface outline-none" type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1">Reason for Leave</label>
                <textarea className="w-full bg-surface-container-low border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary/20 text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none resize-none" placeholder="Briefly describe the reason for your leave..." rows={3} value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} />
              </div>

              <div className="flex justify-end pt-2">
                <button className="bg-primary text-on-primary px-8 py-3 rounded-xl text-sm font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all active:translate-y-0 flex items-center gap-2 disabled:opacity-70" type="submit" disabled={isSubmitting || !form.leaveTypeId}>
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Request'}</span>
                  <span className="material-symbols-outlined text-base">send</span>
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="bg-tertiary-container rounded-3xl p-8 h-full flex flex-col justify-between relative overflow-hidden editorial-shadow">
          <div className="relative z-10">
            <h3 className="text-xl font-bold font-headline text-on-tertiary-container leading-tight mb-2">Leave Policy Snapshot</h3>
            <p className="text-on-tertiary-container/80 text-xs leading-relaxed">
              Casual Leave accrues by 0.5 day per month and Sick Leave accrues by 1 day per month. Approved excess days move into LOP for payroll.
            </p>
          </div>

          <div className="mt-8 relative z-10 space-y-3">
            {(data?.leaveTypes || []).map((leaveType) => (
              <div key={leaveType.id} className="rounded-2xl bg-on-tertiary-container/10 px-4 py-3">
                <p className="text-sm font-semibold text-on-tertiary-container">{leaveType.name}</p>
                <p className="text-xs text-on-tertiary-container/80">
                  Monthly credit: {formatLeaveDays(leaveType.monthlyCreditDays)} day(s){leaveType.isPaid ? ' • Paid Leave' : ' • Unpaid'}
                </p>
              </div>
            ))}
          </div>

          <div className="absolute top-0 right-0 opacity-10">
            <span className="material-symbols-outlined text-[12rem]">event_available</span>
          </div>
        </div>
      </section>

      <section className="bg-surface-container-lowest rounded-3xl p-8 editorial-shadow border border-outline-variant/10 overflow-hidden">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-xl font-bold font-headline text-on-background mb-1">Leave History</h2>
            <p className="text-on-surface-variant text-xs">Review your submitted leave requests and their paid or LOP outcome.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-surface-container">
                <th className="pb-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Type</th>
                <th className="pb-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Duration</th>
                <th className="pb-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Dates</th>
                <th className="pb-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Status</th>
                <th className="pb-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Paid / LOP</th>
                <th className="pb-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container/50">
              {!isLoading && (data?.history || []).length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-on-surface-variant">No leave requests have been submitted yet.</td>
                </tr>
              )}
              {(data?.history || []).map((item) => (
                <tr key={item.id} className="group hover:bg-surface-container-low/30 transition-colors">
                  <td className="py-4"><div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-primary" /><span className="font-semibold text-on-background text-sm">{item.leaveTypeName}</span></div></td>
                  <td className="py-4 text-xs text-on-surface">{formatLeaveDays(item.totalDays)} day(s) • {item.sessionLabel}</td>
                  <td className="py-4 text-xs text-on-surface-variant">{formatDateRange(item.startDate, item.endDate)}</td>
                  <td className="py-4"><span className={`px-3 py-1 rounded-full text-[10px] font-bold ${getStatusPill(item.status)}`}>{item.status}</span></td>
                  <td className="py-4 text-xs text-on-surface-variant">{formatLeaveDays(item.paidDays)} paid / {formatLeaveDays(item.lopDays)} LOP</td>
                  <td className="py-4 text-xs text-on-surface-variant max-w-[220px]">
                    <p className="line-clamp-2">{item.reason}</p>
                    {item.reviewNote && <p className="mt-1 text-[11px] text-primary">HR note: {item.reviewNote}</p>}
                    {item.rejectionReason && item.status === 'rejected' && <p className="mt-1 text-[11px] text-error">Reason: {item.rejectionReason}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
