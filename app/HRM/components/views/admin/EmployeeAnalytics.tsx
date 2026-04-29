'use client';

import React, { useEffect, useMemo, useState } from 'react';
import HrmEmptyState from '../../ui/HrmEmptyState';
import { LoadingPanel } from '../../ui/Skeleton';

type AnalyticsResponse = {
  success: boolean;
  filters: {
    month: string;
    start: string;
    end: string;
  };
  snapshot: {
    totalEmployees: number;
    activeEmployees: number;
    employeesOnLeave: number;
    todayLateAttendance: number;
  };
  attendance: {
    presentCount: number;
    lateCount: number;
    absentCount: number;
    halfDayCount: number;
    totalRows: number;
    distribution: Array<{
      key: string;
      label: string;
      count: number;
      statusLabel: string;
    }>;
  };
  leave: {
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    lopDaysTotal: number;
  };
  queue: {
    pendingRegularizationCount: number;
    pendingExpenseReviewCount: number;
    openTicketCount: number;
    pendingTaskCount: number;
  };
  highlights: {
    topLateEmployees: Array<{
      id: string;
      employeeId: string;
      name: string;
      department: string;
      designation: string;
      lateCount: number;
    }>;
  };
};

function formatMonthLabel(value: string) {
  if (!value) return 'Current Month';
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: string;
  tone: string;
}) {
  return (
    <div className={`rounded-[1.5rem] border border-white/70 p-4 shadow-[0_16px_32px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.92)] ${tone}`}>
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined block text-[24px] leading-none text-on-surface">{icon}</span>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-on-surface-variant/70">{title}</p>
      </div>
      <div className="mt-6">
        <p className="text-3xl font-headline font-extrabold text-on-surface">{value}</p>
        <p className="mt-3 text-sm text-on-surface-variant">{subtitle}</p>
      </div>
    </div>
  );
}

export default function EmployeeAnalytics() {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadAnalytics() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/HRM/api/admin/analytics?month=${selectedMonth}`, { method: 'GET' });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load analytics');
        }

        if (active) {
          setAnalytics(result);
        }
      } catch (requestError: any) {
        if (active) {
          setAnalytics(null);
          setError(requestError?.message || 'Failed to load analytics');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadAnalytics();
    return () => {
      active = false;
    };
  }, [selectedMonth]);

  const maxDistributionCount = useMemo(() => {
    return Math.max(...(analytics?.attendance.distribution || []).map((item) => item.count), 1);
  }, [analytics?.attendance.distribution]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100/90 text-violet-700 shadow-sm">
              <span className="material-symbols-outlined text-[22px]">insights</span>
            </div>
            <h1 className="text-3xl font-headline font-bold text-on-background">HR Analytics</h1>
          </div>
          <p className="pl-14 text-sm leading-6 text-on-surface-variant">
            Minimal monthly analytics for workforce movement, attendance, leave, and the live HR admin queue.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="rounded-2xl border border-outline-variant/15 bg-white px-4 py-3 text-sm text-on-surface outline-none"
          />
        </div>
      </section>

      {loading ? (
        <LoadingPanel
          title="Loading HR analytics"
          message="Pulling workforce, attendance, leave, and queue insights for the selected month."
        />
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : analytics ? (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Total Employees"
              value={analytics.snapshot.totalEmployees}
              subtitle={`${analytics.snapshot.activeEmployees} active right now`}
              icon="groups"
              tone="bg-gradient-to-br from-violet-50 via-white to-fuchsia-100/70"
            />
            <MetricCard
              title="Active Employees"
              value={analytics.snapshot.activeEmployees}
              subtitle="Current active workforce"
              icon="badge"
              tone="bg-gradient-to-br from-sky-50 via-white to-blue-100/70"
            />
            <MetricCard
              title="Employees On Leave"
              value={analytics.snapshot.employeesOnLeave}
              subtitle="Current live leave status"
              icon="event_busy"
              tone="bg-gradient-to-br from-amber-50 via-white to-orange-100/60"
            />
            <MetricCard
              title="Today Late Attendance"
              value={analytics.snapshot.todayLateAttendance}
              subtitle="Late-marked employees today"
              icon="alarm_on"
              tone="bg-gradient-to-br from-emerald-50 via-white to-teal-100/70"
            />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]">
            <div className="rounded-[1.75rem] border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-headline font-bold text-on-background">Attendance Insight</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {formatMonthLabel(analytics.filters.month)} attendance distribution from live records.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {analytics.attendance.totalRows} rows
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { label: 'Present', value: analytics.attendance.presentCount },
                  { label: 'Late', value: analytics.attendance.lateCount },
                  { label: 'Absent', value: analytics.attendance.absentCount },
                  { label: 'Half Day', value: analytics.attendance.halfDayCount },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">{item.label}</p>
                    <p className="mt-3 text-2xl font-headline font-extrabold text-on-surface">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-3">
                {analytics.attendance.distribution.map((item) => (
                  <div key={item.key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-on-surface">{item.statusLabel}</span>
                      <span className="font-bold text-on-surface">{item.count}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-surface-container-low">
                      <div
                        className={`h-full rounded-full ${
                          item.key === 'late'
                            ? 'bg-amber-500'
                            : item.key === 'absent'
                              ? 'bg-rose-500'
                              : item.key === 'halfday'
                                ? 'bg-sky-500'
                                : item.key === 'on_leave'
                                  ? 'bg-violet-500'
                                  : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.max((item.count / maxDistributionCount) * 100, item.count > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[1.75rem] border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-headline font-bold text-on-background">Leave Insight</h2>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Review outcomes and LOP impact for {formatMonthLabel(analytics.filters.month)}.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Pending Leave</p>
                    <p className="mt-3 text-2xl font-headline font-extrabold text-on-surface">{analytics.leave.pendingCount}</p>
                  </div>
                  <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Approved</p>
                    <p className="mt-3 text-2xl font-headline font-extrabold text-on-surface">{analytics.leave.approvedCount}</p>
                  </div>
                  <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Rejected</p>
                    <p className="mt-3 text-2xl font-headline font-extrabold text-on-surface">{analytics.leave.rejectedCount}</p>
                  </div>
                  <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">LOP Days</p>
                    <p className="mt-3 text-2xl font-headline font-extrabold text-on-surface">{analytics.leave.lopDaysTotal}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-headline font-bold text-on-background">HR Admin Queue</h2>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Live operational workload for the current HR admin.
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    {analytics.queue.pendingTaskCount} open
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Pending Regularization', value: analytics.queue.pendingRegularizationCount, icon: 'fact_check' },
                    { label: 'Pending Expense Reviews', value: analytics.queue.pendingExpenseReviewCount, icon: 'receipt_long' },
                    { label: 'Open Tickets', value: analytics.queue.openTicketCount, icon: 'support_agent' },
                    { label: 'Pending Tasks for HR Admin', value: analytics.queue.pendingTaskCount, icon: 'assignment_late' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">{item.icon}</span>
                        <span className="text-sm font-medium text-on-surface">{item.label}</span>
                      </div>
                      <span className="text-lg font-headline font-extrabold text-on-surface">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-headline font-bold text-on-background">Top Late Employees</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Employees with the highest late attendance count in {formatMonthLabel(analytics.filters.month)}.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {analytics.highlights.topLateEmployees.length} employees
              </span>
            </div>

            {analytics.highlights.topLateEmployees.length === 0 ? (
              <HrmEmptyState
                compact
                icon="celebration"
                title="No late attendance recorded"
                message="This month currently has no late-marked employees in the attendance records."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[820px] w-full text-left">
                  <thead className="border-b border-outline-variant/10 bg-surface-container-low/50">
                    <tr>
                      {['Employee', 'Employee ID', 'Department', 'Designation', 'Late Count'].map((column) => (
                        <th key={column} className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {analytics.highlights.topLateEmployees.map((employee) => (
                      <tr key={employee.id}>
                        <td className="px-4 py-4 text-sm font-semibold text-on-surface">{employee.name}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{employee.employeeId}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{employee.department}</td>
                        <td className="px-4 py-4 text-sm text-on-surface">{employee.designation}</td>
                        <td className="px-4 py-4 text-sm font-bold text-on-surface">{employee.lateCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
