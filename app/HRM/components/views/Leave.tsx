'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import EmployeePageHeader from '../ui/EmployeePageHeader';
import HrmEmptyState from '../ui/HrmEmptyState';
import { useHrmFeedback } from '../ui/HrmFeedback';
import { MetricCardSkeleton, Skeleton, TableRowsSkeleton } from '../ui/Skeleton';

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
  reviewedByRole?: string;
  reviewedByName?: string;
  reportingManagerId?: string;
  reportingManagerName?: string;
  createdAt: string;
  reviewedAt: string;
};

type TeamLeaveItem = LeaveHistoryItem & {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
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
  teamInbox?: {
    isReportingManager: boolean;
    pending: TeamLeaveItem[];
    history: TeamLeaveItem[];
  };
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
  const { showFeedback } = useHrmFeedback();
  const [data, setData] = useState<LeaveResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMode, setActiveMode] = useState<'my_leave_manage' | 'team_leave_review'>('my_leave_manage');
  const [teamReviewNotes, setTeamReviewNotes] = useState<Record<string, string>>({});
  const [activeTeamActionId, setActiveTeamActionId] = useState('');
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

  const canManageTeamLeaves = Boolean(
    data?.teamInbox?.isReportingManager ||
    (data?.teamInbox?.pending || []).length ||
    (data?.teamInbox?.history || []).length
  );

  const loadLeaveData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/HRM/api/leaves', { method: 'GET' });
      const result = await response.json();

      if (!response.ok) {
        setData(null);
        showFeedback({ type: 'error', title: 'Leave Data Not Loaded', message: result.error || 'Failed to load leave data.' });
        return;
      }

      setData(result);
      setForm((current) => ({
        ...current,
        leaveTypeId: current.leaveTypeId || result.leaveTypes?.[0]?.id || '',
      }));
    } catch {
      setData(null);
      showFeedback({ type: 'error', title: 'Leave Data Not Loaded', message: 'Failed to load leave data.' });
    } finally {
      setIsLoading(false);
    }
  }, [showFeedback]);

  useEffect(() => {
    loadLeaveData();
  }, [loadLeaveData]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/HRM/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const result = await response.json();
      if (!response.ok) {
        showFeedback({ type: 'error', title: 'Leave Request Not Submitted', message: result.error || 'Failed to submit leave request.' });
        return;
      }

      showFeedback({ type: 'success', title: 'Leave Request Submitted', message: result.message || 'Leave request submitted successfully.' });
      setForm((current) => ({
        ...current,
        startDate: '',
        endDate: '',
        reason: '',
      }));
      await loadLeaveData();
    } catch {
      showFeedback({ type: 'error', title: 'Leave Request Not Submitted', message: 'Failed to submit leave request.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTeamReview(id: string, action: 'approve' | 'reject') {
    if (activeTeamActionId) return;

    setActiveTeamActionId(id);
    try {
      const response = await fetch(`/HRM/api/leaves/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reviewNote: teamReviewNotes[id] || '',
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        showFeedback({
          type: 'error',
          title: 'Team Leave Review Failed',
          message: result.error || 'Failed to review team leave request.',
        });
        return;
      }

      showFeedback({
        type: 'success',
        title: 'Team Leave Updated',
        message: result.message || 'Team leave request updated successfully.',
      });

      setTeamReviewNotes((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      await loadLeaveData();
    } catch {
      showFeedback({
        type: 'error',
        title: 'Team Leave Review Failed',
        message: 'Failed to review team leave request.',
      });
    } finally {
      setActiveTeamActionId('');
    }
  }

  const kpiItems = [
    {
      label: 'Casual Leave',
      icon: 'event_note',
      shell: 'bg-emerald-50',
      value: balancesByType.get('Casual Leave')?.availableDays ?? data?.summary?.casualAvailable ?? 0,
      helper: 'Available for planned short breaks',
    },
    {
      label: 'Sick Leave',
      icon: 'medical_services',
      shell: 'bg-sky-50',
      value: balancesByType.get('Sick Leave')?.availableDays ?? data?.summary?.sickAvailable ?? 0,
      helper: 'Reserved for health-related leave',
    },
    {
      label: 'LOP',
      icon: 'money_off',
      shell: 'bg-rose-50',
      value: data?.summary?.lopDays ?? 0,
      helper: 'Days marked for payroll deduction',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8 sm:space-y-8">
      <EmployeePageHeader
        icon="event_busy"
        title="Leave Management"
        description="Apply for leave, monitor monthly balances, and review approvals in a cleaner employee workflow."
      />

      <section className="overflow-x-auto">
        <div
          className="relative inline-grid min-w-full grid-cols-2 items-center overflow-hidden rounded-[1.35rem] bg-[#F1F4F5] p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] md:min-w-[520px]"
        >
          <div
            className="absolute inset-y-1.5 left-1.5 rounded-[1rem] bg-[linear-gradient(180deg,#eadcff_0%,#cfbdfd_100%)] shadow-[0_8px_18px_rgba(167,139,250,0.20)] transition-transform duration-300 ease-out"
            style={{
              width: 'calc((100% - 0.75rem) / 2)',
              transform: activeMode === 'team_leave_review' ? 'translateX(100%)' : 'translateX(0%)',
            }}
          />
          <button
            type="button"
            onClick={() => setActiveMode('my_leave_manage')}
            className={`relative z-10 inline-flex items-center justify-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-semibold transition-colors ${
              activeMode === 'my_leave_manage' ? 'text-violet-950' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            <span className="whitespace-nowrap">My Leave Manage</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('team_leave_review')}
            className={`relative z-10 inline-flex items-center justify-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-semibold transition-colors ${
              activeMode === 'team_leave_review' ? 'text-violet-950' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">groups</span>
            <span className="whitespace-nowrap">Team Leave Review</span>
          </button>
        </div>
      </section>

      {activeMode === 'my_leave_manage' ? (
        <>
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="rounded-3xl border border-white/70 bg-violet-50 px-5 py-5 shadow-[0_18px_38px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[25px] text-black">event_available</span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Available Days</p>
          </div>
          <div className="mt-5 text-center">
            {isLoading ? (
              <div className="space-y-3">
                <div className="flex justify-center">
                  <Skeleton className="h-9 w-20" />
                </div>
                <div className="flex justify-center">
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ) : (
              <>
                <p className="text-3xl font-headline font-bold text-on-background">
                  {formatLeaveDays(data?.summary?.totalAvailable || 0)}
                </p>
                <p className="mt-3 text-[11px] leading-5 text-on-surface-variant">
                  Total currently available across your balances
                </p>
              </>
            )}
          </div>
        </div>

        {isLoading ? (
          <MetricCardSkeleton count={3} />
        ) : (
          kpiItems.map((item) => (
            <div key={item.label} className={`rounded-3xl border border-white/70 ${item.shell} px-5 py-5 shadow-[0_18px_38px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]`}>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[25px] text-black">{item.icon}</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">{item.label}</span>
              </div>
              <div className="mt-5 text-center">
                <p className="text-3xl font-headline font-bold text-on-background">{formatLeaveDays(item.value)}</p>
                <p className="mt-3 text-[11px] leading-5 text-on-surface-variant">{item.helper}</p>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-5 editorial-shadow sm:p-6 lg:p-8">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <span className="material-symbols-outlined text-[24px]">edit_calendar</span>
            </div>
            <div>
              <h2 className="text-xl font-bold font-headline text-on-background">Apply for Leave</h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Choose the leave type, set the date range, and submit a cleaner request. Holidays and weekly offs are excluded automatically.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.92fr_1.08fr]">
                <div className="space-y-6 rounded-2xl bg-surface-container-low px-5 py-5">
                  <Skeleton className="h-12 rounded-xl" />
                  <Skeleton className="h-12 rounded-xl" />
                  <Skeleton className="h-40 rounded-2xl" />
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Skeleton className="h-12 rounded-xl" />
                    <Skeleton className="h-12 rounded-xl" />
                  </div>
                  <Skeleton className="h-40 rounded-xl" />
                  <div className="flex justify-end">
                    <Skeleton className="h-12 w-40 rounded-2xl" />
                  </div>
                </div>
              </div>
            </div>
          ) : data?.setupPending ? (
            <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low px-5 py-4 text-sm text-on-surface-variant">
              Leave schema update is pending. Please apply the latest migration first.
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.92fr_1.08fr]">
                <div className="space-y-6 rounded-2xl bg-surface-container-low px-5 py-5">
                  <div className="space-y-1">
                    <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Leave Type</label>
                    <select
                      value={form.leaveTypeId}
                      onChange={(event) => setForm((current) => ({ ...current, leaveTypeId: event.target.value }))}
                      className="w-full appearance-none rounded-xl border border-outline-variant/10 bg-white py-3 px-4 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {(data?.leaveTypes || []).map((leaveType) => (
                        <option key={leaveType.id} value={leaveType.id}>{leaveType.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Session</label>
                    <select
                      value={form.session}
                      onChange={(event) => setForm((current) => ({ ...current, session: event.target.value }))}
                      className="w-full appearance-none rounded-xl border border-outline-variant/10 bg-white py-3 px-4 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {SESSION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-2xl border border-dashed border-outline-variant/20 bg-white px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Balance Snapshot</p>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-on-surface-variant">Casual Leave</span>
                        <span className="font-semibold text-on-surface">{formatLeaveDays(data?.summary?.casualAvailable ?? 0)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-on-surface-variant">Sick Leave</span>
                        <span className="font-semibold text-on-surface">{formatLeaveDays(data?.summary?.sickAvailable ?? 0)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-on-surface-variant">LOP</span>
                        <span className="font-semibold text-on-surface">{formatLeaveDays(data?.summary?.lopDays ?? 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Start Date</label>
                      <input
                        className="w-full rounded-xl border border-outline-variant/10 bg-surface-container-low py-3 px-4 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                        type="date"
                        value={form.startDate}
                        onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">End Date</label>
                      <input
                        className="w-full rounded-xl border border-outline-variant/10 bg-surface-container-low py-3 px-4 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                        type="date"
                        value={form.endDate}
                        onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Reason for Leave</label>
                    <textarea
                      className="w-full resize-none rounded-xl border border-outline-variant/10 bg-surface-container-low py-3 px-4 text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Briefly describe the reason for your leave..."
                      rows={6}
                      value={form.reason}
                      onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      className="flex items-center gap-2 rounded-2xl bg-primary px-7 py-3 text-sm font-semibold text-on-primary transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-70"
                      type="submit"
                      disabled={isSubmitting || !form.leaveTypeId}
                    >
                      <span>{isSubmitting ? 'Submitting...' : 'Submit Request'}</span>
                      <span className="material-symbols-outlined text-base">send</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-3xl bg-tertiary-container p-5 editorial-shadow sm:p-6 lg:p-8">
          <div className="relative z-10">
            <h3 className="text-xl font-bold font-headline leading-tight text-on-tertiary-container">Leave Policy Snapshot</h3>
            <p className="mt-2 text-sm leading-6 text-on-tertiary-container/80">
              Casual Leave accrues by 0.5 day per month and Sick Leave accrues by 1 day per month. Approved excess days move into LOP for payroll.
            </p>
          </div>

          <div className="relative z-10 mt-14 space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-16 rounded-2xl bg-white/35" />
              ))
            ) : (
              (data?.leaveTypes || []).map((leaveType) => (
                <div key={leaveType.id} className="rounded-2xl bg-on-tertiary-container/10 px-4 py-3">
                  <p className="text-sm font-semibold text-on-tertiary-container">{leaveType.name}</p>
                  <p className="text-xs text-on-tertiary-container/80">
                    Monthly credit: {formatLeaveDays(leaveType.monthlyCreditDays)} day(s){leaveType.isPaid ? ' - Paid Leave' : ' - Unpaid'}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="absolute top-0 right-0 opacity-10">
            <span className="material-symbols-outlined text-[12rem]">event_available</span>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-5 editorial-shadow sm:p-6 lg:p-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold font-headline text-on-background">Leave History</h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Review your submitted leave requests, approval status, and paid versus LOP outcome in a more structured table.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-surface-container-low/70">
              <tr>
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Type</th>
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Duration</th>
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Dates</th>
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Status</th>
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Paid / LOP</th>
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container/50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-0 py-0">
                    <TableRowsSkeleton rows={5} columns={6} />
                  </td>
                </tr>
              ) : !isLoading && (data?.history || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-on-surface-variant">
                    No leave requests have been submitted yet.
                  </td>
                </tr>
              ) : null}

              {(data?.history || []).map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-surface-container-low/30">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span className="text-sm font-semibold text-on-background">{item.leaveTypeName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-on-surface">{formatLeaveDays(item.totalDays)} day(s) - {item.sessionLabel}</td>
                  <td className="px-5 py-4 text-sm text-on-surface-variant">{formatDateRange(item.startDate, item.endDate)}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${getStatusPill(item.status)}`}>{item.status}</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-on-surface-variant">
                    {formatLeaveDays(item.paidDays)} paid / {formatLeaveDays(item.lopDays)} LOP
                  </td>
                  <td className="max-w-[280px] px-5 py-4 text-sm text-on-surface-variant">
                    <p className="line-clamp-2">{item.reason}</p>
                    {item.reviewNote ? <p className="mt-1 text-[11px] text-primary">HR note: {item.reviewNote}</p> : null}
                    {item.rejectionReason && item.status === 'rejected' ? (
                      <p className="mt-1 text-[11px] text-error">Reason: {item.rejectionReason}</p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
        </>
      ) : (
        <div className="space-y-10">
          {!canManageTeamLeaves ? (
            <section>
              <h2 className="text-xl font-bold font-headline text-on-background">Team Leave Review</h2>
              <div className="mt-5">
                <HrmEmptyState
                  compact
                  icon="groups"
                  title="No reporting team assigned yet"
                  message="This review space will start showing team leave requests once employees are mapped under your reporting profile."
                />
              </div>
            </section>
          ) : null}

          <section>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold font-headline text-on-background">Team Leave Requests</h2>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {(data?.teamInbox?.pending || []).length} pending
              </span>
            </div>

            {(data?.teamInbox?.pending || []).length === 0 ? (
              <div className="mt-5">
                <HrmEmptyState
                  compact
                  icon="hourglass_disabled"
                  title="No pending team leave requests"
                  message="New leave applications from your direct team will appear here for review."
                />
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-outline-variant/10">
                <table className="min-w-full text-left">
                  <thead>
                    <tr>
                      <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Employee</th>
                      <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Type</th>
                      <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Dates</th>
                      <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Duration</th>
                      <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Reason</th>
                      <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Review Note</th>
                      <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {(data?.teamInbox?.pending || []).map((item) => (
                      <tr key={item.id}>
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-on-background">{item.employeeName}</p>
                          <p className="text-xs text-on-surface-variant">{item.employeeCode || 'No employee ID'}</p>
                        </td>
                        <td className="px-5 py-4 text-sm text-on-surface">{item.leaveTypeName}</td>
                        <td className="px-5 py-4 text-sm text-on-surface-variant">{formatDateRange(item.startDate, item.endDate)}</td>
                        <td className="px-5 py-4 text-sm text-on-surface">{formatLeaveDays(item.totalDays)} day(s) - {item.sessionLabel}</td>
                        <td className="max-w-[260px] px-5 py-4 text-sm text-on-surface-variant">{item.reason || '--'}</td>
                        <td className="px-5 py-4">
                          <textarea
                            rows={2}
                            value={teamReviewNotes[item.id] || ''}
                            onChange={(event) =>
                              setTeamReviewNotes((current) => ({ ...current, [item.id]: event.target.value }))
                            }
                            className="w-full min-w-[190px] resize-none rounded-2xl border border-outline-variant/10 bg-surface-container-low px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="Optional note..."
                          />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleTeamReview(item.id, 'approve')}
                              disabled={activeTeamActionId === item.id}
                              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-on-primary disabled:opacity-70"
                            >
                              {activeTeamActionId === item.id ? 'Approving...' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTeamReview(item.id, 'reject')}
                              disabled={activeTeamActionId === item.id}
                              className="rounded-full bg-error-container px-4 py-2 text-xs font-semibold text-on-error-container disabled:opacity-70"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <div className="mb-5">
              <h2 className="text-xl font-bold font-headline text-on-background">Team Leave History</h2>
            </div>

            {(data?.teamInbox?.history || []).length === 0 ? (
              <div className="mt-5">
                <HrmEmptyState
                  compact
                  icon="history"
                  title="No team leave history yet"
                  message="Approved and rejected leave actions for your team will be listed here once reviews begin."
                />
              </div>
            ) : (
            <div className="overflow-x-auto rounded-2xl border border-outline-variant/10">
              <table className="min-w-full text-left">
                <thead>
                  <tr>
                    <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Employee</th>
                    <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Type</th>
                    <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Dates</th>
                    <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Status</th>
                    <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Paid / LOP</th>
                    <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Reviewed By</th>
                    <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {(data?.teamInbox?.history || []).map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-on-background">{item.employeeName}</p>
                        <p className="text-xs text-on-surface-variant">{item.employeeCode || 'No employee ID'}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-on-surface">{item.leaveTypeName}</td>
                      <td className="px-5 py-4 text-sm text-on-surface-variant">{formatDateRange(item.startDate, item.endDate)}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${getStatusPill(item.status)}`}>{item.status}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-on-surface-variant">
                        {formatLeaveDays(item.paidDays)} paid / {formatLeaveDays(item.lopDays)} LOP
                      </td>
                      <td className="px-5 py-4 text-sm text-on-surface">
                        {item.reviewedByName || '--'}
                        {item.reviewedByRole ? (
                          <p className="text-xs text-on-surface-variant">
                            {item.reviewedByRole === 'reporting_manager' ? 'Reporting Manager' : 'HR Admin'}
                          </p>
                        ) : null}
                      </td>
                      <td className="max-w-[280px] px-5 py-4 text-sm text-on-surface-variant">
                        {item.reviewNote || item.rejectionReason || '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
