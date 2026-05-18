'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Clock3, Map as MapIcon, PieChart as PieChartIcon, Trophy, Users } from 'lucide-react';
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

type KpiSummary = {
  totalEmployees: number;
  activeEmployees: number;
  terminatedEmployees: number;
  attritionRate: number;
  averageTenure: number;
  averageAttendance: number;
  averageAge: number;
  averageSalary: number;
};

type PerformanceRow = {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  jobTitle: string;
  rating: number;
  attendancePercent: number;
  nonWorkingDays: number;
  salary: number;
  promotion: 'Yes' | 'No';
};

type ServiceRow = {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  jobTitle: string;
  serviceDuration: string;
  tenureYears: number;
};

type AnalyticsResponse = {
  success: boolean;
  recordsCount: number;
  filters: {
    month: string;
    start: string;
    end: string;
  };
  dashboard: {
    executiveSummary: KpiSummary;
    attritionByTenure: Array<{ tenure: string; terminated: number }>;
    attritionByDepartment: Array<{ department: string; terminated: number }>;
    genderDistribution: Array<{ name: string; value: number }>;
    attendanceTrend: Array<{
      label: string;
      present: number;
      absent: number;
      halfday: number;
      onLeave: number;
    }>;
    departmentComposition: Array<{ department: string; count: number; share: number }>;
    lifecycleSpread: Array<{ key: string; label: string; count: number; share: number }>;
    stateDistribution: Array<{ state: string; count: number }>;
    ticketStatusSummary: {
      total: number;
      open: number;
      inProgress: number;
      waiting: number;
      completed: number;
    };
    topPerformers: PerformanceRow[];
    serviceDurationTable: ServiceRow[];
  };
};

const CHART_COLORS = ['#9ec5ff', '#c7b9ff', '#b6e3ff', '#ddd4ff', '#8fb2f5', '#d9c8ff'];
const ATTENDANCE_SERIES = [
  { key: 'present', label: 'Present', color: '#8ecfa3' },
  { key: 'absent', label: 'Absent', color: '#9ebbf4' },
  { key: 'halfday', label: 'Half Day', color: '#e8d2a0' },
  { key: 'onLeave', label: 'On Leave', color: '#9fd7e4' },
] as const;

const INDIA_MAP_POINTS: Record<string, { x: number; y: number }> = {
  'Andaman and Nicobar Islands': { x: 299, y: 344 },
  'Andhra Pradesh': { x: 216, y: 258 },
  'Arunachal Pradesh': { x: 283, y: 76 },
  Assam: { x: 266, y: 102 },
  Bihar: { x: 219, y: 120 },
  Chandigarh: { x: 160, y: 82 },
  Chhattisgarh: { x: 201, y: 193 },
  'Dadra and Nagar Haveli and Daman and Diu': { x: 114, y: 177 },
  Delhi: { x: 170, y: 100 },
  Goa: { x: 118, y: 255 },
  Gujarat: { x: 98, y: 164 },
  Haryana: { x: 158, y: 99 },
  'Himachal Pradesh': { x: 169, y: 72 },
  'Jammu and Kashmir': { x: 145, y: 42 },
  Jharkhand: { x: 223, y: 149 },
  Karnataka: { x: 142, y: 268 },
  Kerala: { x: 146, y: 333 },
  Ladakh: { x: 182, y: 29 },
  Lakshadweep: { x: 84, y: 317 },
  'Madhya Pradesh': { x: 171, y: 170 },
  Maharashtra: { x: 141, y: 220 },
  Manipur: { x: 286, y: 126 },
  Meghalaya: { x: 264, y: 117 },
  Mizoram: { x: 272, y: 143 },
  Nagaland: { x: 288, y: 105 },
  Odisha: { x: 226, y: 189 },
  Puducherry: { x: 190, y: 319 },
  Punjab: { x: 145, y: 85 },
  Rajasthan: { x: 119, y: 118 },
  Sikkim: { x: 239, y: 102 },
  'Tamil Nadu': { x: 183, y: 331 },
  Telangana: { x: 196, y: 229 },
  Tripura: { x: 258, y: 136 },
  'Uttar Pradesh': { x: 194, y: 105 },
  Uttarakhand: { x: 186, y: 78 },
  'West Bengal': { x: 238, y: 150 },
};

const INDIA_DOT_MAP_PATH =
  'M146 22c10-5 26-6 39 0 14 6 22 17 20 29l-6 18 10 12 28 6 28 22-1 30 18 24-2 28-22 9-4 26-13 10 3 18-12 17-10 18-6 22-14 20-7 33-18 27 3 34-18 23 7 40-20 17-12 35-22 30-34-9-31-37-14-48 3-42-12-41-19-18-26-49-15-54 8-47 27-29 17-36 5-31 17-12 26 2c11 1 22-1 31-6z';

function formatMonthLabel(value: string) {
  if (!value) return 'Current Month';
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

function formatCompactNumber(value: number) {
  if (!Number.isFinite(value)) return '--';
  if (value >= 1000) {
    return new Intl.NumberFormat('en-IN', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat('en-IN').format(value);
}

function formatCurrencyCompact(value: number) {
  if (!Number.isFinite(value)) return '--';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return '--';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDecimal(value: number, digits = 1) {
  if (!Number.isFinite(value)) return '--';
  return value.toFixed(digits);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '--';
  return `${value.toFixed(1)}%`;
}

function formatAxisDateLabel(value: string) {
  const [day, month] = String(value || '').split(' ');
  return `${day} ${month || ''}`.trim();
}

function formatTenureAxisLabel(value: string) {
  if (!value) return value;
  return value.endsWith('+') ? `${value}y` : `${value}y`;
}

function Card({
  title,
  icon,
  children,
  right,
  className = '',
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[28px] border border-[#ddd3c6] bg-white p-5 shadow-[0_10px_30px_rgba(58,45,30,0.05)] ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-[1rem] font-medium text-[#5f5448]">{title}</h2>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function KpiTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  tone: 'cream' | 'blue' | 'purple';
}) {
  const [transform, setTransform] = useState('perspective(1400px) rotateX(0deg) rotateY(0deg) translateY(0px)');

  const toneMap = {
    cream: 'bg-[#fbf6ed]',
    blue: 'bg-[#eef5ff]',
    purple: 'bg-[#f4efff]',
  };

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = ((x / rect.width) - 0.5) * 12;
    const rotateX = (0.5 - (y / rect.height)) * 10;
    setTransform(`perspective(1400px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`);
  }

  function handleMouseLeave() {
    setTransform('perspective(1400px) rotateX(0deg) rotateY(0deg) translateY(0px)');
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-[20px] px-3.5 py-3.5 transition-transform duration-200 ease-out ${toneMap[tone]}`}
      style={{
        transform,
        transformStyle: 'preserve-3d',
        boxShadow:
          '0 20px 30px rgba(58,45,30,0.08), inset 0 1px 0 rgba(255,255,255,0.92), inset 0 -10px 18px rgba(214,190,155,0.12)',
      }}
    >
      <div className="grid grid-cols-[68px_minmax(0,1fr)] items-center gap-2.5">
        <div className="flex h-[60px] w-[60px] items-center justify-center">
          <span
            className="material-symbols-outlined text-[#d39d24]"
            style={{ fontSize: '44px', lineHeight: 1, fontVariationSettings: '"FILL" 0, "wght" 300, "GRAD" 0, "opsz" 48' }}
          >
            {icon}
          </span>
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[0.92rem] font-medium leading-none text-[#7b6f63]">{label}</p>
          <p className="mt-1 text-[1.28rem] font-headline font-semibold leading-none text-[#18120d]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ChartTooltip({
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
    <div className="rounded-2xl border border-[#e0d7ca] bg-white px-4 py-3 shadow-[0_12px_24px_rgba(58,45,30,0.08)]">
      {label ? <p className="mb-1 text-sm font-semibold text-[#5d5348]">{label}</p> : null}
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={`${item.name}-${item.value}`} className="flex items-center justify-between gap-5 text-xs">
            <span className="text-[#6e6459]">{item.name}</span>
            <span className="font-bold text-[#211a14]">{item.value ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionTable({
  title,
  icon,
  columns,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  columns: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card title="" right={null}>
      <div className="mb-4 flex items-center gap-2 text-[1rem] font-headline font-medium text-black">
        {icon}
        <span>{title}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="text-left text-[0.95rem] font-semibold text-[#7b6f63]">{columns}</tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </Card>
  );
}

function IndiaEmployeeMap({ data }: { data: Array<{ state: string; count: number }> }) {
  const maxCount = Math.max(...data.map((item) => item.count), 1);
  const plottedStates = data.filter((item) => INDIA_MAP_POINTS[item.state]);
  const listedStates = [...data].sort((left, right) => right.count - left.count || left.state.localeCompare(right.state));
  const mapDots = useMemo(() => {
    const dots: Array<{ x: number; y: number }> = [];
    for (let y = 18; y <= 385; y += 9.5) {
      for (let x = 58; x <= 292; x += 9.5) {
        const offsetX = Math.round(y / 19) % 2 ? 4.75 : 0;
        dots.push({ x: x + offsetX, y });
      }
    }
    return dots;
  }, []);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="mx-auto w-full max-w-[210px]">
        <svg viewBox="0 0 320 420" className="h-[300px] w-full" aria-label="India employee state distribution map" role="img">
            <defs>
              <filter id="stateDotGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <clipPath id="indiaDotClip">
                <path d={INDIA_DOT_MAP_PATH} />
              </clipPath>
            </defs>
            <g clipPath="url(#indiaDotClip)">
              {mapDots.map((dot) => (
                <circle key={`${dot.x}-${dot.y}`} cx={dot.x} cy={dot.y} r="2.55" fill="#d9d4cb" />
              ))}
            </g>
            <path d={INDIA_DOT_MAP_PATH} fill="none" stroke="#d9cdbf" strokeWidth="1.2" strokeLinejoin="round" opacity="0.6" />
            <path
              d="M235 364c11 8 23 24 28 40M248 383c7 4 15 13 18 24"
              fill="none"
              stroke="#d9cdbf"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.6"
            />
            {plottedStates.map((item) => {
              const point = INDIA_MAP_POINTS[item.state];
              const radius = 5 + (item.count / maxCount) * 8;
              const outerRadius = radius + 6;
              return (
                <g key={item.state} transform={`translate(${point.x}, ${point.y})`}>
                  <circle r={outerRadius + 4} fill="rgba(91, 142, 244, 0.10)" />
                  <circle r={outerRadius} fill="rgba(91, 142, 244, 0.16)" />
                  <circle r={radius} fill="#7ca4f8" fillOpacity={0.28} filter="url(#stateDotGlow)" />
                  <circle r={Math.max(3.8, radius * 0.44)} fill="#5b8ef4" stroke="#ffffff" strokeWidth="2" />
                </g>
              );
            })}
        </svg>
      </div>

      <div className="min-w-0">
        {listedStates.length === 0 ? (
          <div className="flex min-h-[220px] items-center justify-center text-sm text-[#8a7f74]">
            No state data available
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-[minmax(0,1fr)_64px] gap-2 border-b border-[#e9dece] px-1 pb-2 text-[0.88rem] font-semibold text-[#4f453b]">
              <span>State</span>
              <span className="text-right">Employees</span>
            </div>
            <div className="pt-1">
              {listedStates.map((item) => (
                <div
                  key={item.state}
                  className="grid grid-cols-[minmax(0,1fr)_64px] items-center gap-2 border-b border-[#f1e7d9] px-1 py-2 text-[0.88rem] last:border-b-0"
                >
                  <span className="truncate font-medium text-[#473d33]" title={item.state}>
                    {item.state}
                  </span>
                  <span className="text-right font-semibold text-[#1f1914]">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TicketingStatusCard({
  summary,
}: {
  summary?: {
    total: number;
    open: number;
    inProgress: number;
    waiting: number;
    completed: number;
  };
}) {
  const safeSummary = {
    total: summary?.total ?? 0,
    open: summary?.open ?? 0,
    inProgress: summary?.inProgress ?? 0,
    waiting: summary?.waiting ?? 0,
    completed: summary?.completed ?? 0,
  };

  const rows = [
    { label: 'Open', value: safeSummary.open, color: '#8fb5ff' },
    { label: 'In Progress', value: safeSummary.inProgress, color: '#c7b9ff' },
    { label: 'Waiting', value: safeSummary.waiting, color: '#e8d2a0' },
    { label: 'Completed', value: safeSummary.completed, color: '#8ecfa3' },
  ];

  return (
    <Card title="Ticketing Status" icon={<BarChart3 className="h-4 w-4 text-[#8fb5ff]" />} className="h-full">
      <div className="space-y-4">
        <div className="rounded-[20px] bg-[#faf6f0] px-4 py-4">
          <p className="text-[0.8rem] font-medium uppercase tracking-[0.08em] text-[#8a7f74]">Total Tickets</p>
          <p className="mt-2 text-[2rem] font-headline font-semibold leading-none text-[#1f1914]">{safeSummary.total}</p>
        </div>
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 rounded-[18px] border border-[#ece2d6] px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />
                <span className="text-sm font-medium text-[#4f453b]">{row.label}</span>
              </div>
              <span className="text-lg font-semibold text-[#1f1914]">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default function EmployeeAnalytics() {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAllServiceRows, setShowAllServiceRows] = useState(false);

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

  const summary = analytics?.dashboard.executiveSummary;
  const kpis = summary
    ? [
        { label: 'Total Employees', value: formatCompactNumber(summary.totalEmployees), icon: 'groups', tone: 'cream' as const },
        { label: 'Active Employees', value: formatCompactNumber(summary.activeEmployees), icon: 'person_check', tone: 'blue' as const },
        { label: 'Terminated', value: formatCompactNumber(summary.terminatedEmployees), icon: 'person_off', tone: 'cream' as const },
        { label: 'Attrition Rate', value: formatPercent(summary.attritionRate), icon: 'trending_down', tone: 'cream' as const },
        { label: 'Average Tenure', value: formatDecimal(summary.averageTenure, 2), icon: 'schedule', tone: 'cream' as const },
        { label: 'Average Attendance', value: formatPercent(summary.averageAttendance), icon: 'calendar_month', tone: 'blue' as const },
        { label: 'Average Age', value: formatDecimal(summary.averageAge, 2), icon: 'cake', tone: 'cream' as const },
        { label: 'Average Salary', value: formatCurrencyCompact(summary.averageSalary), icon: 'payments', tone: 'purple' as const },
      ]
    : [];

  const topPerformers = useMemo(() => {
    return [...(analytics?.dashboard.topPerformers || [])]
      .sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        if (b.attendancePercent !== a.attendancePercent) return b.attendancePercent - a.attendancePercent;
        return a.nonWorkingDays - b.nonWorkingDays;
      })
      .slice(0, 10);
  }, [analytics?.dashboard.topPerformers]);

  const serviceDurationRows = analytics?.dashboard.serviceDurationTable || [];
  const visibleServiceDurationRows = showAllServiceRows ? serviceDurationRows : serviceDurationRows.slice(0, 10);

  return (
    <div className="min-h-screen bg-white px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-[1520px] space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
        >
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100/90 text-violet-700 shadow-sm">
                <span className="material-symbols-outlined text-[22px]">monitoring</span>
              </div>
              <h1 className="text-[1.95rem] font-headline font-semibold tracking-tight text-[#2a2119]">HR Dashboard</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#dde9d7] px-4 py-2 text-[#26934d]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#26934d]" />
              <span className="text-[1.05rem] font-semibold">Live Data</span>
            </div>
            <div className="text-[1.05rem] text-[#7b6f63]">{new Intl.NumberFormat('en-IN').format(analytics?.recordsCount || 0)} records</div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="rounded-full border border-[#d9cfc3] bg-white px-4 py-2 text-sm font-medium text-[#2a221a] outline-none"
              aria-label="Select analytics month"
            />
          </div>
        </motion.section>

        {loading ? (
          <LoadingPanel
            title="Loading HR analytics"
            message="Preparing the redesigned dashboard for the selected month."
          />
        ) : error ? (
          <div className="rounded-[24px] border border-[#e5c7cb] bg-[#fff8f8] px-5 py-4 text-sm font-medium text-[#8c4b58]">
            {error}
          </div>
        ) : analytics ? (
          <>
            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.04 }}
              className="mx-auto grid max-w-[1280px] gap-3 md:grid-cols-2 xl:grid-cols-4"
            >
              {kpis.map((item, index) => (
                <KpiTile key={item.label} icon={item.icon} label={item.label} value={item.value} tone={index % 3 === 1 ? 'blue' : index === 7 ? 'purple' : 'cream'} />
              ))}
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.08 }}
              className="grid gap-5 xl:grid-cols-3"
            >
              <Card title="Attrition by Tenure" icon={<BarChart3 className="h-4 w-4 text-[#8fb5ff]" />}>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.dashboard.attritionByTenure} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid stroke="#ddd2c5" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="tenure" tickFormatter={formatTenureAxisLabel} tick={{ fill: '#75695e', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tickCount={5} tick={{ fill: '#75695e', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="terminated" name="Terminated Employees" radius={[4, 4, 0, 0]} fill="#8fb5ff" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Attrition by Department" icon={<BarChart3 className="h-4 w-4 text-[#bca9ff]" />}>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.dashboard.attritionByDepartment} layout="vertical" margin={{ top: 6, right: 10, left: 20, bottom: 0 }}>
                      <CartesianGrid stroke="#ddd2c5" strokeDasharray="4 4" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fill: '#75695e', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="department" type="category" width={92} tick={{ fill: '#75695e', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="terminated" name="Terminated Employees" radius={[0, 4, 4, 0]} fill="#bca9ff" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Gender Distribution" icon={<PieChartIcon className="h-4 w-4 text-[#8fb2f5]" />}>
                <div className="flex flex-col items-center">
                  <div className="h-[280px] w-full max-w-[360px]">
                    {analytics.dashboard.genderDistribution.length === 0 ? (
                      <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-[#e5ddd0] text-sm text-[#8a7f74]">
                        No gender data available
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={analytics.dashboard.genderDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} paddingAngle={2} stroke="#ffffff" strokeWidth={2}>
                            {analytics.dashboard.genderDistribution.map((entry, index) => (
                              <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    {analytics.dashboard.genderDistribution.map((item, index) => (
                      <div key={item.name} className="inline-flex items-center gap-2 rounded-full border border-[#e0d8cc] bg-[#faf6f0] px-4 py-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                        <span className="text-sm font-medium text-[#5e5348]">{item.name}</span>
                        <span className="text-sm font-bold text-[#1f1914]">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.12 }}
            >
              <Card
                title="Attendance Trend"
                icon={<BarChart3 className="h-4 w-4 text-[#9fd7e4]" />}
                right={
                  <div className="flex flex-wrap justify-end gap-2">
                    {ATTENDANCE_SERIES.map((item) => (
                      <div key={item.key} className="inline-flex items-center gap-2 rounded-full border border-[#e0d8cc] bg-white px-3 py-1.5 text-sm font-medium text-[#5e5348]">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.label}
                      </div>
                    ))}
                  </div>
                }
              >
                <div className="h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.dashboard.attendanceTrend} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="presentFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8ecfa3" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#8ecfa3" stopOpacity={0.03} />
                        </linearGradient>
                        <linearGradient id="absentFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9ebbf4" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="#9ebbf4" stopOpacity={0.03} />
                        </linearGradient>
                        <linearGradient id="halfdayFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e8d2a0" stopOpacity={0.24} />
                          <stop offset="95%" stopColor="#e8d2a0" stopOpacity={0.03} />
                        </linearGradient>
                        <linearGradient id="onLeaveFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9fd7e4" stopOpacity={0.24} />
                          <stop offset="95%" stopColor="#9fd7e4" stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#ddd2c5" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="label" tickFormatter={formatAxisDateLabel} tick={{ fill: '#75695e', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: '#75695e', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      {ATTENDANCE_SERIES.map((series) => (
                        <Area
                          key={series.key}
                          type="monotone"
                          dataKey={series.key}
                          name={series.label}
                          stroke={series.color}
                          fill={
                            series.key === 'present'
                              ? 'url(#presentFill)'
                              : series.key === 'absent'
                                ? 'url(#absentFill)'
                                : series.key === 'halfday'
                                  ? 'url(#halfdayFill)'
                                  : 'url(#onLeaveFill)'
                          }
                          fillOpacity={1}
                          strokeWidth={2.6}
                          dot={{ r: 0 }}
                          activeDot={{ r: 5, fill: series.color, stroke: '#ffffff', strokeWidth: 2 }}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.16 }}
              className="grid gap-5 xl:grid-cols-2"
            >
              <Card title="Department Composition" icon={<Users className="h-4 w-4 text-[#8fb2f5]" />}>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.dashboard.departmentComposition} margin={{ top: 8, right: 10, left: -16, bottom: 0 }}>
                      <CartesianGrid stroke="#ddd2c5" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="department" tick={{ fill: '#75695e', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: '#75695e', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="count" name="Employees" radius={[4, 4, 0, 0]}>
                        {analytics.dashboard.departmentComposition.map((entry, index) => (
                          <Cell key={`${entry.department}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Lifecycle Spread" icon={<PieChartIcon className="h-4 w-4 text-[#c7b9ff]" />}>
                <div className="grid items-center gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={analytics.dashboard.lifecycleSpread} dataKey="count" nameKey="label" innerRadius={68} outerRadius={104} paddingAngle={2} stroke="#ffffff" strokeWidth={2}>
                          {analytics.dashboard.lifecycleSpread.map((entry, index) => (
                            <Cell key={`${entry.key}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3">
                    {analytics.dashboard.lifecycleSpread.map((item, index) => (
                      <div key={item.key} className="rounded-[18px] bg-[#faf6f0] px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                            <span className="text-sm font-medium text-[#5e5348]">{item.label}</span>
                          </div>
                          <span className="text-sm font-bold text-[#1f1914]">{item.count}</span>
                        </div>
                        <p className="mt-2 text-xs font-medium text-[#8a7f74]">{item.share}% of workforce</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.2 }}
              className="grid gap-5 xl:grid-cols-[1.55fr_1fr]"
            >
              <Card title="Employees by State" icon={<MapIcon className="h-4 w-4 text-[#8fb2f5]" />}>
                <IndiaEmployeeMap data={analytics.dashboard.stateDistribution} />
              </Card>
              <TicketingStatusCard summary={analytics.dashboard.ticketStatusSummary} />
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.22 }}
            >
              <SectionTable
                title="Top Performing Employees"
                icon={<Trophy className="h-6 w-6 text-yellow-500" />}
                columns={
                  <>
                    <th className="w-12 border-b border-[#e4d8ca] px-5 py-4">#</th>
                    <th className="border-b border-[#e4d8ca] px-5 py-4">Employee ID</th>
                    <th className="border-b border-[#e4d8ca] px-5 py-4">Name</th>
                    <th className="border-b border-[#e4d8ca] px-5 py-4">Department</th>
                    <th className="border-b border-[#e4d8ca] px-5 py-4">Job Title</th>
                    <th className="border-b border-[#e4d8ca] px-5 py-4 text-center">Rating</th>
                    <th className="border-b border-[#e4d8ca] px-5 py-4 text-center">Attendance %</th>
                    <th className="border-b border-[#e4d8ca] px-5 py-4 text-center">Non-Working Days</th>
                    <th className="border-b border-[#e4d8ca] px-5 py-4 text-right">Salary</th>
                    <th className="border-b border-[#e4d8ca] px-5 py-4 text-center">Promotion</th>
                  </>
                }
              >
                {topPerformers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-0 py-2">
                      <HrmEmptyState title="No performance records yet" message="Employee ratings will appear here once task reviews start coming in." />
                    </td>
                  </tr>
                ) : (
                  topPerformers.map((row, index) => (
                    <tr key={row.id} className="text-[0.95rem] text-[#2a221a]">
                      <td className="border-b border-[#efe4d7] px-5 py-4 font-semibold">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}</td>
                      <td className="border-b border-[#efe4d7] px-5 py-4 font-mono text-sm">{row.employeeId}</td>
                      <td className="border-b border-[#efe4d7] px-5 py-4 font-semibold">{row.name}</td>
                      <td className="border-b border-[#efe4d7] px-5 py-4">{row.department}</td>
                      <td className="border-b border-[#efe4d7] px-5 py-4">{row.jobTitle}</td>
                      <td className="border-b border-[#efe4d7] px-5 py-4 text-center">
                        <span className="font-semibold text-[#d39d24]">{row.rating.toFixed(1)}</span>
                      </td>
                      <td className="border-b border-[#efe4d7] px-5 py-4 text-center">{row.attendancePercent.toFixed(1)}%</td>
                      <td className="border-b border-[#efe4d7] px-5 py-4 text-center">{row.nonWorkingDays}</td>
                      <td className="border-b border-[#efe4d7] px-5 py-4 text-right font-medium">{formatCurrency(row.salary)}</td>
                      <td className="border-b border-[#efe4d7] px-5 py-4 text-center">
                        <span
                          className={`inline-flex min-w-[70px] justify-center rounded-full px-3 py-1 text-xs font-semibold ${
                            row.promotion === 'Yes' ? 'bg-[#f5be34] text-[#22170a]' : 'bg-[#e8e3dc] text-[#5f5348]'
                          }`}
                        >
                          {row.promotion}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </SectionTable>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.26 }}
            >
              <Card title="" right={null}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[1rem] font-headline font-medium text-black">
                    <Clock3 className="h-6 w-6 text-[#8fb2f5]" />
                    <span>Employee Service Duration</span>
                  </div>
                  {serviceDurationRows.length > 10 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllServiceRows((current) => !current)}
                      className="text-sm font-semibold text-black underline underline-offset-4 transition hover:opacity-70"
                    >
                      {showAllServiceRows ? 'View less' : 'View more'}
                    </button>
                  ) : null}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="text-left text-[0.95rem] font-semibold text-[#7b6f63]">
                        <th className="w-12 border-b border-[#e4d8ca] px-5 py-4">#</th>
                        <th className="border-b border-[#e4d8ca] px-5 py-4">Employee ID</th>
                        <th className="border-b border-[#e4d8ca] px-5 py-4">Name</th>
                        <th className="border-b border-[#e4d8ca] px-5 py-4">Department</th>
                        <th className="w-[220px] border-b border-[#e4d8ca] px-5 py-4">Designation</th>
                        <th className="border-b border-[#e4d8ca] px-5 py-4 text-center">Service Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleServiceDurationRows.map((row, index) => (
                        <tr key={row.id} className="text-[0.95rem] text-[#2a221a]">
                          <td className="border-b border-[#efe4d7] px-5 py-4 font-semibold">{index + 1}</td>
                          <td className="border-b border-[#efe4d7] px-5 py-4 font-mono text-sm">{row.employeeId}</td>
                          <td className="border-b border-[#efe4d7] px-5 py-4 font-semibold">{row.name}</td>
                          <td className="border-b border-[#efe4d7] px-5 py-4">{row.department}</td>
                          <td className="border-b border-[#efe4d7] px-5 py-4">
                            <span className="block max-w-[220px] truncate" title={row.jobTitle || '--'}>
                              {row.jobTitle || '--'}
                            </span>
                          </td>
                          <td className="border-b border-[#efe4d7] px-5 py-4 text-center">{row.serviceDuration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.section>
          </>
        ) : (
          <HrmEmptyState title="No analytics available" message="Try a different month after employee records and attendance entries are available." />
        )}
      </div>
    </div>
  );
}
