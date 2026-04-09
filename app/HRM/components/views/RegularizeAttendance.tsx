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
  if (label === 'late') return 'Late';
  return '';
}

function getDefaultRequestType(selectedDay?: RegularizationDay) {
  const currentStatus = getDetectedCurrentStatus(selectedDay);
  if (currentStatus === 'Half Day') return 'Half Day';
  if (currentStatus === 'Absent') return 'Absent';
  if (currentStatus === 'Late') return 'Full Day';
  return '';
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
  if (!item) {
    return null;
  }

  if (item.label === 'Late') return 'L';
  if (item.label === 'Half Day') return 'H';
  if (item.label === 'Absent') return 'A';
  return null;
}

function StatusCard({ item }: { item: RegularizationStatusItem }) {
  const badgeClassName =
    item.status === 'Approved'
      ? 'bg-emerald-50 text-emerald-700'
      : item.status === 'Rejected'
        ? 'bg-rose-50 text-rose-600'
        : 'bg-amber-50 text-amber-700';

  return (
    <div className="bg-surface-container-lowest rounded-3xl editorial-shadow p-6 border border-outline-variant/10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-lg font-bold font-headline text-on-surface">{formatDateLong(item.date)}</p>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${badgeClassName}`}>{item.status}</span>
          </div>
          <p className="text-sm text-on-surface-variant mt-2">
            {item.requestType}
            {item.currentStatusLabel ? ` | Current status: ${item.currentStatusLabel}` : ''}
          </p>
        </div>
        <div className="text-sm text-on-surface-variant">Applied on {item.appliedOn}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <div className="bg-surface-container-low rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">Requested Time</p>
          <p className="text-sm font-semibold text-on-surface">{item.timeRange}</p>
        </div>
        <div className="bg-surface-container-low rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">Send To HR</p>
          <p className="text-sm font-semibold text-on-surface">{item.sentToHr || '-'}</p>
        </div>
        <div className="bg-surface-container-low rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">Reporting Manager</p>
          <p className="text-sm font-semibold text-on-surface">{item.reportingManager || '-'}</p>
        </div>
        <div className="bg-surface-container-low rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">Approval Result</p>
          <p className="text-sm font-semibold text-on-surface">{item.approvalOutcome || '-'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mt-4">
        <div className="bg-surface-container-low rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">Reason</p>
          <p className="text-sm font-semibold text-on-surface">{item.reason}</p>
        </div>
      </div>

      {(item.reviewedBy || item.reviewedAt) && (
        <div className="mt-4 pt-4 border-t border-outline-variant/10 text-sm text-on-surface-variant">
          {item.reviewedBy ? `Reviewed by ${item.reviewedBy}` : 'Reviewed'}
          {item.reviewedAt ? ` on ${item.reviewedAt}` : ''}
        </div>
      )}
    </div>
  );
}

export default function RegularizeAttendance() {
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
  const gapCountLabel = `${eligibleDays.length} Eligible day(s)`;

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
      window.alert('Select a date that is eligible for regularization.');
      return;
    }

    if (!draft.primaryHrApproverId) {
      window.alert('Select one HR approver before submitting.');
      return;
    }

    if (!draft.reason.trim()) {
      window.alert('Reason for regularization is required.');
      return;
    }

    if (!draft.requestType) {
      window.alert('Select the request type you want to apply for.');
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
        window.alert(result.error || 'Failed to submit regularization request.');
        return;
      }

      setDraftsByDate((current) => {
        const next = { ...current };
        delete next[selectedDate];
        return next;
      });
      window.dispatchEvent(new CustomEvent(ATTENDANCE_SYNC_EVENT));
      setActiveTab('pending');
    } catch {
      window.alert('Failed to submit regularization request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      <div className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-12 xl:col-span-3">
          <div className="bg-surface-container-lowest rounded-3xl editorial-shadow overflow-hidden">
            <div className="p-5 border-b border-outline-variant/10">
              <div className="flex items-center justify-between mb-5">
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  className="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">chevron_left</span>
                </button>
                <h3 className="text-lg font-bold font-headline text-on-surface">{formatMonthYear(year, month)}</h3>
                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  className="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">chevron_right</span>
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="text-center text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest py-1"
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
                      className={`relative h-11 rounded-xl flex items-center justify-center text-sm font-semibold transition-all ${
                        isEligible
                          ? 'bg-primary/8 text-primary hover:bg-primary/12 cursor-pointer'
                          : 'text-on-surface-variant/35 bg-transparent cursor-default'
                      } ${isSelected ? 'ring-2 ring-primary bg-primary/14 shadow-md shadow-primary/10' : ''}`}
                    >
                      <span>{cell.day}</span>
                      {isEligible && (
                        <span className="absolute left-1.5 bottom-1.5 w-0 h-0 border-l-[8px] border-l-primary border-t-[8px] border-t-transparent" />
                      )}
                      {isEligible && formatCalendarDayLabel(item) && (
                        <span className="absolute top-1 right-1 text-[9px] font-bold">{formatCalendarDayLabel(item)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-primary/8 px-5 py-3 flex items-center justify-between border-b border-primary/10">
              <p className="text-sm text-error">{gapCountLabel}</p>
              <button
                type="button"
                onClick={submitRegularization}
                disabled={isSubmitting || !selectedDay || setupPending}
                className="border border-primary text-primary px-4 py-2 rounded-xl font-semibold hover:bg-primary/8 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>

            <div className="px-5 py-5 space-y-2">
              <p className="text-sm text-on-surface-variant">Jump To</p>
              <p className="text-3xl font-headline font-extrabold text-primary">{selectedDate ? formatDateShort(selectedDate) : '-'}</p>
            </div>
          </div>
        </div>

        <div className="col-span-12 xl:col-span-9 space-y-6">
          <div className="flex justify-center xl:justify-start">
            <div className="inline-flex rounded-2xl border border-outline-variant/30 overflow-hidden bg-surface-container-lowest">
              {(['apply', 'pending', 'history'] as RegularizationTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-base font-medium capitalize transition-colors ${
                    activeTab === tab ? 'bg-primary text-on-primary' : 'text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'apply' && (
            <>
              {setupPending && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-3xl px-5 py-4 text-sm font-medium">
                  Regularization schema update is pending. Please apply the latest attendance regularization migration first.
                </div>
              )}

              <div className="bg-surface-container-lowest rounded-3xl editorial-shadow p-6 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
                <div className="lg:pr-6 lg:border-r lg:border-outline-variant/15 space-y-5">
                  <div>
                    <p className="text-base font-medium text-on-surface mb-4">Send To HR</p>
                    <select
                      value={draft.primaryHrApproverId}
                      onChange={(event) => updateDraft((current) => ({
                        ...current,
                        primaryHrApproverId: event.target.value,
                      }))}
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Select HR approver</option>
                      {hrApprovers.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name} ({option.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <p className="text-base font-medium text-on-surface mb-3">Reporting Manager</p>
                    <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl px-4 py-3 text-sm text-on-surface">
                      {reportingManager ? `${reportingManager.name} (${reportingManager.email})` : 'No reporting manager is assigned for this employee.'}
                    </div>
                    <p className="text-xs text-on-surface-variant mt-2">Reporting manager will be added automatically as an approver.</p>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-3xl editorial-shadow p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/15 pb-6 mb-6">
                  <div>
                    <p className="text-3xl font-headline font-extrabold text-on-surface">
                      {selectedDate ? formatDateLong(selectedDate) : 'Select an attendance issue date'}
                    </p>
                    <p className="text-sm text-on-surface-variant mt-2">
                      {selectedDay ? `${selectedDay.label} selected for attendance regularization.` : 'Only late, half day, and absent dates can be regularized.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-medium text-on-surface-variant mb-3 block">Current Status</label>
                    <input
                      type="text"
                      value={draft.currentStatus || '-'}
                      readOnly
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl py-3 px-4 text-sm text-on-surface outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-on-surface-variant mb-3 block">Request Type</label>
                    <select
                      value={draft.requestType}
                      onChange={(event) => updateDraft((current) => ({ ...current, requestType: event.target.value }))}
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Select what you want to request</option>
                      {REQUEST_TYPE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-on-surface-variant">
                      Choose what you want this day to be updated to after approval.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-on-surface-variant mb-3 block">Reason for Regularization</label>
                    <input
                      type="text"
                      value={draft.reason}
                      onChange={(event) => updateDraft((current) => ({ ...current, reason: event.target.value }))}
                      placeholder="Why are you requesting this regularization?"
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-on-surface-variant mb-3 block">Requested Check-in</label>
                    <input
                      type="time"
                      value={draft.requestedCheckIn}
                      onChange={(event) => updateDraft((current) => ({ ...current, requestedCheckIn: event.target.value }))}
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-on-surface-variant mb-3 block">Requested Check-out</label>
                    <input
                      type="time"
                      value={draft.requestedCheckOut}
                      onChange={(event) => updateDraft((current) => ({ ...current, requestedCheckOut: event.target.value }))}
                      className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'pending' && (
            <div className="grid gap-4">
              {pendingItems.length > 0 ? pendingItems.map((item) => <StatusCard key={item.id} item={item} />) : (
                <div className="bg-surface-container-lowest rounded-3xl editorial-shadow p-6 text-sm text-on-surface-variant">
                  No pending regularization requests.
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="grid gap-4">
              {historyItems.length > 0 ? historyItems.map((item) => <StatusCard key={item.id} item={item} />) : (
                <div className="bg-surface-container-lowest rounded-3xl editorial-shadow p-6 text-sm text-on-surface-variant">
                  No regularization history found.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
