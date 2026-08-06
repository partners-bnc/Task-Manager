'use client';

import React, { useEffect, useMemo, useState } from 'react';
import EmployeePageHeader from '../ui/EmployeePageHeader';
import DailyWorkLogModal from './DailyWorkLogModal';
import {
  WEEKDAYS,
  buildMonthGrid,
  formatMonthYear,
  formatDateLong,
  type AttendanceRecord,
} from './attendanceShared';
import { Skeleton } from '../ui/Skeleton';

interface Task {
  id: string;
  task_name: string;
  created_at: string;
  status?: string;
}

interface WorkLogEntry {
  id: string;
  client_name: string;
  task_id: string | null;
  task_name_snapshot: string | null;
  hours_spent: number;
  remarks: string | null;
  log_date: string;
  created_at: string;
}

export default function MyDailyLog() {
  const [activeMonth, setActiveMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
  });

  const [workLogs, setWorkLogs] = useState<WorkLogEntry[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsModalDate, setLogsModalDate] = useState<string | null>(null);

  // Month boundary values
  const year = activeMonth.getFullYear();
  const month = activeMonth.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  // Load tasks on mount
  useEffect(() => {
    async function loadTasks() {
      try {
        const response = await fetch('/HRM/api/employee/tasks');
        const data = await response.json();
        setTasks((data.tasks || []).slice().sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } catch (err) {
        console.error('Failed to load tasks', err);
      }
    }
    loadTasks();
  }, []);

  // Fetch work logs & attendance records for the month
  const fetchMonthData = async () => {
    setLoading(true);
    try {
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;

      // Parallel fetch of work logs and attendance records
      const [logsResponse, attendanceResponse] = await Promise.all([
        fetch(`/HRM/api/attendance/work-log?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/HRM/api/attendance?month=${monthKey}`),
      ]);

      const logsData = await logsResponse.json();
      const attendanceData = await attendanceResponse.json();

      setWorkLogs(logsData.logs || []);

      const attMap: Record<string, AttendanceRecord> = {};
      if (attendanceData.records && Array.isArray(attendanceData.records)) {
        attendanceData.records.forEach((record: AttendanceRecord) => {
          attMap[record.date] = record;
        });
      }
      setAttendanceMap(attMap);
    } catch (err) {
      console.error('Failed to load monthly work log data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthData();
  }, [monthKey]);

  // Group work logs by date
  const logsByDateMap = useMemo(() => {
    const map: Record<string, { entries: WorkLogEntry[]; totalHours: number }> = {};
    workLogs.forEach((log) => {
      const date = log.log_date;
      if (!map[date]) {
        map[date] = { entries: [], totalHours: 0 };
      }
      map[date].entries.push(log);
      map[date].totalHours += Number(log.hours_spent || 0);
    });
    return map;
  }, [workLogs]);

  // Calculate monthly stats
  const stats = useMemo(() => {
    let totalHours = 0;
    let submittedDays = 0;
    let incompleteDays = 0;

    Object.entries(logsByDateMap).forEach(([_, data]) => {
      totalHours += data.totalHours;
      if (data.totalHours >= 8) {
        submittedDays += 1;
      } else if (data.totalHours > 0) {
        incompleteDays += 1;
      }
    });

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      submittedDays,
      incompleteDays,
    };
  }, [logsByDateMap]);

  // Navigation handlers
  const changeMonth = (offset: number) => {
    setActiveMonth(new Date(year, month + offset, 1));
  };

  const isEditable = (dateStr: string) => {
    try {
      const getTzDateStr = (d: Date) => {
        const parts = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).formatToParts(d);
        const val = Object.fromEntries(parts.map((p) => [p.type, p.value]));
        return `${val.year}-${val.month}-${val.day}`;
      };

      const todayStr = getTzDateStr(new Date());
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getTzDateStr(yesterday);

      return dateStr === todayStr || dateStr === yesterdayStr;
    } catch {
      const todayStr = new Date().toLocaleDateString('en-CA');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('en-CA');
      return dateStr === todayStr || dateStr === yesterdayStr;
    }
  };

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
      fetchMonthData();
      // Sync attendance overview if open elsewhere
      window.dispatchEvent(new CustomEvent('hrm-attendance-updated'));
    } catch (err: any) {
      throw err;
    }
  };

  // Build month days list in reverse order (excluding future dates)
  const monthDays = useMemo(() => {
    const days = [];
    const lastDay = new Date(year, month + 1, 0).getDate();
    let todayStr = new Date().toLocaleDateString('en-CA');
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(new Date());
      const val = Object.fromEntries(parts.map((p) => [p.type, p.value]));
      todayStr = `${val.year}-${val.month}-${val.day}`;
    } catch {}

    for (let d = lastDay; d >= 1; d--) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dt = new Date(year, month, d);
      const dow = dt.getDay();

      if (dateStr > todayStr) {
        continue;
      }

      days.push({
        day: d,
        dateStr,
        isWeekend: dow === 0 || dow === 6,
      });
    }
    return days;
  }, [year, month]);

  const selectedDayLogs = selectedDate ? logsByDateMap[selectedDate]?.entries || [] : [];
  const selectedDayTotalHours = selectedDate ? logsByDateMap[selectedDate]?.totalHours || 0 : 0;
  const selectedDayAttendance = selectedDate ? attendanceMap[selectedDate] : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <EmployeePageHeader
        icon="assignment"
        title="My Daily Work Log"
        description="Fill and manage your daily project hours. Log logs for today and yesterday up to 8 hours."
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-3xl border border-white/70 bg-violet-50 px-5 py-4 shadow-[0_16px_34px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px] text-violet-700">schedule</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Total Logged Hours</span>
          </div>
          <p className="mt-4 text-3xl font-headline font-bold text-on-surface text-center">{stats.totalHours} hrs</p>
          <p className="mt-2 text-[10px] text-center text-on-surface-variant leading-none">Logged in {formatMonthYear(year, month)}</p>
        </div>

        <div className="rounded-3xl border border-white/70 bg-emerald-50 px-5 py-4 shadow-[0_16px_34px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px] text-emerald-700">check_circle</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Complete Logs</span>
          </div>
          <p className="mt-4 text-3xl font-headline font-bold text-on-surface text-center">{stats.submittedDays} days</p>
          <p className="mt-2 text-[10px] text-center text-on-surface-variant leading-none">Days logged with 8.0 hours</p>
        </div>

        <div className="rounded-3xl border border-white/70 bg-amber-50 px-5 py-4 shadow-[0_16px_34px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px] text-amber-700">warning</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">Incomplete Logs</span>
          </div>
          <p className="mt-4 text-3xl font-headline font-bold text-on-surface text-center">{stats.incompleteDays} days</p>
          <p className="mt-2 text-[10px] text-center text-on-surface-variant leading-none">Days logged with &lt; 8.0 hours</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Table Column (Left 8 cols) */}
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

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 px-4">Date</th>
                      <th className="pb-3 px-4">Attendance</th>
                      <th className="pb-3 px-4 text-center">Hours Logged</th>
                      <th className="pb-3 px-4">Log Status</th>
                      <th className="pb-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthDays.map((dayItem) => {
                      const dateStr = dayItem.dateStr;
                      const logData = logsByDateMap[dateStr];
                      const hours = logData?.totalHours || 0;
                      const isSelected = dateStr === selectedDate;

                      const attendance = attendanceMap[dateStr];
                      const attStatus = attendance?.status;
                      const isOffDay = attStatus === 'weekend' || attStatus === 'holiday' || attStatus === 'on_leave';

                      const formattedDay = new Date(year, month, dayItem.day).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        weekday: 'short',
                      });

                      let statusBadge = null;
                      if (hours >= 8) {
                        statusBadge = <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">Complete</span>;
                      } else if (hours > 0) {
                        statusBadge = <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">Incomplete ({hours}h)</span>;
                      } else if (isOffDay) {
                        statusBadge = <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">Not Required</span>;
                      } else {
                        statusBadge = <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">Missing Log</span>;
                      }

                      return (
                        <tr
                          key={dayItem.day}
                          onClick={() => setSelectedDate(dateStr)}
                          className={`cursor-pointer hover:bg-slate-50/50 transition-colors ${
                            isSelected ? 'bg-primary/5 font-semibold' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-800">{formattedDay}</td>
                          <td className="py-3.5 px-4">
                            {attStatus ? (
                              <span className="capitalize text-slate-600 text-xs">
                                {attStatus === 'on_leave' ? 'On Leave' : attStatus}
                              </span>
                            ) : (
                              <span className="text-slate-350 italic text-xs">No Record</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                            {hours > 0 ? `${hours} hrs` : '0h'}
                          </td>
                          <td className="py-3.5 px-4">{statusBadge}</td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              {isEditable(dateStr) ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDate(dateStr);
                                    setLogsModalDate(dateStr);
                                  }}
                                  className="text-xs font-bold text-primary hover:opacity-80 flex items-center gap-1 bg-[#426FBF]/10 px-2.5 py-1 rounded-lg"
                                >
                                  <span className="material-symbols-outlined text-sm font-bold">edit_note</span>
                                  Log Hours
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setSelectedDate(dateStr)}
                                  className="text-xs font-semibold text-slate-500 hover:text-primary transition"
                                >
                                  Details
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Selected Date Details Column (Right 4 cols) */}
        <div className="col-span-12 xl:col-span-4">
          <div className="bg-surface-container-lowest rounded-2xl editorial-shadow p-5 h-full flex flex-col">
            <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Selected Date</h4>
            <div className="flex items-center justify-between mb-2">
              <p className="text-base font-bold font-headline text-on-surface">{formatDateLong(selectedDate)}</p>
              {isEditable(selectedDate) && (
                <button
                  type="button"
                  onClick={() => setLogsModalDate(selectedDate)}
                  className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition flex items-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">edit_note</span>
                  Manage Logs
                </button>
              )}
            </div>

            {selectedDayAttendance && (
              <div className="mb-4">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-650">
                  <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                  Attendance: {selectedDayAttendance.status.toUpperCase()}
                </span>
                {selectedDayAttendance.notes && (
                  <p className="text-[11px] text-slate-400 mt-1 italic">{selectedDayAttendance.notes}</p>
                )}
              </div>
            )}

            <div className="border-t border-slate-100 pt-4 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Activity Logs</span>
                {selectedDayTotalHours > 0 && (
                  <span className="text-xs font-extrabold text-slate-800">
                    Total: {selectedDayTotalHours} hrs
                  </span>
                )}
              </div>

              {selectedDayLogs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-10">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-30">inbox</span>
                  <p className="text-xs font-semibold">No work entries logged for this date.</p>
                  {isEditable(selectedDate) && (
                    <p className="text-[11px] text-slate-400 mt-1">Click "Manage Logs" to submit your hours.</p>
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 subtle-scrollbar">
                  {selectedDayLogs.map((entry) => (
                    <div key={entry.id} className="p-3 bg-slate-55/40 border border-slate-100 rounded-xl space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800 line-clamp-1">{entry.client_name}</span>
                        <span className="text-xs font-extrabold text-[#7F40EE] shrink-0 bg-violet-50 px-2 py-0.5 rounded-md">
                          {entry.hours_spent} hrs
                        </span>
                      </div>
                      {entry.task_name_snapshot && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                          <span className="material-symbols-outlined text-[13px] shrink-0">assignment</span>
                          <span className="truncate">{entry.task_name_snapshot}</span>
                        </div>
                      )}
                      {entry.remarks && (
                        <p className="text-[11px] text-slate-650 bg-white/70 p-2 rounded-lg border border-slate-100/50 whitespace-pre-wrap leading-relaxed">
                          {entry.remarks}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {logsModalDate && (
        <DailyWorkLogModal
          date={logsModalDate}
          tasks={tasks}
          onSubmitAndCheckout={handleSaveLogs}
          onClose={() => setLogsModalDate(null)}
          isCheckout={false}
        />
      )}
    </div>
  );
}
