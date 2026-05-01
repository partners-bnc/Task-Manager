'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import HrmEmptyState from '../../ui/HrmEmptyState';
import { LoadingPanel } from '../../ui/Skeleton';

type TrendDay = {
  date: string;
  label: string;
  present: number;
  absent: number;
  halfday: number;
  onLeave: number;
  total: number;
  punctualityScore: number;
};

type DistributionItem = {
  key: string;
  label: string;
  count: number;
  statusLabel: string;
  percentage: number;
};

type PersonHalfDay = {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  designation: string;
  halfDayCount: number;
};

type PersonAbsent = {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  designation: string;
  absentCount: number;
};

type JoinerCard = {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  designation: string;
  joinedOn: string;
  profilePictureUrl: string;
};

type LeaveCard = {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  designation: string;
  startDate: string;
  endDate: string;
  session: string;
  leaveType: string;
};

type AnalyticsResponse = {
  success: boolean;
  filters: {
    month: string;
    start: string;
    end: string;
    startAt: string;
    endAt: string;
  };
  attendance: {
    totalRows: number;
    punctualityScore: number;
    attentionRate: number;
    distribution: DistributionItem[];
    dailyTrend: TrendDay[];
    weekdayTrend: Array<{
      key: string;
      label: string;
      present: number;
      absent: number;
      halfday: number;
      onLeave: number;
      total: number;
    }>;
    topHalfDayEmployees: PersonHalfDay[];
    topAbsentEmployees: PersonAbsent[];
  };
  leave: {
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    lopDaysTotal: number;
    typeDistribution: Array<{
      name: string;
      count: number;
    }>;
    upcomingApproved: LeaveCard[];
  };
  workforce: {
    departmentDistribution: Array<{
      department: string;
      count: number;
      activeCount: number;
      onLeaveCount: number;
      share: number;
    }>;
    lifecycleDistribution: Array<{
      key: string;
      label: string;
      count: number;
      share: number;
    }>;
    joinedThisMonth: number;
    joinedLast30Days: number;
    cards: JoinerCard[];
  };
  queue: {
    pendingRegularizationCount: number;
    pendingExpenseReviewCount: number;
    openTicketCount: number;
    pendingLeaveCount: number;
    pendingTaskCount: number;
    pressureLabel: string;
  };
};

const COLORS = {
  ink: '#243447',
  text: '#607285',
  line: '#D9E4EE',
  surface: '#FFFFFF',
  shell: '#F4F8FB',
  present: '#9BD3AE',
  absent: '#ABC3EE',
  halfday: '#E8D5AF',
  onLeave: '#A6D7DE',
  accent: '#8FA8BF',
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

function formatDate(value: string) {
  if (!value) return '--';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatShortDate(value: string) {
  if (!value) return '--';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

function formatSessionLabel(value: string) {
  return String(value || 'full_day')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (part) => part.toUpperCase());
}

function getInitials(name = '') {
  return String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'HR';
}

function getStatusColor(key: string) {
  switch (key) {
    case 'present':
      return COLORS.present;
    case 'absent':
      return COLORS.absent;
    case 'halfday':
      return COLORS.halfday;
    case 'on_leave':
      return COLORS.onLeave;
    default:
      return COLORS.accent;
  }
}

function SectionCard({
  title,
  subtitle,
  children,
  className = '',
  right = null,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className={`rounded-[1.9rem] border border-[#DCE6EF] bg-white p-6 shadow-[0_18px_40px_rgba(36,52,71,0.06)] ${className}`}>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-[1.85rem] font-headline font-extrabold tracking-tight text-[#243447]">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#647689]">{subtitle}</p>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function MiniMetric({
  label,
  value,
  note,
}: {
  label: string;
  value: number | string;
  note: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-[#E1E9F0] bg-[#F8FBFD] px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7B8C9D]">{label}</p>
      <p className="mt-2 text-3xl font-headline font-extrabold text-[#243447]">{value}</p>
      <p className="mt-1 text-sm text-[#6A7B8D]">{note}</p>
    </div>
  );
}

function Avatar({ src, name }: { src?: string; name: string }) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={44}
        height={44}
        className="h-11 w-11 rounded-full object-cover"
        unoptimized
      />
    );
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E7EEF7] text-sm font-bold text-[#4E6177]">
      {getInitials(name)}
    </div>
  );
}

function StatusLegend() {
  const items = [
    { key: 'present', label: 'Present' },
    { key: 'absent', label: 'Absent' },
    { key: 'halfday', label: 'Half Day' },
    { key: 'on_leave', label: 'On Leave' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <div
          key={item.key}
          className="inline-flex items-center gap-2 rounded-full border border-[#E0E8F0] bg-[#FAFCFD] px-3 py-1.5 text-xs font-semibold text-[#627487]"
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getStatusColor(item.key) }} />
          {item.label}
        </div>
      ))}
    </div>
  );
}

function RechartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-[#DCE6EF] bg-white px-4 py-3 shadow-[0_14px_32px_rgba(36,52,71,0.1)]">
      {label ? <div className="mb-2 text-sm font-bold text-[#243447]">{label}</div> : null}
      <div className="space-y-1.5">
        {payload.map((item) => (
          <div key={`${item.name}-${item.value}`} className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-[#647689]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color || COLORS.accent }} />
              {item.name}
            </div>
            <span className="font-bold text-[#243447]">{item.value ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WatchTable({
  title,
  people,
  countKey,
  emptyTitle,
}: {
  title: string;
  people: Array<PersonHalfDay | PersonAbsent>;
  countKey: 'halfDayCount' | 'absentCount';
  emptyTitle: string;
}) {
  return (
    <div className="rounded-[1.45rem] border border-[#E2EAF1] bg-[#FBFCFD] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#75889A]">{title}</h3>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#647689] shadow-sm">
          {people.length} people
        </span>
      </div>

      {people.length === 0 ? (
        <div className="rounded-[1rem] border border-dashed border-[#DCE6EF] bg-white px-4 py-5 text-sm text-[#6B7C8D]">
          {emptyTitle}
        </div>
      ) : (
        <div className="space-y-3">
          {people.map((person) => (
            <div key={person.id} className="flex items-center justify-between gap-3 rounded-[1rem] border border-[#E5ECF2] bg-white px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#243447]">{person.name}</p>
                <p className="truncate text-xs text-[#6A7B8D]">
                  {person.employeeId} · {person.designation} · {person.department}
                </p>
              </div>
              <div className="rounded-full bg-[#EEF3F8] px-3 py-1.5 text-sm font-extrabold text-[#314457]">
                {person[countKey]}
              </div>
            </div>
          ))}
        </div>
      )}
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
      } catch (requestError: unknown) {
        if (active) {
          setAnalytics(null);
          setError(requestError instanceof Error ? requestError.message : 'Failed to load analytics');
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

  const attendanceTrendData = useMemo(
    () =>
      (analytics?.attendance.dailyTrend || []).map((item) => ({
        label: item.label,
        Present: item.present,
        Absent: item.absent,
        'Half Day': item.halfday,
        'On Leave': item.onLeave,
      })),
    [analytics?.attendance.dailyTrend]
  );

  const departmentData = useMemo(
    () =>
      (analytics?.workforce.departmentDistribution || []).map((item) => ({
        name: item.department.length > 18 ? `${item.department.slice(0, 18)}…` : item.department,
        fullName: item.department,
        employees: item.count,
      })),
    [analytics?.workforce.departmentDistribution]
  );

  const lifecycleData = useMemo(
    () =>
      (analytics?.workforce.lifecycleDistribution || []).map((item) => ({
        name: item.label,
        value: item.count,
        share: item.share,
      })),
    [analytics?.workforce.lifecycleDistribution]
  );

  const leaveTypeData = useMemo(
    () =>
      (analytics?.leave.typeDistribution || []).map((item) => ({
        name: item.name.length > 16 ? `${item.name.slice(0, 16)}…` : item.name,
        fullName: item.name,
        requests: item.count,
      })),
    [analytics?.leave.typeDistribution]
  );

  const lifecycleColors = ['#9BD3AE', '#C6B8F2', '#ABC3EE', '#A6D7DE', '#E8D5AF', '#D8E2EA'];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F4F8FB_0%,#F8FBFD_100%)] px-6 py-6">
      <div className="mx-auto max-w-[1480px] space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-[2rem] border border-[#DBE6EE] bg-white px-7 py-6 shadow-[0_16px_36px_rgba(36,52,71,0.05)]"
        >
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#7B8D9F]">Page Header</div>
              <h1 className="mt-2 text-4xl font-headline font-extrabold tracking-tight text-[#243447]">
                HR Analytics
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#66798C]">
                A cleaner monthly analytics page for HRM with focused charts for attendance, workforce structure,
                leave behaviour, review queue, and people watchlists.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-[1.2rem] border border-[#DFE8F0] bg-[#F8FBFD] px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8092A4]">Period</div>
                <div className="mt-1 text-sm font-semibold text-[#243447]">
                  {analytics ? `${formatDate(analytics.filters.start)} to ${formatDate(analytics.filters.end)}` : 'Selected month'}
                </div>
              </div>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="rounded-[1.2rem] border border-[#DFE8F0] bg-white px-4 py-3 text-sm font-medium text-[#243447] outline-none"
              />
            </div>
          </div>
        </motion.section>

        {loading ? (
          <LoadingPanel
            title="Loading HR analytics"
            message="Preparing the simplified analytics layout and chart data for the selected month."
          />
        ) : error ? (
          <div className="rounded-[1.5rem] border border-[#E9D8DE] bg-[#FBF5F7] px-5 py-4 text-sm font-medium text-[#8A6470]">
            {error}
          </div>
        ) : analytics ? (
          <>
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]"
            >
              <SectionCard
                title="Attendance Trend"
                subtitle={`Daily attendance flow across ${formatMonthLabel(selectedMonth)}. The chart keeps the page simple and shows how each status is distributed over time.`}
                right={<StatusLegend />}
              >
                {attendanceTrendData.length === 0 ? (
                  <HrmEmptyState
                    compact
                    icon="monitoring"
                    title="No attendance trend available"
                    message="Attendance records for the selected month will appear here as soon as they are available."
                  />
                ) : (
                  <div className="h-[360px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={attendanceTrendData} margin={{ top: 18, right: 12, left: -16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="presentFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.present} stopOpacity={0.65} />
                            <stop offset="95%" stopColor={COLORS.present} stopOpacity={0.12} />
                          </linearGradient>
                          <linearGradient id="halfDayFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.halfday} stopOpacity={0.55} />
                            <stop offset="95%" stopColor={COLORS.halfday} stopOpacity={0.08} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: COLORS.text, fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: COLORS.text, fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip content={<RechartTooltip />} />
                        <Area type="monotone" dataKey="Present" stackId="1" stroke={COLORS.present} fill="url(#presentFill)" strokeWidth={2} />
                        <Area type="monotone" dataKey="Absent" stackId="1" stroke={COLORS.absent} fill={COLORS.absent} fillOpacity={0.22} strokeWidth={2} />
                        <Area type="monotone" dataKey="Half Day" stackId="1" stroke={COLORS.halfday} fill="url(#halfDayFill)" strokeWidth={2} />
                        <Area type="monotone" dataKey="On Leave" stackId="1" stroke={COLORS.onLeave} fill={COLORS.onLeave} fillOpacity={0.18} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Queue Overview"
                subtitle="Simple live workload snapshot for HR review operations."
              >
                <div className="space-y-4">
                  <MiniMetric
                    label="Pending Review Items"
                    value={analytics.queue.pendingTaskCount}
                    note={`${analytics.queue.pressureLabel} workload`}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <MiniMetric label="Leave" value={analytics.queue.pendingLeaveCount} note="Pending approvals" />
                    <MiniMetric label="Regularization" value={analytics.queue.pendingRegularizationCount} note="Needs decision" />
                    <MiniMetric label="Expense" value={analytics.queue.pendingExpenseReviewCount} note="Awaiting review" />
                    <MiniMetric label="Tickets" value={analytics.queue.openTicketCount} note="Open support items" />
                  </div>
                </div>
              </SectionCard>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.09 }}
              className="grid gap-6 xl:grid-cols-2"
            >
              <SectionCard
                title="Department Composition"
                subtitle="Current department mix based on visible employee records."
              >
                {departmentData.length === 0 ? (
                  <HrmEmptyState
                    compact
                    icon="apartment"
                    title="No department composition available"
                    message="Department-based composition will appear here once employee department records are present."
                  />
                ) : (
                  <div className="h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={departmentData} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: COLORS.text, fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: COLORS.text, fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip content={<RechartTooltip />} />
                        <Bar dataKey="employees" radius={[12, 12, 0, 0]} fill={COLORS.accent} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Lifecycle Spread"
                subtitle="A simple stage view across active, probation, leave, notice period, and separated workforce states."
              >
                {lifecycleData.length === 0 ? (
                  <HrmEmptyState
                    compact
                    icon="donut_large"
                    title="No lifecycle data available"
                    message="Lifecycle stage distribution will appear here when employee stage data is available."
                  />
                ) : (
                  <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={lifecycleData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={62}
                            outerRadius={96}
                            paddingAngle={2}
                            stroke="none"
                          >
                            {lifecycleData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={lifecycleColors[index % lifecycleColors.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<RechartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-3">
                      {lifecycleData.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between rounded-[1.1rem] border border-[#E3EAF1] bg-[#FBFCFD] px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: lifecycleColors[index % lifecycleColors.length] }}
                            />
                            <div>
                              <p className="text-sm font-bold text-[#243447]">{item.name}</p>
                              <p className="text-xs text-[#6B7C8D]">{item.share}% of visible workforce</p>
                            </div>
                          </div>
                          <span className="text-sm font-extrabold text-[#314457]">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.13 }}
              className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
            >
              <SectionCard
                title="Leave Patterns"
                subtitle="Leave type demand for the selected month, followed by approved leave windows that are still upcoming."
              >
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div>
                    {leaveTypeData.length === 0 ? (
                      <HrmEmptyState
                        compact
                        icon="event_busy"
                        title="No leave pattern available"
                        message="Leave type trends will appear here when leave requests exist in the selected month."
                      />
                    ) : (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={leaveTypeData} layout="vertical" margin={{ top: 10, right: 16, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} horizontal={false} />
                            <XAxis type="number" tick={{ fill: COLORS.text, fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <YAxis type="category" dataKey="name" tick={{ fill: COLORS.text, fontSize: 12 }} tickLine={false} axisLine={false} width={120} />
                            <Tooltip content={<RechartTooltip />} />
                            <Bar dataKey="requests" radius={[0, 12, 12, 0]} fill={COLORS.onLeave} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <MiniMetric label="Pending Leave" value={analytics.leave.pendingCount} note="Pending requests" />
                    <MiniMetric label="Approved Leave" value={analytics.leave.approvedCount} note="Approved in range" />
                    <MiniMetric label="Rejected Leave" value={analytics.leave.rejectedCount} note="Rejected in range" />
                    <MiniMetric label="LOP Days" value={analytics.leave.lopDaysTotal} note="Loss of pay total" />
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#7B8C9D]">Upcoming Approved Leave</h3>
                  <div className="mt-3 space-y-3">
                    {analytics.leave.upcomingApproved.length === 0 ? (
                      <div className="rounded-[1rem] border border-dashed border-[#DCE6EF] bg-[#FBFCFD] px-4 py-5 text-sm text-[#6B7C8D]">
                        No upcoming approved leave windows were found for this selected period.
                      </div>
                    ) : (
                      analytics.leave.upcomingApproved.slice(0, 4).map((item) => (
                        <div key={item.id} className="flex flex-col gap-3 rounded-[1.1rem] border border-[#E4EBF2] bg-[#FBFCFD] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#243447]">{item.name}</p>
                            <p className="truncate text-xs text-[#6A7B8D]">
                              {item.employeeId} · {item.designation} · {item.department}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-[#627487]">
                            <span className="rounded-full bg-white px-3 py-1.5">{item.leaveType}</span>
                            <span className="rounded-full bg-white px-3 py-1.5">
                              {formatShortDate(item.startDate)} to {formatShortDate(item.endDate)}
                            </span>
                            <span className="rounded-full bg-white px-3 py-1.5">{formatSessionLabel(item.session)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Recent Joiners"
                subtitle="Simple hiring movement list using employee join date."
                right={
                  <div className="rounded-[1.2rem] border border-[#DFE8F0] bg-[#F8FBFD] px-4 py-3 text-right">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8092A4]">This Month</div>
                    <div className="mt-1 text-3xl font-headline font-extrabold text-[#243447]">
                      {analytics.workforce.joinedThisMonth}
                    </div>
                  </div>
                }
              >
                {analytics.workforce.cards.length === 0 ? (
                  <HrmEmptyState
                    compact
                    icon="person_add"
                    title="No recent joiners found"
                    message="Recent joiners will appear here as employee join dates are captured in HRM."
                  />
                ) : (
                  <div className="space-y-3">
                    {analytics.workforce.cards.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 rounded-[1.2rem] border border-[#E4EBF2] bg-[#FBFCFD] px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar src={item.profilePictureUrl} name={item.name} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#243447]">{item.name}</p>
                            <p className="truncate text-xs text-[#6A7B8D]">
                              {item.employeeId} · {item.designation} · {item.department}
                            </p>
                          </div>
                        </div>
                        <div className="rounded-[1rem] border border-[#E1E9F0] bg-white px-3 py-2 text-right">
                          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8293A3]">Joined</div>
                          <div className="mt-1 text-sm font-bold text-[#314457]">{formatDate(item.joinedOn)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.17 }}
            >
              <SectionCard
                title="Attendance Watchlist"
                subtitle="Simple follow-up lists for repeated half day and absent patterns."
              >
                <div className="grid gap-5 xl:grid-cols-2">
                  <WatchTable
                    title="Half Day Pattern"
                    people={analytics.attendance.topHalfDayEmployees}
                    countKey="halfDayCount"
                    emptyTitle="No repeated half day pattern is visible for this month."
                  />
                  <WatchTable
                    title="Absence Pattern"
                    people={analytics.attendance.topAbsentEmployees}
                    countKey="absentCount"
                    emptyTitle="No repeated absence pattern is visible for this month."
                  />
                </div>
              </SectionCard>
            </motion.section>
          </>
        ) : null}
      </div>
    </div>
  );
}
