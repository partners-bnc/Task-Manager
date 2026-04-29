'use client';

import React, { useEffect, useMemo, useState } from 'react';
import HrmEmptyState from '../../ui/HrmEmptyState';
import { LoadingPanel } from '../../ui/Skeleton';

type AttendanceMode = 'daily' | 'individual';

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
};

type AttendanceResponse = {
  mode: AttendanceMode;
  rows: DailyRow[];
  date?: string;
  month?: string;
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
  ];

  const activeIndex = sectionCards.findIndex((section) => section.id === mode);
  const dailyRows = mode === 'daily' ? response?.rows || [] : [];
  const individualRows = mode === 'individual' ? response?.rows || [] : [];

  const filteredEmployeeOptions = useMemo(() => {
    return response?.employeeOptions || [];
  }, [response?.employeeOptions]);

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
        <div className="relative inline-grid min-w-full grid-cols-2 items-center overflow-hidden rounded-[1.35rem] bg-[#F1F4F5] p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] md:min-w-[420px]">
          <div
            className="absolute inset-y-1.5 left-1.5 w-[calc((100%-0.75rem)/2)] rounded-[1rem] bg-[linear-gradient(180deg,#eadcff_0%,#cfbdfd_100%)] shadow-[0_8px_18px_rgba(167,139,250,0.20)] transition-transform duration-300 ease-out"
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
                  {section.id === 'daily' ? 'today' : 'person_search'}
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
        ) : (
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
        )}
      </section>

      <section className="rounded-[1.75rem] border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-sm">
        {isLoading ? (
          <LoadingPanel
            title={mode === 'daily' ? 'Loading daily attendance' : 'Loading attendance history'}
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
        ) : (
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
        )}
      </section>
    </div>
  );
}
