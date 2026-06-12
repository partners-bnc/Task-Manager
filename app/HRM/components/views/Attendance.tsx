import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  WEEKDAYS,
  buildMonthGrid,
  formatDateLong,
  formatMonthYear,
  type AttendanceRecord,
  type AttendanceResponse,
  type AttendanceStatus,
} from './attendanceShared';
import EmployeePageHeader from '../ui/EmployeePageHeader';
import { MetricCardSkeleton, Skeleton } from '../ui/Skeleton';
import DailyWorkLogModal from './DailyWorkLogModal';

interface AttendanceProps {
  onOpenRegularizeAttendance: () => void;
}

const ATTENDANCE_SYNC_EVENT = 'hrm-attendance-updated';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; bg: string; text: string; dot: string; icon: string }> = {
  present: { label: 'Present', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: 'check_circle' },
  absent: { label: 'Absent', bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-500', icon: 'cancel' },
  halfday: { label: 'Half Day', bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500', icon: 'timelapse' },
  weekend: { label: 'Weekend', bg: 'bg-surface-container-low', text: 'text-on-surface-variant', dot: 'bg-on-surface/20', icon: 'weekend' },
  holiday: { label: 'Holiday', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', icon: 'celebration' },
  on_leave: { label: 'On Leave', bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500', icon: 'event_available' },
};

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function Attendance({ onOpenRegularizeAttendance }: AttendanceProps) {
  const [activeMonth, setActiveMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState({ presentCount: 0, absentCount: 0, halfDayCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const selectedDateRef = useRef(selectedDate);

  const [logsModalDate, setLogsModalDate] = useState<string | null>(null);
  const [tasks, setTasks] = useState<{ id: string; task_name: string; created_at: string }[]>([]);

  useEffect(() => {
    async function loadTasks() {
      try {
        const response = await fetch('/HRM/api/employee/tasks');
        const data = await response.json();
        setTasks((data.tasks || []).slice().sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } catch {
        setTasks([]);
      }
    }
    loadTasks();
  }, []);

  const handleViewLogs = (dateStr: string) => {
    setLogsModalDate(dateStr);
  };

  const year = activeMonth.getFullYear();
  const month = activeMonth.getMonth();
  const monthKey = getMonthKey(activeMonth);
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const recordMap = useMemo(() => {
    const map: Record<string, AttendanceRecord> = {};
    records.forEach((record) => {
      map[record.date] = record;
    });
    return map;
  }, [records]);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  useEffect(() => {
    let active = true;

    async function loadAttendance() {
      try {
        setIsLoading(true);
        const response = await fetch(`/HRM/api/attendance?month=${monthKey}`, { method: 'GET' });
        const result: AttendanceResponse | { error?: string } = await response.json();

        if (!active || !response.ok || !('records' in result)) {
          if (active) {
            setRecords([]);
            setSummary({ presentCount: 0, absentCount: 0, halfDayCount: 0 });
          }
          return;
        }

        setRecords(result.records || []);
        setSummary(result.summary || { presentCount: 0, absentCount: 0, halfDayCount: 0 });

        const existingSelected = result.records.find((record) => record.date === selectedDateRef.current);
        if (!existingSelected) {
          const firstRecord = result.records[0];
          const firstOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
          setSelectedDate(firstRecord?.date || firstOfMonth);
        }
      } catch {
        if (active) {
          setRecords([]);
          setSummary({ presentCount: 0, absentCount: 0, halfDayCount: 0 });
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadAttendance();

    const refreshAttendance = () => {
      loadAttendance();
    };

    window.addEventListener(ATTENDANCE_SYNC_EVENT, refreshAttendance);
    return () => {
      active = false;
      window.removeEventListener(ATTENDANCE_SYNC_EVENT, refreshAttendance);
    };
  }, [monthKey, month, year]);

  const selectedRecord = selectedDate ? recordMap[selectedDate] ?? null : null;

  const getStatus = (dateStr: string): AttendanceStatus | null => {
    const record = recordMap[dateStr];
    if (record) return record.status;
    return null;
  };

  const changeMonth = (offset: number) => {
    const next = new Date(year, month + offset, 1);
    setActiveMonth(next);
  };

  const hasNoRecord = (dateStr: string) => !recordMap[dateStr];
  const kpiItems = [
    {
      label: 'On Time',
      value: String(summary.presentCount).padStart(2, '0'),
      helper: 'Days you closed attendance within shift timing',
      icon: 'check_circle',
      shell: 'bg-emerald-50',
    },
    {
      label: 'Half Day',
      value: String(summary.halfDayCount).padStart(2, '0'),
      helper: 'Days where the required work hours were not completed',
      icon: 'timelapse',
      shell: 'bg-violet-50',
    },
    {
      label: 'Absent',
      value: String(summary.absentCount).padStart(2, '0'),
      helper: 'Working days marked without attendance activity',
      icon: 'event_busy',
      shell: 'bg-rose-50',
    },
  ];

  const handleSaveLogs = async (entries: any[]) => {
    try {
      const response = await fetch('/HRM/api/attendance/work-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: logsModalDate,
          entries: entries.map((e) => ({
            client_name: e.client_name,
            task_id: e.task_id,
            task_name_snapshot: e.task_name_snapshot,
            hours_spent: Number(e.hours_spent),
            remarks: e.remarks,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save work log');
      }
      setLogsModalDate(null);
      window.dispatchEvent(new CustomEvent(ATTENDANCE_SYNC_EVENT));
    } catch (err: any) {
      throw err;
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-8 sm:space-y-6">
      <EmployeePageHeader
        icon="calendar_today"
        title="Attendance Overview"
        description="Track daily presence, review the monthly calendar, and open regularization quickly when a swipe is missed."
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {isLoading ? (
            <MetricCardSkeleton count={3} />
          ) : (
            kpiItems.map((item) => (
              <div
                key={item.label}
                className={`rounded-3xl border border-white/70 ${item.shell} px-5 py-4 shadow-[0_16px_34px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[25px] text-black">{item.icon}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">{item.label}</span>
                </div>
                <div className="mt-5 text-center">
                  <p className="text-3xl font-headline font-bold tracking-tight text-on-surface">{item.value}</p>
                  <p className="mt-3 text-[11px] leading-5 text-on-surface-variant">{item.helper}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="col-span-12 lg:col-span-4 bg-[#F6ECFF] rounded-2xl p-5 relative overflow-hidden flex flex-col justify-center editorial-shadow">
          <div className="z-10">
            <h3 className="font-headline text-lg font-bold text-slate-900 mb-1">Missed a swipe?</h3>
            <p className="text-xs text-slate-600 mb-4 max-w-[200px]">Submit a regularization request for the current pay period.</p>
            <button
              type="button"
              onClick={onOpenRegularizeAttendance}
              className="bg-white text-violet-700 px-5 py-2 rounded-full text-xs font-bold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-sm">edit_note</span>
              Regularize Attendance
            </button>
          </div>
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-violet-200 rounded-full opacity-40 blur-3xl" />
          <div className="absolute top-0 right-0 p-4">
            <span className="material-symbols-outlined text-violet-300 text-6xl">auto_stories</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-8">
          <div className="bg-surface-container-lowest rounded-2xl editorial-shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => changeMonth(-1)}
                className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-xl">chevron_left</span>
              </button>
              <h3 className="text-lg font-bold font-headline text-on-surface">{formatMonthYear(year, month)}</h3>
              <button
                onClick={() => changeMonth(1)}
                className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-xl">chevron_right</span>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((cell, idx) => {
                if (!cell.isCurrentMonth || cell.day === null) {
                  return <div key={idx} className="h-14 rounded-xl" />;
                }

                const status = getStatus(cell.dateStr);
                const cfg = status ? STATUS_CONFIG[status] : null;
                const isSelected = cell.dateStr === selectedDate;
                const noRecord = hasNoRecord(cell.dateStr);
                const cellBg = noRecord ? 'bg-surface-container-low/60' : cfg?.bg || 'bg-surface-container-low/60';
                const cellText = noRecord ? 'text-on-surface-variant/50' : cfg?.text || 'text-on-surface-variant/50';

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDate(cell.dateStr)}
                    className={`
                      relative flex flex-col items-center justify-center h-14 rounded-xl transition-all duration-200 cursor-pointer
                      ${cellBg} ${cellText}
                      ${isSelected ? 'ring-2 ring-primary shadow-md shadow-primary/15 scale-[1.04]' : 'hover:scale-[1.02] hover:shadow-sm'}
                      ${cell.isToday && !isSelected ? 'ring-1 ring-slate-300' : ''}
                    `}
                  >
                    <span className={`text-sm font-bold leading-none ${isSelected ? 'text-primary' : ''}`}>
                      {cell.day}
                    </span>
                    {cfg && !noRecord && <span className={`w-1.5 h-1.5 rounded-full mt-1 ${cfg.dot}`} />}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 pt-4 border-t border-outline-variant/10">
              {(['present', 'halfday', 'absent', 'weekend', 'holiday', 'on_leave'] as AttendanceStatus[]).map((status) => (
                <div key={status} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[status].dot}`} />
                  <span className="text-[11px] font-medium text-on-surface-variant">{STATUS_CONFIG[status].label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-12 xl:col-span-4">
          <div className="bg-surface-container-lowest rounded-2xl editorial-shadow p-6 h-full flex flex-col">
            <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-5">Selected Date</h4>

            {isLoading ? (
              <div className="flex-1 space-y-5">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-40" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {Array.from({ length: 6 }, (_, index) => (
                    <Skeleton key={index} className="h-[84px] rounded-xl" />
                  ))}
                </div>
                <Skeleton className="h-16 rounded-2xl" />
              </div>
            ) : (() => {
              if (selectedRecord && selectedRecord.status === 'holiday') {
                const cfg = STATUS_CONFIG.holiday;
                return (
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-base font-bold font-headline text-on-surface">{formatDateLong(selectedDate)}</p>
                      <button
                        type="button"
                        onClick={() => handleViewLogs(selectedDate)}
                        className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition flex items-center justify-center"
                        title="View/Edit Daily Work Logs"
                      >
                        <span className="material-symbols-outlined text-[20px] block">assignment</span>
                      </button>
                    </div>
                    <span className={`self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text} mt-1 mb-5`}>
                      <span className="material-symbols-outlined text-sm">{cfg.icon}</span>
                      {cfg.label}
                    </span>
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                      <span className="material-symbols-outlined text-purple-300 text-5xl mb-3">celebration</span>
                      <p className="text-sm font-semibold text-on-surface mb-1">{selectedRecord.notes || 'Holiday'}</p>
                      <p className="text-xs text-on-surface-variant">No attendance tracking on holidays.</p>
                    </div>
                  </div>
                );
              }

              if (selectedRecord && selectedRecord.status === 'weekend') {
                return (
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                      <p className="text-base font-bold font-headline text-on-surface">{formatDateLong(selectedDate)}</p>
                      <button
                        type="button"
                        onClick={() => handleViewLogs(selectedDate)}
                        className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition flex items-center justify-center"
                        title="View/Edit Daily Work Logs"
                      >
                        <span className="material-symbols-outlined text-[20px] block">assignment</span>
                      </button>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                      <span className="material-symbols-outlined text-on-surface-variant/30 text-5xl mb-3">weekend</span>
                      <p className="text-sm font-semibold text-on-surface mb-1">{selectedRecord.notes || 'Weekly Off'}</p>
                      <p className="text-xs text-on-surface-variant">Attendance cannot be marked on this off day.</p>
                    </div>
                  </div>
                );
              }

              if (!selectedRecord) {
                return (
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                      <p className="text-base font-bold font-headline text-on-surface">{formatDateLong(selectedDate)}</p>
                      <button
                        type="button"
                        onClick={() => handleViewLogs(selectedDate)}
                        className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition flex items-center justify-center"
                        title="View/Edit Daily Work Logs"
                      >
                        <span className="material-symbols-outlined text-[20px] block">assignment</span>
                      </button>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                      <span className="material-symbols-outlined text-on-surface-variant/30 text-5xl mb-3">event_busy</span>
                      <p className="text-sm text-on-surface-variant">No attendance details available for this date.</p>
                    </div>
                  </div>
                );
              }

              const cfg = STATUS_CONFIG[selectedRecord.status];
              return (
                <div className="flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-5">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-bold font-headline text-on-surface">{formatDateLong(selectedDate)}</p>
                      <button
                        type="button"
                        onClick={() => handleViewLogs(selectedDate)}
                        className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition flex items-center justify-center"
                        title="View/Edit Daily Work Logs"
                      >
                        <span className="material-symbols-outlined text-[20px] block">assignment</span>
                      </button>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
                      <span className="material-symbols-outlined text-sm">{cfg.icon}</span>
                      {cfg.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-5 pb-4 border-b border-outline-variant/10">
                    <span className="material-symbols-outlined text-base">schedule</span>
                    <span>Shift target: <strong className="text-on-surface">9h 00m</strong></span>
                  </div>

                  <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {[
                      { label: 'Check-in', value: selectedRecord.checkIn, icon: 'login' },
                      { label: 'Check-out', value: selectedRecord.checkOut, icon: 'logout' },
                      { label: 'Late In', value: selectedRecord.lateIn, icon: 'alarm' },
                      { label: 'Early Out', value: selectedRecord.earlyOut, icon: 'directions_run' },
                      { label: 'Work Hours', value: selectedRecord.workHours, icon: 'hourglass_top' },
                      { label: 'Shift Hours', value: selectedRecord.shiftHours, icon: 'work_history' },
                    ].map((metric) => (
                      <div key={metric.label} className="bg-surface-container-low/60 rounded-xl px-3.5 py-3 min-h-[84px]">
                        <div className="flex items-start gap-1.5">
                          <span className="material-symbols-outlined text-on-surface-variant/60 text-sm mt-0.5">{metric.icon}</span>
                          <div className="min-w-0">
                            <div className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wider">{metric.label}</div>
                            <p className="text-sm font-bold font-headline text-on-surface mt-2">{metric.value}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedRecord.notes && (
                    <div className="mt-auto pt-4 border-t border-outline-variant/10">
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-on-surface-variant/50 text-base mt-0.5">info</span>
                        <p className="text-xs text-on-surface-variant leading-relaxed">{selectedRecord.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
      {logsModalDate && (
        <DailyWorkLogModal
          date={logsModalDate}
          tasks={tasks}
          isCheckout={false}
          onSubmitAndCheckout={handleSaveLogs}
          onClose={() => setLogsModalDate(null)}
        />
      )}
    </div>
  );
}
