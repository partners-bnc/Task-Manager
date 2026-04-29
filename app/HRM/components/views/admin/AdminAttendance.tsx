'use client';

import React, { useEffect, useMemo, useState } from 'react';
import HrmEmptyState from '../../ui/HrmEmptyState';
import { LoadingPanel } from '../../ui/Skeleton';

type AttendanceMode = 'daily' | 'individual' | 'monthly';

let xlsxLoaderPromise: Promise<any> | null = null;

type DailyRow = {
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  reportingTo: string;
  date: string;
  status: string;
  statusLabel: string;
  checkIn: string;
  checkOut: string;
  lateIn: string;
  earlyOut: string;
  workHours: string;
  shiftHours?: string;
  notes: string;
  source?: string;
};

type EmployeeOption = {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  designation: string;
  city?: string;
};

type MonthlyCalendarDay = {
  date: string;
  dayNumber: number;
  weekdayShort: string;
};

type MonthlyStatusCell = {
  date: string;
  code: string;
  status: string;
  label: string;
  notes: string;
};

type MonthlyAttendanceRow = {
  employee: {
    id: string;
    employeeId: string;
    name: string;
    department: string;
    designation: string;
    city?: string;
    reportingTo: string;
  };
  dailyStatuses: MonthlyStatusCell[];
  summary: {
    present: number;
    late: number;
    halfDay: number;
    absent: number;
    off: number;
    holiday: number;
    leave: number;
    missing: number;
  };
};

type AttendanceResponse = {
  mode: AttendanceMode;
  rows: DailyRow[];
  date?: string;
  month?: string;
  calendarDays?: MonthlyCalendarDay[];
  statusOptions?: Array<{ value: string; label: string }>;
  monthlyRows?: MonthlyAttendanceRow[];
  employeeOptions: EmployeeOption[];
  departmentOptions: string[];
  selectedEmployeeId?: string;
  employee?: {
    id: string;
    employeeId: string;
    name: string;
    department: string;
    designation: string;
    reportingTo: string;
  } | null;
};

function ensureXlsxLoaded() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Excel export is only available in the browser.'));
  }

  if ((window as any).XLSX) {
    return Promise.resolve((window as any).XLSX);
  }

  if (xlsxLoaderPromise) {
    return xlsxLoaderPromise;
  }

  xlsxLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.async = true;
    script.onload = () => resolve((window as any).XLSX);
    script.onerror = () => reject(new Error('Failed to load Excel export library.'));
    document.head.appendChild(script);
  });

  return xlsxLoaderPromise;
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function buildQuery(params: Record<string, string>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (String(value || '').trim()) {
      searchParams.set(key, value);
    }
  });
  return searchParams.toString();
}

function formatMonthLabel(value = '') {
  const [year, month] = String(value).split('-').map(Number);
  if (!year || !month) return value || 'Selected month';
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

function getStatusCellTone(status = '') {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'present') return 'bg-sky-100 text-sky-900';
  if (normalized === 'late') return 'bg-amber-100 text-amber-900';
  if (normalized === 'absent') return 'bg-rose-100 text-rose-900';
  if (normalized === 'halfday') return 'bg-violet-100 text-violet-900';
  if (normalized === 'on_leave') return 'bg-emerald-100 text-emerald-900';
  if (normalized === 'holiday') return 'bg-orange-100 text-orange-900';
  if (normalized === 'weekend') return 'bg-slate-100 text-slate-700';
  return 'bg-white text-slate-500';
}

function getEmployeeMetaLine(employee: MonthlyAttendanceRow['employee']) {
  const secondPart = String(employee?.city || '').trim() || String(employee?.department || '').trim() || 'Location not set';
  return `${employee?.designation || 'Designation not set'} · ${secondPart}`;
}

function safeFilePart(value = '') {
  return String(value || 'export')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '_');
}

export default function AdminAttendance() {
  const [mode, setMode] = useState<AttendanceMode>('daily');
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [response, setResponse] = useState<AttendanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadAttendance() {
      setIsLoading(true);
      setError('');

      try {
        const query = buildQuery(
          mode === 'daily'
            ? {
                mode,
                date: selectedDate,
                search,
                status: statusFilter,
                department: departmentFilter,
              }
            : mode === 'individual'
            ? {
                mode,
                employeeId: selectedEmployeeId,
                month: selectedMonth,
                status: statusFilter,
              }
            : {
                mode,
                employeeId: selectedEmployeeId,
                month: selectedMonth,
                status: statusFilter,
              }
        );

        const request = await fetch(`/HRM/api/admin/attendance?${query}`, { method: 'GET' });
        const result = await request.json();

        if (!request.ok) {
          throw new Error(result.error || 'Failed to load attendance');
        }

        if (active) {
          setResponse(result);
        }
      } catch (requestError: any) {
        if (active) {
          setResponse(null);
          setError(requestError?.message || 'Failed to load attendance');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadAttendance();
    return () => {
      active = false;
    };
  }, [departmentFilter, mode, search, selectedDate, selectedEmployeeId, selectedMonth, statusFilter]);

  const sectionCards = [
    { id: 'daily' as const, label: 'Daily Attendance', description: 'Check all employee attendance on one day.' },
    { id: 'individual' as const, label: 'Individual Attendance', description: 'Track one employee across dates.' },
    { id: 'monthly' as const, label: 'Monthly Attendance', description: 'Review full employee attendance month-wise in one matrix.' },
  ];

  const activeIndex = sectionCards.findIndex((section) => section.id === mode);
  const dailyRows = mode === 'daily' ? response?.rows || [] : [];
  const individualRows = mode === 'individual' ? response?.rows || [] : [];
  const monthlyRows = useMemo(() => {
    if (mode !== 'monthly') {
      return [] as MonthlyAttendanceRow[];
    }

    const rawRows = ((response?.rows as unknown as MonthlyAttendanceRow[]) || []);
    return rawRows
      .filter((row) => row && typeof row === 'object')
      .map((row) => ({
        employee: {
          id: row?.employee?.id || '',
          employeeId: row?.employee?.employeeId || '--',
          name: row?.employee?.name || 'Employee',
          department: row?.employee?.department || 'Department not set',
          designation: row?.employee?.designation || 'Designation not set',
          city: row?.employee?.city || '',
          reportingTo: row?.employee?.reportingTo || '--',
        },
        dailyStatuses: Array.isArray(row?.dailyStatuses) ? row.dailyStatuses : [],
        summary: {
          present: Number(row?.summary?.present || 0),
          late: Number(row?.summary?.late || 0),
          halfDay: Number(row?.summary?.halfDay || 0),
          absent: Number(row?.summary?.absent || 0),
          off: Number(row?.summary?.off || 0),
          holiday: Number(row?.summary?.holiday || 0),
          leave: Number(row?.summary?.leave || 0),
          missing: Number(row?.summary?.missing || 0),
        },
      }));
  }, [mode, response?.rows]);
  const calendarDays = response?.calendarDays || [];

  const filteredEmployeeOptions = useMemo(() => {
    return response?.employeeOptions || [];
  }, [response?.employeeOptions]);

  async function exportExcelFile(rows: Array<Record<string, any>>, fileName: string, sheetName: string) {
    if (!rows.length) {
      return;
    }

    const XLSX = await ensureXlsxLoaded();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
  }

  const handleExportMonthlyExcel = async () => {
    const rows = monthlyRows.map((row) => {
      const base: Record<string, any> = {
        employee_id: row.employee?.employeeId || '--',
        employee_name: row.employee?.name || 'Employee',
        department: row.employee?.department || 'Department not set',
        designation: row.employee?.designation || 'Designation not set',
      };

      for (const day of row.dailyStatuses || []) {
        const dayNumber = String(day.date).slice(-2);
        base[`day_${dayNumber}`] = day.code;
      }

      base.present = row.summary.present;
      base.late = row.summary.late;
      base.half_day = row.summary.halfDay;
      base.absent = row.summary.absent;
      base.off = row.summary.off;
      base.holiday = row.summary.holiday;
      base.leave = row.summary.leave;
      base.missing = row.summary.missing;
      return base;
    });

    const employeeName =
      filteredEmployeeOptions.find((employee) => employee.id === selectedEmployeeId)?.name || 'all_employees';
    await exportExcelFile(
      rows,
      `monthly_attendance_${safeFilePart(selectedMonth)}_${safeFilePart(selectedEmployeeId ? employeeName : 'all')}.xlsx`,
      'Monthly Attendance'
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      <section className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100/90 text-violet-700 shadow-sm">
            <span className="material-symbols-outlined text-[22px]">calendar_clock</span>
          </div>
          <h1 className="text-3xl font-headline font-bold text-on-background">Attendance</h1>
        </div>
        <p className="pl-14 text-sm leading-6 text-on-surface-variant">
          Review daily attendance across the team or drill into one employee&apos;s attendance history.
        </p>
      </section>

      <section className="overflow-x-auto">
        <div className="relative inline-grid min-w-full grid-cols-3 items-center overflow-hidden rounded-[1.35rem] bg-[#F1F4F5] p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] md:min-w-[640px]">
          <div
            className="absolute inset-y-1.5 left-1.5 w-[calc((100%-0.75rem)/3)] rounded-[1rem] bg-[linear-gradient(180deg,#eadcff_0%,#cfbdfd_100%)] shadow-[0_8px_18px_rgba(167,139,250,0.20)] transition-transform duration-300 ease-out"
            style={{ transform: `translateX(calc(${activeIndex} * 100%))` }}
          />
          {sectionCards.map((section) => {
            const isActive = mode === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setMode(section.id)}
                className={`relative z-10 inline-flex items-center justify-center gap-2 rounded-[1rem] px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive ? 'text-violet-950' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {section.id === 'daily' ? 'today' : section.id === 'individual' ? 'person_search' : 'calendar_month'}
                </span>
                <span className="whitespace-nowrap">{section.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-4">
        {mode === 'daily' ? (
          <>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by employee name or ID"
              className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none"
            >
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="halfday">Half Day</option>
              <option value="on_leave">On Leave</option>
              <option value="holiday">Holiday</option>
              <option value="weekend">Weekend</option>
            </select>
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none"
            >
              <option value="">All Departments</option>
              {(response?.departmentOptions || []).map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </>
        ) : mode === 'individual' ? (
          <>
            <select
              value={selectedEmployeeId}
              onChange={(event) => setSelectedEmployeeId(event.target.value)}
              className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none"
            >
              <option value="">Select Employee</option>
              {filteredEmployeeOptions.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} {employee.employeeId ? `(${employee.employeeId})` : ''}
                </option>
              ))}
            </select>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none"
            >
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="halfday">Half Day</option>
              <option value="on_leave">On Leave</option>
              <option value="holiday">Holiday</option>
              <option value="weekend">Weekend</option>
            </select>
            <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
              {response?.employee
                ? `${response.employee.department || 'Department not set'} • ${response.employee.designation || 'Designation not set'}`
                : 'Choose an employee to load attendance history'}
            </div>
          </>
        ) : (
          <>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none"
            />
            <select
              value={selectedEmployeeId}
              onChange={(event) => setSelectedEmployeeId(event.target.value)}
              className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none"
            >
              <option value="">All Employees</option>
              {filteredEmployeeOptions.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} {employee.employeeId ? `(${employee.employeeId})` : ''}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none"
            >
              <option value="">All Status</option>
              {(response?.statusOptions || []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleExportMonthlyExcel}
              disabled={monthlyRows.length === 0}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition ${
                monthlyRows.length === 0
                  ? 'cursor-not-allowed bg-slate-200 text-slate-500 shadow-none'
                  : 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Export Excel
            </button>
          </>
        )}
      </section>

      <section className={mode === 'monthly' ? 'space-y-4' : 'rounded-[1.75rem] border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-sm'}>
        {isLoading ? (
          <LoadingPanel
            title={mode === 'daily' ? 'Loading daily attendance' : mode === 'individual' ? 'Loading attendance history' : 'Loading monthly attendance'}
            message="Attendance rows are being prepared."
          />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : mode === 'daily' ? (
          <>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-headline font-bold text-on-background">Daily Attendance</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Attendance view for {response?.date || selectedDate}.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {dailyRows.length} employees
              </span>
            </div>

            {dailyRows.length === 0 ? (
              <HrmEmptyState
                icon="event_busy"
                title="No attendance rows found"
                message="Try another date or widen the filters to view employee attendance records."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1500px] w-full text-left">
                  <thead className="border-b border-outline-variant/10 bg-surface-container-low/50">
                    <tr>
                      {['Employee ID', 'Employee Name', 'Department', 'Designation', 'Reporting To', 'Date', 'Status', 'Check-in', 'Check-out', 'Late In', 'Early Out', 'Work Hours', 'Notes / Source'].map((column) => (
                        <th key={column} className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {dailyRows.map((row) => (
                      <tr key={`${row.employeeId}-${row.date}`}>
                        <td className="px-4 py-4 text-sm font-semibold text-on-surface">{row.employeeId}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.employeeName}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.department}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.designation}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.reportingTo}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.date}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.statusLabel}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.checkIn}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.checkOut}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.lateIn}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.earlyOut}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.workHours}</td>
                        <td className="px-4 py-4 text-sm text-on-surface-variant">
                          {row.notes || row.source || '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
            )}
          </>
        ) : mode === 'individual' ? (
          <>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-headline font-bold text-on-background">Individual Attendance</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {response?.employee
                    ? `${response.employee.name} (${response.employee.employeeId || 'No ID'})`
                    : 'Select an employee to track daily attendance across the chosen month.'}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {individualRows.length} days
              </span>
            </div>

            {!selectedEmployeeId ? (
              <HrmEmptyState
                icon="person_search"
                title="Choose an employee"
                message="Select one employee from the filter row above to inspect their attendance history."
              />
            ) : individualRows.length === 0 ? (
              <HrmEmptyState
                icon="event_busy"
                title="No attendance records found"
                message="No attendance rows matched this employee and filter combination."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full text-left">
                  <thead className="border-b border-outline-variant/10 bg-surface-container-low/50">
                    <tr>
                      {['Date', 'Status', 'Check-in', 'Check-out', 'Late In', 'Early Out', 'Work Hours', 'Shift Hours', 'Notes'].map((column) => (
                        <th key={column} className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {individualRows.map((row) => (
                      <tr key={row.date}>
                        <td className="px-4 py-4 text-sm font-semibold text-on-surface">{row.date}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.statusLabel}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.checkIn}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.checkOut}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.lateIn}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.earlyOut}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.workHours}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{row.shiftHours || '9h 00m'}</td>
                        <td className="px-4 py-4 text-sm text-on-surface-variant">{row.notes || '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-0 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-headline font-bold text-on-background">Monthly Attendance</h2>
              </div>
            </div>

            {monthlyRows.length === 0 ? (
              <HrmEmptyState
                icon="calendar_month"
                title="No monthly attendance found"
                message="Try another month or widen the employee and status filters."
              />
            ) : (
              <div className="space-y-7">
                <div className="flex items-center gap-3 overflow-x-auto">
                  <div className="shrink-0 text-sm leading-none text-on-surface-variant whitespace-nowrap">
                    Month-wise attendance matrix for {formatMonthLabel(response?.month || selectedMonth)}.
                  </div>
                  <div className="min-w-0 flex-1 pl-17">
                    <div className="inline-flex items-center gap-2 rounded-full border border-outline-variant/10 bg-surface-container-low px-3 py-1 text-[11px] text-on-surface-variant shadow-sm whitespace-nowrap">
                      {[
                        ['P', 'present'],
                        ['L', 'late'],
                        ['A', 'absent'],
                        ['HD', 'halfday'],
                        ['LV', 'on_leave'],
                        ['H', 'holiday'],
                        ['OFF', 'weekend'],
                      ].map(([code, status]) => (
                        <div key={code} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <span
                            className={`inline-flex min-w-[28px] items-center justify-center rounded-md px-1.5 py-0.5 text-[9px] font-bold ${getStatusCellTone(status)}`}
                          >
                            {code}
                          </span>
                          <span>{status === 'weekend' ? 'Off' : status.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-xl border border-outline-variant/10 bg-surface-container-low px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm whitespace-nowrap">
                    {monthlyRows.length} employees
                  </span>
                </div>
                <div className="overflow-x-auto">
                <table className="min-w-[1320px] w-full border-separate border-spacing-0 text-center">
                  <thead>
                    <tr className="bg-surface-container-low/40">
                      <th className="sticky left-0 z-20 min-w-[190px] border-b border-r border-outline-variant/10 bg-white px-3 py-2.5 text-left text-sm font-bold text-on-surface shadow-[8px_0_18px_rgba(255,255,255,0.95)]">
                        Employee
                      </th>
                      {calendarDays.map((day) => (
                        <th
                          key={day.date}
                          className="min-w-[32px] border-b border-r border-outline-variant/10 px-0.5 py-2 text-[10px] font-bold text-on-surface"
                        >
                          <div>{day.dayNumber}</div>
                          <div className="mt-0.5 text-[9px] font-medium text-on-surface-variant">{day.weekdayShort}</div>
                        </th>
                      ))}
                      {[
                        ['P', 'present'],
                        ['L', 'late'],
                        ['HD', 'halfDay'],
                        ['A', 'absent'],
                        ['OFF', 'off'],
                        ['H', 'holiday'],
                        ['LV', 'leave'],
                        ['?', 'missing'],
                      ].map(([label]) => (
                        <th
                          key={label}
                          className="min-w-[34px] border-b border-r border-outline-variant/10 px-1 py-2 text-[10px] font-bold text-on-surface"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRows.map((row) => (
                      <tr
                        key={row.employee.id || `${row.employee.employeeId}-${row.employee.name}`}
                        className="odd:bg-white even:bg-surface-container-lowest/40"
                      >
                        <td className="sticky left-0 z-10 border-b border-r border-outline-variant/10 bg-white px-3 py-2.5 text-left shadow-[8px_0_18px_rgba(255,255,255,0.95)]">
                          <div className="truncate text-[13px] font-semibold text-on-surface">
                            {row.employee.name}{' '}
                            <span className="font-medium text-on-surface-variant">[{row.employee.employeeId}]</span>
                          </div>
                          <div className="mt-1 truncate text-[11px] text-on-surface-variant">{getEmployeeMetaLine(row.employee)}</div>
                          <div className="hidden sr-only">
                            {row.employee.employeeId} · {row.employee.designation}
                          </div>
                          <div className="hidden sr-only">{row.employee.department}</div>
                        </td>
                        {row.dailyStatuses.map((day) => (
                          <td
                            key={`${row.employee.id || row.employee.employeeId}-${day.date}`}
                            title={`${day.label}${day.notes ? ` • ${day.notes}` : ''}`}
                            className={`border-b border-r border-outline-variant/10 px-0.5 py-2 text-[10px] font-semibold ${getStatusCellTone(day.status)}`}
                          >
                            {day.code}
                          </td>
                        ))}
                        <td className="border-b border-r border-outline-variant/10 px-1 py-2 text-[10px] font-semibold text-on-surface">{row.summary.present}</td>
                        <td className="border-b border-r border-outline-variant/10 px-1 py-2 text-[10px] font-semibold text-on-surface">{row.summary.late}</td>
                        <td className="border-b border-r border-outline-variant/10 px-1 py-2 text-[10px] font-semibold text-on-surface">{row.summary.halfDay}</td>
                        <td className="border-b border-r border-outline-variant/10 px-1 py-2 text-[10px] font-semibold text-on-surface">{row.summary.absent}</td>
                        <td className="border-b border-r border-outline-variant/10 px-1 py-2 text-[10px] font-semibold text-on-surface">{row.summary.off}</td>
                        <td className="border-b border-r border-outline-variant/10 px-1 py-2 text-[10px] font-semibold text-on-surface">{row.summary.holiday}</td>
                        <td className="border-b border-r border-outline-variant/10 px-1 py-2 text-[10px] font-semibold text-on-surface">{row.summary.leave}</td>
                        <td className="border-b border-r border-outline-variant/10 px-1 py-2 text-[10px] font-semibold text-on-surface">{row.summary.missing}</td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
