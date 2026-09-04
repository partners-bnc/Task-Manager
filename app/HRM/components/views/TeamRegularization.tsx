'use client';

import React, { useEffect, useMemo, useState } from 'react';
import EmployeePageHeader from '../ui/EmployeePageHeader';
import { useHrmFeedback } from '../ui/HrmFeedback';
import HrmEmptyState from '../ui/HrmEmptyState';
import { LoadingPanel } from '../ui/Skeleton';
import { formatDateLong } from './attendanceShared';

type InboxTab = 'pending' | 'history';

interface TeamRegularizationItem {
  id: string;
  date: string;
  status: string;
  requestType: string;
  timeRange: string;
  reason: string;
  appliedOn: string;
  currentStatusLabel?: string;
  approvalOutcome?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  canReview?: boolean;
  employeeName: string;
  employeeEmail: string;
  employeeCode: string;
}

function statusTone(status: string) {
  if (status === 'Approved') return 'bg-emerald-50 text-emerald-700';
  if (status === 'Rejected') return 'bg-rose-50 text-rose-600';
  return 'bg-amber-50 text-amber-700';
}

export default function TeamRegularization() {
  const { showFeedback } = useHrmFeedback();
  const [activeTab, setActiveTab] = useState<InboxTab>('pending');
  const [pendingForMe, setPendingForMe] = useState<TeamRegularizationItem[]>([]);
  const [history, setHistory] = useState<TeamRegularizationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewingId, setIsReviewingId] = useState('');
  const [error, setError] = useState('');

  const loadInbox = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/HRM/api/employee/team-regularization', { method: 'GET' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to load team requests');
      setPendingForMe(result.pendingForMe || []);
      setHistory(result.history || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInbox();
  }, []);

  const handleReview = async (
    id: string,
    decision: 'approved' | 'rejected',
    approvalOutcome?: 'full_day' | 'half_day'
  ) => {
    try {
      setIsReviewingId(id);
      const response = await fetch(`/HRM/api/attendance/regularization/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, approvalOutcome }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to review request');
      await loadInbox();
      window.dispatchEvent(new CustomEvent('hrm-attendance-updated'));
      showFeedback({ type: 'success', title: 'Request Reviewed', message: 'Regularization request reviewed successfully.' });
    } catch (err) {
      showFeedback({ type: 'error', title: 'Review Failed', message: err instanceof Error ? err.message : 'Failed to review request' });
    } finally {
      setIsReviewingId('');
    }
  };

  const switchTabs = useMemo(
    () => [
      { key: 'pending' as const, label: 'Pending', count: pendingForMe.length, icon: 'hourglass_top' },
      { key: 'history' as const, label: 'History', count: history.length, icon: 'history' },
    ],
    [pendingForMe.length, history.length]
  );

  const activeTabIndex = switchTabs.findIndex((t) => t.key === activeTab);
  const list = activeTab === 'pending' ? pendingForMe : history;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <EmployeePageHeader
        icon="supervised_user_circle"
        title="Team Regularization"
        description="Review and approve attendance regularization requests from your team members."
      />

      <section className="overflow-x-auto py-3 mb-6">
        <div className="inline-grid min-w-[340px] grid-cols-2 gap-2 rounded-full border border-outline-variant/10 bg-surface-container-lowest p-1 shadow-sm">
          {switchTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-white text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                <span className="whitespace-nowrap">{tab.label}</span>
                <span
                  className={`inline-flex min-w-4 items-center justify-center rounded-full px-1 py-0.5 text-[10px] font-bold ${
                    isActive ? 'bg-[#edf4fc] text-primary' : 'bg-[#F1F4F5] text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {isLoading ? (
        <LoadingPanel
          title="Loading team requests"
          message="Fetching regularization requests from your team members."
        />
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : list.length === 0 ? (
        <HrmEmptyState
          icon={activeTab === 'pending' ? 'hourglass_disabled' : 'history'}
          title={activeTab === 'pending' ? 'No pending requests' : 'No history yet'}
          message={
            activeTab === 'pending'
              ? 'Team regularization requests sent to you will appear here.'
              : 'Reviewed team requests will appear here after the first approval cycle.'
          }
        />
      ) : activeTab === 'pending' ? (
        <section className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
          <>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-headline font-bold text-on-background">Pending Approvals</h2>
                <p className="mt-1 text-sm text-on-surface-variant">Review your team members' regularization requests.</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {pendingForMe.length} pending
              </span>
            </div>

            <div className="overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <table className="w-full min-w-[1000px] text-left">
                <thead className="sticky top-0 z-20 bg-white">
                  <tr className="border-b border-outline-variant/10">
                    {['Employee', 'Date', 'Request Type', 'Current Status', 'Requested Time', 'Reason', 'Applied On', 'Action'].map((h) => (
                      <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {pendingForMe.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="px-4 py-4 text-sm text-on-surface">
                        <p className="font-semibold">{item.employeeName}</p>
                        <p className="text-xs text-on-surface-variant">{item.employeeCode}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-on-surface">{formatDateLong(item.date)}</td>
                      <td className="px-4 py-4 text-sm text-on-surface">{item.requestType}</td>
                      <td className="px-4 py-4 text-sm text-on-surface">{item.currentStatusLabel || '-'}</td>
                      <td className="px-4 py-4 text-sm text-on-surface">{item.timeRange}</td>
                      <td className="px-4 py-4 text-sm text-on-surface">{item.reason || '-'}</td>
                      <td className="px-4 py-4 text-sm text-on-surface">{item.appliedOn}</td>
                      <td className="px-4 py-4">
                        {item.canReview ? (
                          (() => {
                            const isHalfDayRequest =
                              String(item.requestType || '').toLowerCase().includes('half') ||
                              String(item.currentStatusLabel || '').toLowerCase().includes('half');

                            if (isHalfDayRequest) {
                              return (
                                <div className="flex flex-nowrap gap-2 whitespace-nowrap">
                                  <button
                                    type="button"
                                    disabled={isReviewingId === item.id}
                                    onClick={() => handleReview(item.id, 'rejected')}
                                    className="rounded-full border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isReviewingId === item.id}
                                    onClick={() => handleReview(item.id, 'approved', 'half_day')}
                                    className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-on-primary shadow-sm hover:bg-primary/90 disabled:opacity-50"
                                  >
                                    Approve
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <div className="flex flex-nowrap gap-2 whitespace-nowrap">
                                <button
                                  type="button"
                                  disabled={isReviewingId === item.id}
                                  onClick={() => handleReview(item.id, 'rejected')}
                                  className="rounded-full border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                                >
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  disabled={isReviewingId === item.id}
                                  onClick={() => handleReview(item.id, 'approved', 'half_day')}
                                  className="rounded-full border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                                >
                                  Half Day
                                </button>
                                <button
                                  type="button"
                                  disabled={isReviewingId === item.id}
                                  onClick={() => handleReview(item.id, 'approved', 'full_day')}
                                  className="rounded-full bg-primary px-3 py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
                                >
                                  Full Day
                                </button>
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-sm text-on-surface-variant">Awaiting action</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        </section>
      ) : (
        <section className="rounded-[2rem] border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
          <>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-headline font-bold text-on-background">History</h2>
                <p className="mt-1 text-sm text-on-surface-variant">Reviewed requests from your team members.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {history.length} records
              </span>
            </div>

            <div className="overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <table className="w-full min-w-[900px] text-left">
                <thead className="sticky top-0 z-20 bg-white">
                  <tr className="border-b border-outline-variant/10">
                    {['Employee', 'Date', 'Requested Time', 'Status', 'Approval Result', 'Reviewed By', 'Reviewed At', 'Reason'].map((h) => (
                      <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4 text-sm text-on-surface">
                        <p className="font-semibold">{item.employeeName}</p>
                        <p className="text-xs text-on-surface-variant">{item.employeeCode}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-on-surface">{formatDateLong(item.date)}</td>
                      <td className="px-4 py-4 text-sm text-on-surface">{item.timeRange}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusTone(item.status)}`}>{item.status}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-on-surface">{item.approvalOutcome || '-'}</td>
                      <td className="px-4 py-4 text-sm text-on-surface">{item.reviewedBy || '-'}</td>
                      <td className="px-4 py-4 text-sm text-on-surface">{item.reviewedAt || '-'}</td>
                      <td className="px-4 py-4 text-sm text-on-surface">{item.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        </section>
      )}
    </div>
  );
}
