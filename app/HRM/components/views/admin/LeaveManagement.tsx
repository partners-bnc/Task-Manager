'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHrmFeedback } from '../../ui/HrmFeedback';
import HrmEmptyState from '../../ui/HrmEmptyState';
import { LoadingPanel } from '../../ui/Skeleton';

type LeaveAdminItem = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  leaveTypeName: string;
  leaveTypeCode?: string;
  startDate: string;
  endDate: string;
  compOffWorkedDate?: string;
  status: string;
  totalDays: number;
  approvedDays: number;
  paidDays: number;
  lopDays: number;
  projectedPaidDays?: number;
  projectedLopDays?: number;
  isProjectedLop?: boolean;
  session: string;
  reason: string;
  reviewNote: string;
  rejectionReason: string;
  reviewedAt: string;
  reviewedByName: string;
  reviewedByRole?: string;
};

type LeaveAdminBalance = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  leaveTypeName: string;
  leaveTypeCode?: string;
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

function getProjectedLopLabel(item: { projectedPaidDays?: number; projectedLopDays?: number }) {
  const projectedPaidDays = Number(item.projectedPaidDays || 0);
  const projectedLopDays = Number(item.projectedLopDays || 0);

  if (projectedLopDays <= 0) {
    return projectedPaidDays > 0 ? 'Paid Leave' : 'No Deduction';
  }

  return 'Unpaid Leave';
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

function formatReviewerRole(role?: string) {
  if (role === 'reporting_manager') return 'Reporting Manager';
  if (role === 'hr_admin') return 'HR Admin';
  return '';
}

type BalanceSummaryRow = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  casualLeave: number;
  sickLeave: number;
  specialLeave: number;
  usedDays: number;
  lopDays: number;
};

export default function LeaveManagement() {
  const { showFeedback } = useHrmFeedback();
  const [data, setData] = useState<LeaveAdminResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [activeActionId, setActiveActionId] = useState<string>('');
  const [activeSection, setActiveSection] = useState<'pending' | 'history' | 'balances'>('pending');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/HRM/api/admin/leaves', { method: 'GET' });
      const result = await response.json();
      if (!response.ok) {
        setData(null);
        showFeedback({ type: 'error', title: 'Leave Inbox Not Loaded', message: result.error || 'Failed to load leave inbox.' });
        return;
      }
      setData(result);
    } catch {
      setData(null);
      showFeedback({ type: 'error', title: 'Leave Inbox Not Loaded', message: 'Failed to load leave inbox.' });
    } finally {
      setIsLoading(false);
    }
  }, [showFeedback]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function reviewRequest(id: string, action: 'approve' | 'reject') {
    try {
      setActiveActionId(id);
      const response = await fetch(`/HRM/api/admin/leaves/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewNote: reviewNotes[id] || '' }),
      });
      const result = await response.json();
      if (!response.ok) {
        showFeedback({ type: 'error', title: 'Leave Review Failed', message: result.error || 'Failed to review leave request.' });
        return;
      }
      showFeedback({ type: 'success', title: 'Leave Request Updated', message: result.message || 'Leave request updated.' });
      window.dispatchEvent(new CustomEvent('hrm-admin-sidebar-counts-refresh'));
      await loadData();
    } catch {
      showFeedback({ type: 'error', title: 'Leave Review Failed', message: 'Failed to review leave request.' });
    } finally {
      setActiveActionId('');
    }
  }

  async function syncAccrual() {
    try {
      const response = await fetch('/HRM/api/admin/leaves/accrual', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) {
        showFeedback({ type: 'error', title: 'Leave Accrual Not Synced', message: result.error || 'Failed to sync leave accrual.' });
        return;
      }
      showFeedback({ type: 'success', title: 'Leave Accrual Synced', message: result.message || 'Leave accrual synced.' });
      await loadData();
    } catch {
      showFeedback({ type: 'error', title: 'Leave Accrual Not Synced', message: 'Failed to sync leave accrual.' });
    }
  }

  const balanceRows = useMemo<BalanceSummaryRow[]>(() => {
    const grouped = new Map<string, BalanceSummaryRow>();

    for (const balance of data?.balances || []) {
      const current = grouped.get(balance.employeeId) || {
        employeeId: balance.employeeId,
        employeeCode: balance.employeeCode,
        employeeName: balance.employeeName,
        casualLeave: 0,
        sickLeave: 0,
        specialLeave: 0,
        usedDays: 0,
        lopDays: 0,
      };

      const leaveType = String(balance.leaveTypeName || '').toLowerCase();
      if (leaveType.includes('casual')) {
        current.casualLeave += Number(balance.availableDays) || 0;
      }
      if (leaveType.includes('sick')) {
        current.sickLeave += Number(balance.availableDays) || 0;
      }
      if (leaveType.includes('special')) {
        current.specialLeave += Number(balance.availableDays) || 0;
      }

      current.usedDays += Number(balance.usedDays) || 0;
      current.lopDays = Math.max(current.lopDays, Number(balance.lopDays) || 0);
      grouped.set(balance.employeeId, current);
    }

    return Array.from(grouped.values()).sort((left, right) => left.employeeName.localeCompare(right.employeeName));
  }, [data?.balances]);

  const sectionCards = [
    {
      id: 'pending' as const,
      label: 'Pending Requests',
      count: (data?.pending || []).length,
      description: 'Review and take action quickly.',
    },
    {
      id: 'history' as const,
      label: 'Review History',
      count: (data?.history || []).length,
      description: 'Track the latest leave decisions.',
    },
    {
      id: 'balances' as const,
      label: 'Live Employee Balance',
      count: balanceRows.length,
      description: 'Simple leave balance table.',
    },
  ];

  const activeSectionIndex = sectionCards.findIndex((section) => section.id === activeSection);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100/90 text-violet-700 shadow-sm">
              <span className="material-symbols-outlined text-[22px]">event_note</span>
            </div>
            <h1 className="text-3xl font-headline font-bold text-on-background">Leave Management</h1>
          </div>
          <p className="pl-14 text-sm leading-6 text-on-surface-variant">
            Review leave requests, monthly balances, and LOP impact in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={syncAccrual}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-sm hover:opacity-90"
        >
          <span className="material-symbols-outlined text-base">sync</span>
          Sync Monthly Leave Credit
        </button>
      </div>

      {data?.setupPending ? (
        <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 text-sm text-on-surface">
          Leave schema update is pending. Please apply the latest migration first.
        </div>
      ) : null}

      <section className="overflow-x-auto">
        <div className="relative inline-grid min-w-full grid-cols-3 items-center overflow-hidden rounded-[1.35rem] bg-[#F1F4F5] p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] md:min-w-[620px]">
          <div
            className="absolute inset-y-1.5 left-1.5 w-[calc((100%-0.75rem)/3)] rounded-[1rem] bg-[linear-gradient(180deg,#eadcff_0%,#cfbdfd_100%)] shadow-[0_8px_18px_rgba(167,139,250,0.20)] transition-transform duration-300 ease-out"
            style={{ transform: `translateX(calc(${activeSectionIndex} * 100%))` }}
          />
          {sectionCards.map((section) => {
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-[1rem] px-3 py-2 text-xs font-semibold transition-colors ${
                  isActive ? 'text-violet-950' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {section.id === 'pending'
                    ? 'hourglass_top'
                    : section.id === 'history'
                      ? 'history'
                      : 'table_chart'}
                </span>
                <span className="whitespace-nowrap">{section.label}</span>
                <span
                  className={`inline-flex min-w-5 items-center justify-center rounded-full px-1 py-0.5 text-[10px] font-bold ${
                    isActive ? 'bg-white/55 text-violet-900' : 'bg-white/80 text-slate-500'
                  }`}
                >
                  {section.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
        {isLoading ? (
          <LoadingPanel
            title="Loading leave management"
            message="Leave requests, review history, and live balance data are being prepared."
          />
        ) : null}

        {!isLoading && activeSection === 'pending' ? (
          <>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-headline font-bold text-on-background">Pending Requests</h2>
                <p className="mt-1 text-sm text-on-surface-variant">Simple review queue for all pending leave applications.</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {(data?.pending || []).length} pending
              </span>
            </div>

            {(data?.pending || []).length === 0 ? (
              <HrmEmptyState
                icon="hourglass_disabled"
                title="No pending leave requests"
                message="New leave applications will appear here as soon as employees send them for review."
              />
            ) : (
              <div className="overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <table className="w-full min-w-[1180px] text-left">
                  <thead className="sticky top-0 z-20 bg-white">
                    <tr className="border-b border-outline-variant/10">
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Employee</th>
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Leave Type</th>
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Date Range</th>
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Worked On</th>
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Days</th>
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">LOP Term</th>
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Reason</th>
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Review Note</th>
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {(data?.pending || []).map((item) => (
                      <tr key={item.id} className="align-top">
                        <td className="px-4 py-4 text-sm text-on-surface">
                          <p className="font-semibold">{item.employeeName}</p>
                          <p className="text-xs text-on-surface-variant">{item.employeeCode}</p>
                        </td>
                        <td className="px-4 py-4 text-sm text-on-surface">{item.leaveTypeName}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{formatDateRange(item.startDate, item.endDate)}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{item.compOffWorkedDate || '--'}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{formatLeaveDays(item.totalDays)}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">
                          <p className="font-medium">{getProjectedLopLabel(item)}</p>
                          <p className="text-xs text-on-surface-variant">
                            {formatLeaveDays(item.projectedPaidDays || 0)} paid / {formatLeaveDays(item.projectedLopDays || 0)} LOP
                          </p>
                        </td>
                        <td className="px-4 py-4 text-sm text-on-surface">{item.reason || '--'}</td>
                        <td className="px-4 py-4">
                          <textarea
                            rows={2}
                            value={reviewNotes[item.id] || ''}
                            onChange={(event) =>
                              setReviewNotes((current) => ({ ...current, [item.id]: event.target.value }))
                            }
                            className="w-full min-w-[180px] rounded-2xl border border-outline-variant/10 bg-surface-container-low px-3 py-2 text-sm text-on-surface outline-none"
                            placeholder="Optional note..."
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => reviewRequest(item.id, 'approve')}
                              disabled={activeActionId === item.id}
                              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-on-primary disabled:opacity-70"
                            >
                              {activeActionId === item.id ? 'Approving...' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              onClick={() => reviewRequest(item.id, 'reject')}
                              disabled={activeActionId === item.id}
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
          </>
        ) : null}

        {!isLoading && activeSection === 'history' ? (
          <>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-headline font-bold text-on-background">Review History</h2>
                <p className="mt-1 text-sm text-on-surface-variant">Recent approved and rejected leave decisions in one simple table.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {(data?.history || []).length} records
              </span>
            </div>

            {(data?.history || []).length === 0 ? (
              <HrmEmptyState
                icon="history_toggle_off"
                title="No reviewed requests yet"
                message="Approved and rejected leave decisions will start building a review history here."
              />
            ) : (
              <div className="overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <table className="w-full min-w-[980px] text-left">
                  <thead className="sticky top-0 z-20 bg-white">
                    <tr className="border-b border-outline-variant/10">
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Employee</th>
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Leave Type</th>
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Date Range</th>
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Worked On</th>
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Status</th>
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Paid</th>
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">LOP</th>
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Approved / Rejected By</th>
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Review Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {(data?.history || []).map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-4 text-sm text-on-surface">
                          <p className="font-semibold">{item.employeeName}</p>
                          <p className="text-xs text-on-surface-variant">{item.employeeCode}</p>
                        </td>
                        <td className="px-4 py-4 text-sm text-on-surface">{item.leaveTypeName}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{formatDateRange(item.startDate, item.endDate)}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{item.compOffWorkedDate || '--'}</td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusTone(item.status)}`}>{item.status}</span>
                        </td>
                        <td className="px-4 py-4 text-sm text-on-surface">{formatLeaveDays(item.paidDays)}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{formatLeaveDays(item.lopDays)}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">
                          {item.reviewedByName || '--'}
                          {item.reviewedByRole ? (
                            <p className="text-xs text-on-surface-variant">{formatReviewerRole(item.reviewedByRole)}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 text-sm text-on-surface">
                          {item.reviewNote || item.rejectionReason || '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}

        {!isLoading && activeSection === 'balances' ? (
          <>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-headline font-bold text-on-background">Live Employee Balance Table</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Simple leave balance view without repeating the same employee row for every leave type.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {balanceRows.length} employees
              </span>
            </div>

            {balanceRows.length === 0 ? (
              <HrmEmptyState
                icon="table_rows_narrow"
                title="No leave balance records yet"
                message="Once leave credit and employee balances are available, this summary table will fill in automatically."
              />
            ) : (
              <div className="overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <table className="w-full min-w-[860px] text-left">
                  <thead className="sticky top-0 z-20 bg-white">
                    <tr className="border-b border-outline-variant/10">
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Sl No.</th>
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Employee Name</th>
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Casual Leave</th>
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Sick Leave</th>
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Special Leave</th>
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Used</th>
                      <th className="sticky top-0 z-10 bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">LOP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {balanceRows.map((row, index) => (
                      <tr key={row.employeeId}>
                        <td className="px-4 py-4 text-sm text-on-surface">{index + 1}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">
                          <p className="font-semibold">{row.employeeName}</p>
                          <p className="text-xs text-on-surface-variant">{row.employeeCode}</p>
                        </td>
                        <td className="px-4 py-4 text-sm text-on-surface">{formatLeaveDays(row.casualLeave)}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{formatLeaveDays(row.sickLeave)}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{formatLeaveDays(row.specialLeave)}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{formatLeaveDays(row.usedDays)}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{formatLeaveDays(row.lopDays)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
      </section>
    </div>
  );
}
