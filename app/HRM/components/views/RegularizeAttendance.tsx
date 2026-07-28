'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  WEEKDAYS,
  buildMonthGrid,
  findFirstRegularizationDateForMonth,
  formatDateLong,
  formatDateShort,
  formatMonthYear,
  type RegularizationDay,
  type RegularizationResponse,
  type RegularizationStatusItem,
} from './attendanceShared';
import EmployeePageHeader from '../ui/EmployeePageHeader';
import { useHrmFeedback } from '../ui/HrmFeedback';
import HrmEmptyState from '../ui/HrmEmptyState';

type RegularizationTab = 'apply' | 'pending' | 'history';

interface HrApproverOption {
  id: string;
  name: string;
  email: string;
}

interface DraftState {
  primaryHrApproverId: string;
  currentStatus: string;
  requestType: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
}

const ATTENDANCE_SYNC_EVENT = 'hrm-attendance-updated';
const REQUEST_TYPE_OPTIONS = ['Full Day', 'Half Day', 'Absent'];

function getDetectedCurrentStatus(selectedDay?: RegularizationDay) {
  const label = String(selectedDay?.label || '').trim().toLowerCase();
  if (label === 'half day') return 'Half Day';
  if (label === 'absent') return 'Absent';
  return '';
}

function getDefaultRequestType(selectedDay?: RegularizationDay) {
  if (selectedDay?.hasHalfDayLeave) return 'Half Day';
  return 'Full Day';
}

function createDraft(selectedDay?: RegularizationDay): DraftState {
  return {
    primaryHrApproverId: '',
    currentStatus: getDetectedCurrentStatus(selectedDay),
    requestType: getDefaultRequestType(selectedDay),
    requestedCheckIn: '10:00',
    requestedCheckOut: '19:00',
    reason: '',
  };
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatCalendarDayLabel(item: RegularizationDay | undefined) {
  if (!item) return null;
  if (item.label === 'Half Day') return 'H';
  if (item.label === 'Absent') return 'A';
  return null;
}

function StatusTable({
  items,
  emptyMessage,
}: {
  items: RegularizationStatusItem[];
  emptyMessage: string;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-outline-variant/10 bg-surface-container-lowest editorial-shadow">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-surface-container-low/70">
            <tr>
              {['Date', 'Current Status', 'Request', 'Requested Time', 'Reporting To', 'Applied On', 'Result', 'Reason'].map((label) => (
                <th key={label} className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-6">
                  <HrmEmptyState
                    compact
                    icon="event_busy"
                    title="Nothing to review here"
                    message={emptyMessage}
                  />
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const badgeClassName =
                  item.status === 'Approved'
                    ? 'bg-emerald-50 text-emerald-700'
                    : item.status === 'Rejected'
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-amber-50 text-amber-700';

                const reviewSummary = [
                  item.approvalOutcome,
                  item.reviewedBy ? `by ${item.reviewedBy}` : '',
                  item.reviewedAt ? `on ${item.reviewedAt}` : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <tr key={item.id} className="align-top transition-colors hover:bg-surface-container-low/30">
                    <td className="px-5 py-4 text-sm font-semibold text-on-surface">{formatDateLong(item.date)}</td>
                    <td className="px-5 py-4 text-sm text-on-surface">{item.currentStatusLabel || '-'}</td>
                    <td className="px-5 py-4 text-sm text-on-surface">{item.requestType}</td>
                    <td className="px-5 py-4 text-sm text-on-surface">{item.timeRange}</td>
                    <td className="px-5 py-4 text-sm text-on-surface">{item.reportingManager || item.sentToHr || '-'}</td>
                    <td className="px-5 py-4 text-sm text-on-surface-variant">{item.appliedOn}</td>
                    <td className="px-5 py-4">
                      <div className="space-y-2">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClassName}`}>
                          {item.status}
                        </span>
                        {reviewSummary ? (
                          <p className="max-w-[180px] text-xs leading-5 text-on-surface-variant">{reviewSummary}</p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm leading-6 text-on-surface-variant">{item.reason}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function RegularizeAttendance() {
  const { showFeedback } = useHrmFeedback();
  const [activeMonth, setActiveMonth] = useState(() => new Date());
  const [activeTab, setActiveTab] = useState<RegularizationTab>('apply');
  const [draftsByDate, setDraftsByDate] = useState<Record<string, DraftState>>({});
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [eligibleDays, setEligibleDays] = useState<RegularizationDay[]>([]);
  const [pendingItems, setPendingItems] = useState<RegularizationStatusItem[]>([]);
  const [historyItems, setHistoryItems] = useState<RegularizationStatusItem[]>([]);
  const [hrApprovers, setHrApprovers] = useState<HrApproverOption[]>([]);
  const [reportingManager, setReportingManager] = useState<{ id: string; name: string; email: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupPending, setSetupPending] = useState(false);
  const selectedDateRef = useRef(selectedDate);

  const year = activeMonth.getFullYear();
  const month = activeMonth.getMonth();
  const monthKey = getMonthKey(activeMonth);
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  useEffect(() => {
    let active = true;

    async function loadRegularizationData() {
      try {
        const response = await fetch(`/HRM/api/attendance/regularization?month=${monthKey}`, { method: 'GET' });
        const result: (RegularizationResponse & { setupPending?: boolean }) | { error?: string } = await response.json();

        if (!active || !response.ok || !('eligibleDays' in result)) {
          if (active) {
            setEligibleDays([]);
            setPendingItems([]);
            setHistoryItems([]);
            setHrApprovers([]);
            setReportingManager(null);
            setSetupPending(false);
          }
          return;
        }

        setEligibleDays(result.eligibleDays || []);
        setPendingItems(result.pending || []);
        setHistoryItems(result.history || []);
        setHrApprovers(result.hrApprovers || []);
        setReportingManager(result.reportingManager || null);
        setSetupPending(Boolean(result.setupPending));

        const nextSelected = findFirstRegularizationDateForMonth(year, month, result.eligibleDays || []);
        const stillValid = (result.eligibleDays || []).some((item) => item.date === selectedDateRef.current);
        if (!stillValid) {
          setSelectedDate(nextSelected);
        }
      } catch {
        if (active) {
          setEligibleDays([]);
          setPendingItems([]);
          setHistoryItems([]);
          setHrApprovers([]);
          setReportingManager(null);
          setSetupPending(false);
        }
      }
    }

    loadRegularizationData();
    window.addEventListener(ATTENDANCE_SYNC_EVENT, loadRegularizationData);

    return () => {
      active = false;
      window.removeEventListener(ATTENDANCE_SYNC_EVENT, loadRegularizationData);
    };
  }, [monthKey, month, year]);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  const regularizationMap = useMemo(() => {
    const map: Record<string, RegularizationDay> = {};
    eligibleDays.forEach((item) => {
      map[item.date] = item;
    });
    return map;
  }, [eligibleDays]);

  const selectedDay = regularizationMap[selectedDate];
  const draft = draftsByDate[selectedDate] ?? createDraft(selectedDay);
  const gapCountLabel = `${eligibleDays.length} eligible day(s)`;
  const isFormComplete = Boolean(
    selectedDay &&
    draft.primaryHrApproverId &&
    draft.requestType &&
    draft.requestedCheckIn &&
    draft.requestedCheckOut &&
    draft.reason.trim()
  );

  const updateDraft = (updater: (draftState: DraftState) => DraftState) => {
    setDraftsByDate((current) => {
      const base = current[selectedDate] ?? createDraft(selectedDay);
      const nextDraft = updater(base);
      if (!nextDraft.currentStatus) {
        nextDraft.currentStatus = getDetectedCurrentStatus(selectedDay);
      }
      if (!nextDraft.requestType) {
        nextDraft.requestType = getDefaultRequestType(selectedDay);
      }
      return {
        ...current,
        [selectedDate]: nextDraft,
      };
    });
  };

  useEffect(() => {
    if (!selectedDate || draftsByDate[selectedDate] || !selectedDay) {
      return;
    }

    setDraftsByDate((current) => ({
      ...current,
      [selectedDate]: createDraft(selectedDay),
    }));
  }, [draftsByDate, selectedDate, selectedDay]);

  const changeMonth = (offset: number) => {
    const next = new Date(year, month + offset, 1);
    const nextYear = next.getFullYear();
    const nextMonth = next.getMonth();
    setActiveMonth(next);
    setSelectedDate(findFirstRegularizationDateForMonth(nextYear, nextMonth, eligibleDays));
  };

  const submitRegularization = async () => {
    if (!selectedDay) {
      showFeedback({ type: 'warning', title: 'Select Eligible Date', message: 'Select a date that is eligible for regularization.' });
      return;
    }

    if (!draft.primaryHrApproverId) {
      showFeedback({ type: 'warning', title: 'Approver Required', message: 'Select one HR approver before submitting.' });
      return;
    }

    if (!draft.reason.trim()) {
      showFeedback({ type: 'warning', title: 'Reason Required', message: 'Reason for regularization is required.' });
      return;
    }

    if (!draft.requestType) {
      showFeedback({ type: 'warning', title: 'Request Type Required', message: 'Select the request type you want to apply for.' });
      return;
    }

    if (!draft.requestedCheckIn || !draft.requestedCheckOut) {
      showFeedback({ type: 'warning', title: 'Time Required', message: 'Requested check-in and check-out time are required.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/HRM/api/attendance/regularization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendanceDate: selectedDate,
          requestType: draft.requestType || selectedDay.label,
          requestedCheckIn: draft.requestedCheckIn,
          requestedCheckOut: draft.requestedCheckOut,
          reason: draft.reason,
          primaryHrApproverId: draft.primaryHrApproverId,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        showFeedback({ type: 'error', title: 'Request Not Submitted', message: result.error || 'Failed to submit regularization request.' });
        return;
      }

      setDraftsByDate((current) => {
        const next = { ...current };
        delete next[selectedDate];
        return next;
      });
      window.dispatchEvent(new CustomEvent(ATTENDANCE_SYNC_EVENT));
      setActiveTab('history');
      showFeedback({ type: 'success', title: 'Request Submitted', message: 'Regularization request submitted successfully.' });
    } catch {
      showFeedback({ type: 'error', title: 'Request Not Submitted', message: 'Failed to submit regularization request.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <EmployeePageHeader
        icon="edit_calendar"
        title="Attendance Regularization"
        description="Submit missed or corrected attendance requests, keep your approval queue visible, and review completed decisions in a cleaner structure."
      />

      <div className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-12 xl:col-span-3">
          <div className="overflow-hidden rounded-3xl bg-surface-container-lowest editorial-shadow xl:sticky xl:top-6">
            <div className="border-b border-outline-variant/10 p-5">
              <div className="mb-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-xl">chevron_left</span>
                </button>
                <h3 className="text-lg font-bold font-headline text-on-surface">{formatMonthYear(year, month)}</h3>
                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-xl">chevron_right</span>
                </button>
              </div>

              <div className="mb-2 grid grid-cols-7 gap-1">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="py-1 text-center text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70"
                  >
                    {day.slice(0, 1)}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {cells.map((cell, idx) => {
                  if (!cell.isCurrentMonth || cell.day === null) {
                    return <div key={idx} className="h-11 rounded-xl" />;
                  }

                  const item = regularizationMap[cell.dateStr];
                  const isSelected = cell.dateStr === selectedDate;
                  const isEligible = Boolean(item);

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!isEligible}
                      onClick={() => isEligible && setSelectedDate(cell.dateStr)}
                      className={`relative flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                        isEligible
                          ? 'cursor-pointer bg-primary/8 text-primary hover:bg-primary/12'
                          : 'cursor-default bg-transparent text-on-surface-variant/35'
                      } ${isSelected ? 'bg-primary/14 ring-2 ring-primary shadow-md shadow-primary/10' : ''}`}
                    >
                      <span>{cell.day}</span>
                      {isEligible ? (
                        <span className="absolute bottom-1.5 left-1.5 h-0 w-0 border-l-[8px] border-l-primary border-t-[8px] border-t-transparent" />
                      ) : null}
                      {isEligible && formatCalendarDayLabel(item) ? (
                        <span className="absolute right-1 top-1 text-[9px] font-bold">{formatCalendarDayLabel(item)}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-b border-violet-100 bg-violet-50 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-700">Eligible Dates</p>
              <p className="mt-2 text-sm text-violet-900">{gapCountLabel}</p>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Selected Date</p>
                <p className="mt-2 text-3xl font-headline font-bold text-primary">
                  {selectedDate ? formatDateShort(selectedDate) : '-'}
                </p>
              </div>

              <div className="rounded-2xl bg-surface-container-low px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Current Status</p>
                <p className="mt-2 text-sm font-semibold text-on-surface">{draft.currentStatus || 'Select an eligible date'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 space-y-6 xl:col-span-9">
          <div className="overflow-x-auto pb-1 xl:overflow-visible">
            <div className="flex justify-center xl:justify-start">
            <div className="inline-flex rounded-full bg-[#F1F4F5] p-1">
              {(['apply', 'pending', 'history'] as RegularizationTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-5 py-2 text-sm font-semibold capitalize transition-all ${
                    activeTab === tab ? 'bg-violet-500 text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            </div>
          </div>

          {activeTab === 'apply' ? (
            <>
              {setupPending ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-700">
                  Regularization schema update is pending. Please apply the latest attendance regularization migration first.
                </div>
              ) : null}

              <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-6 editorial-shadow">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                  <div className="space-y-5">
                    <div className="rounded-2xl bg-surface-container-low px-5 py-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Request Date</p>
                      <p className="mt-2 text-xl font-headline font-bold text-on-surface">
                        {selectedDate ? formatDateLong(selectedDate) : 'Select an attendance issue date'}
                      </p>
                      <p className="mt-2 text-sm text-on-surface-variant">
                        {selectedDay ? `${selectedDay.label} is available for correction.` : 'Only half day and absent dates can be regularized.'}
                      </p>
                    </div>

                    <div>
                      <p className="mb-3 text-sm font-semibold text-on-surface">Send To HR</p>
                      <select
                        value={draft.primaryHrApproverId}
                        onChange={(event) => updateDraft((current) => ({
                          ...current,
                          primaryHrApproverId: event.target.value,
                        }))}
                        required
                        className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Select HR approver</option>
                        {hrApprovers.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-2xl bg-violet-50 px-5 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-700">Request Summary</p>
                      <div className="mt-3 grid gap-2 text-sm text-violet-950">
                        <p><span className="font-semibold">Date:</span> {selectedDate ? formatDateShort(selectedDate) : '-'}</p>
                        <p><span className="font-semibold">Current Status:</span> {draft.currentStatus || '-'}</p>
                        <p><span className="font-semibold">Request Type:</span> {draft.requestType || '-'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={submitRegularization}
                        disabled={isSubmitting || setupPending || !isFormComplete}
                        className="mt-4 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary transition hover:shadow-md hover:shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Request'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 lg:col-span-2 lg:grid-cols-2">
                    <div>
                      <label className="mb-3 block text-xs font-medium text-on-surface-variant">Current Status</label>
                      <input
                        type="text"
                        value={draft.currentStatus || '-'}
                        readOnly
                        className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-3 block text-xs font-medium text-on-surface-variant">Request Type</label>
                      <select
                        value={draft.requestType}
                        onChange={(event) => updateDraft((current) => ({ ...current, requestType: event.target.value }))}
                        required
                        disabled={Boolean(selectedDay?.hasHalfDayLeave)}
                        className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-80 disabled:cursor-not-allowed"
                      >
                        {selectedDay?.hasHalfDayLeave ? (
                          <option value="Half Day">Half Day</option>
                        ) : (
                          REQUEST_TYPE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))
                        )}
                      </select>
                      {selectedDay?.hasHalfDayLeave ? (
                        <p className="mt-2 text-xs text-amber-600 font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">info</span>
                          Approved half-day leave detected. You can only regularize the remaining half-day.
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-on-surface-variant">
                          Choose the final attendance result you want after approval.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-3 block text-xs font-medium text-on-surface-variant">Requested Check-in</label>
                      <input
                        type="time"
                        value={draft.requestedCheckIn}
                        onChange={(event) => updateDraft((current) => ({ ...current, requestedCheckIn: event.target.value }))}
                        required
                        className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="mb-3 block text-xs font-medium text-on-surface-variant">Requested Check-out</label>
                      <input
                        type="time"
                        value={draft.requestedCheckOut}
                        onChange={(event) => updateDraft((current) => ({ ...current, requestedCheckOut: event.target.value }))}
                        required
                        className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="mb-3 block text-xs font-medium text-on-surface-variant">Reporting Manager</label>
                      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm text-on-surface">
                        {reportingManager ? reportingManager.name : 'No reporting manager is assigned for this employee.'}
                      </div>
                      <p className="mt-2 text-xs text-on-surface-variant">
                        This approver stays linked automatically to your request.
                      </p>
                    </div>

                    <div>
                      <label className="mb-3 block text-xs font-medium text-on-surface-variant">Reason for Regularization</label>
                      <textarea
                        value={draft.reason}
                        onChange={(event) => updateDraft((current) => ({ ...current, reason: event.target.value }))}
                        placeholder="Briefly explain why this attendance needs correction."
                        rows={5}
                        required
                        className="w-full resize-none rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {activeTab === 'pending' ? (
            <StatusTable items={pendingItems} emptyMessage="No pending regularization requests." />
          ) : null}

          {activeTab === 'history' ? (
            historyItems.length ? (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {historyItems.map((item) => {
                  const badgeClassName =
                    item.status === 'Approved'
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                      : item.status === 'Rejected'
                        ? 'border border-rose-200 bg-rose-50 text-rose-600'
                        : 'border border-amber-200 bg-amber-50 text-amber-700';
                  const statusIcon =
                    item.status === 'Approved'
                      ? 'check_circle'
                      : item.status === 'Rejected'
                        ? 'cancel'
                        : 'schedule';

                  return (
                    <div key={item.id} className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-5 editorial-shadow">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-headline font-bold text-on-surface">{formatDateLong(item.date)}</p>
                          <p className="mt-1 text-sm text-on-surface-variant">{item.requestType}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${badgeClassName}`}>
                          <span className="material-symbols-outlined text-sm">{statusIcon}</span>
                          {item.status}
                        </span>
                      </div>

                      <div className="mt-5 space-y-3 text-sm">
                        {[
                          ['Current Status', item.currentStatusLabel || '-'],
                          ['Request Type', item.requestType],
                          ['Requested Time', item.timeRange],
                          ['Reporting To', item.reportingManager || item.sentToHr || '-'],
                          ['Applied On', item.appliedOn],
                          ['Reason', item.reason],
                        ].map(([label, value]) => (
                          <div key={label} className="border-b border-outline-variant/10 pb-3 last:border-b-0 last:pb-0">
                            <div className="flex items-start justify-between gap-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">{label}</p>
                              <p className="text-right leading-6 text-on-surface">{value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-6 text-sm text-on-surface-variant editorial-shadow">
                No regularization history found.
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
