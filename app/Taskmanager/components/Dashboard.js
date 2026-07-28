'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, YAxis, LabelList, LineChart, Line, CartesianGrid } from 'recharts';
import { ArrowRight, BriefcaseBusiness, Clock3, ChartNoAxesColumnIncreasing, BadgeCheck } from 'lucide-react';
import { useData } from './DataContext';

const IST_TIMEZONE = 'Asia/Kolkata';

const getOrdinalSuffix = (day) => {
  if (day > 3 && day < 21) return 'th';

  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
};

const getDashboardDateTime = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now);

  const getPart = (type) => parts.find((part) => part.type === type)?.value || '';
  const hour = Number(getPart('hour'));
  const day = Number(getPart('day'));

  let greeting = 'Good Evening';
  if (hour >= 5 && hour < 12) greeting = 'Good Morning';
  if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';

  return {
    greeting,
    date: `${getPart('weekday')} ${day}${getOrdinalSuffix(day)} ${getPart('month')} ${getPart('year')}`,
  };
};

export default function Dashboard({ onNavigate }) {
  const router = useRouter();
  const { user, tasks, isAdminMode } = useData();
  const [dashboardDateTime, setDashboardDateTime] = useState(() => getDashboardDateTime());
  const [horizon, setHorizon] = useState('day');

  const getLineChartData = () => {
    const now = new Date();

    if (horizon === 'day') {
      const days = [];
      for (let i = 14; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        days.push({ label, key: d.toDateString(), count: 0 });
      }

      tasks.forEach(task => {
        if (!task.createdAt) return;
        const taskDate = new Date(task.createdAt).toDateString();
        const found = days.find(day => day.key === taskDate);
        if (found) {
          found.count += 1;
        }
      });
      return days;
    } else if (horizon === 'week') {
      const weeks = [];
      for (let i = 7; i >= 0; i--) {
        const startOfWeek = new Date();
        startOfWeek.setDate(now.getDate() - i * 7 - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        const label = `${startOfWeek.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${endOfWeek.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
        weeks.push({ label, start: startOfWeek.getTime(), end: endOfWeek.getTime(), count: 0 });
      }

      tasks.forEach(task => {
        if (!task.createdAt) return;
        const taskTime = new Date(task.createdAt).getTime();
        const found = weeks.find(week => taskTime >= week.start && taskTime <= week.end + 86399999);
        if (found) {
          found.count += 1;
        }
      });
      return weeks;
    } else {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString('en-IN', { month: 'short' });
        months.push({ label, year: d.getFullYear(), month: d.getMonth(), count: 0 });
      }

      tasks.forEach(task => {
        if (!task.createdAt) return;
        const taskDate = new Date(task.createdAt);
        const found = months.find(m => m.year === taskDate.getFullYear() && m.month === taskDate.getMonth());
        if (found) {
          found.count += 1;
        }
      });
      return months;
    }
  };

  const lineChartData = getLineChartData();
  const [ticketStats, setTicketStats] = useState({
    open: 0,
    late: 0,
    breached: 0,
    avgResolutionHours: 0,
  });

  useEffect(() => {
    const updateDateTime = () => setDashboardDateTime(getDashboardDateTime());
    const intervalId = setInterval(updateDateTime, 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadTicketStats() {
      try {
        const response = await fetch('/Taskmanager/api/tickets', { method: 'GET', credentials: 'include', cache: 'no-store' });
        const result = await response.json();
        if (!response.ok || !active) return;

        const openTickets = [...(result.myTickets || []), ...(result.assignedTickets || []), ...(result.adminOpenTickets || [])];
        const dedupedOpen = Array.from(new Map(openTickets.map((ticket) => [ticket.id, ticket])).values());
        const closedTickets = Array.isArray(result.closedTickets) ? result.closedTickets : [];
        const durations = closedTickets
          .map((ticket) => {
            const start = ticket?.createdAt ? new Date(ticket.createdAt).getTime() : NaN;
            const end = ticket?.closedAt || ticket?.resolvedAt ? new Date(ticket.closedAt || ticket.resolvedAt).getTime() : NaN;
            if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
            return (end - start) / (1000 * 60 * 60);
          })
          .filter((value) => typeof value === 'number');
        const avgResolutionHours = durations.length > 0 ? Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10 : 0;

        setTicketStats({
          open: dedupedOpen.length,
          late: dedupedOpen.filter((ticket) => ticket.isLate && !ticket.isSlaBreached).length,
          breached: dedupedOpen.filter((ticket) => ticket.isSlaBreached).length,
          avgResolutionHours,
        });
      } catch {
        if (active) {
          setTicketStats({
            open: 0,
            late: 0,
            breached: 0,
            avgResolutionHours: 0,
          });
        }
      }
    }

    loadTicketStats();
    return () => {
      active = false;
    };
  }, []);

  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'Pending').length,
    inProgress: tasks.filter((t) => t.status === 'In Progress').length,
    completed: tasks.filter((t) => t.status === 'Completed').length,
  };

  const pieData = [
    { name: 'Pending', value: stats.pending, color: '#93c5fd' },
    { name: 'In Progress', value: stats.inProgress, color: '#3170c5' },
    { name: 'Completed', value: stats.completed, color: '#1e3a8a' },
  ];

  const barData = [
    { name: 'Low', count: tasks.filter((t) => t.priority === 'Low').length, fill: '#93c5fd' },
    { name: 'Medium', count: tasks.filter((t) => t.priority === 'Medium').length, fill: '#3170c5' },
    { name: 'High', count: tasks.filter((t) => t.priority === 'High').length, fill: '#1e3a8a' },
    { name: 'Urgent', count: tasks.filter((t) => t.priority === 'Urgent').length, fill: '#0f172a' },
  ];

  const kpiCards = [
    { label: 'Total Tasks', value: stats.total, icon: BriefcaseBusiness },
    { label: 'Pending Tasks', value: stats.pending, icon: Clock3 },
    { label: 'In Progress', value: stats.inProgress, icon: ChartNoAxesColumnIncreasing },
    { label: 'Completed Tasks', value: stats.completed, icon: BadgeCheck },
    { label: 'Open Tickets', value: ticketStats.open, icon: BriefcaseBusiness },
    { label: 'Late Tickets', value: ticketStats.late, icon: Clock3 },
    { label: 'Breached SLA', value: ticketStats.breached, icon: ChartNoAxesColumnIncreasing },
    { label: 'Avg Resolve Hrs', value: ticketStats.avgResolutionHours, icon: BadgeCheck },
  ];

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 5);

  const getPriorityColor = (p) => {
    switch (p) {
      case 'Low':
        return 'bg-green-100 text-green-600';
      case 'Medium':
        return 'bg-orange-100 text-orange-600';
      case 'High':
        return 'bg-red-100 text-red-600';
      case 'Urgent':
        return 'bg-purple-100 text-purple-700 font-semibold';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'Pending':
        return 'bg-[#d7e7f9] text-[#2558a2]';
      case 'In Progress':
        return 'bg-[#3170c5]/10 text-[#3170c5]';
      case 'Completed':
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const openTaskDetail = (taskId) => {
    const path = isAdminMode ? `/Taskmanager/admin/tasks/${taskId}` : `/Taskmanager/dashboard/tasks/${taskId}`;
    router.push(path);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-xl p-6 mb-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-black mb-2">{dashboardDateTime.greeting}! {user?.name}</h2>
            <p className="text-slate-500">Your task dashboard overview</p>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Today</div>
            <p className="mt-1 text-slate-600">{dashboardDateTime.date}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 justify-items-center">
          {kpiCards.map((item) => (
            <div key={item.label} className="w-full max-w-[250px] rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3 shadow-xs transition-all duration-200 hover:shadow-md hover:-translate-y-1 hover:border-[#3170c5]/30 hover:bg-white group cursor-default">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-9 w-9 items-center justify-center text-slate-500 group-hover:text-[#3170c5] transition-colors shrink-0">
                  <item.icon size={18} strokeWidth={2} />
                </div>
                <div className="h-8 w-px bg-slate-200 group-hover:bg-[#3170c5]/20 transition-colors shrink-0"></div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-xs font-medium text-slate-500 truncate">{item.label}</div>
                  <div className="mt-0.5 text-xl font-bold tracking-tight text-slate-800">{item.value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 mb-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Task Creation Trend</h3>
            <p className="text-xs text-slate-500">Track task addition counts over time</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
            {['day', 'week', 'month'].map((opt) => (
              <button
                key={opt}
                onClick={() => setHorizon(opt)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${
                  horizon === opt
                    ? 'bg-white text-[#3170c5] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={lineChartData}
              margin={{
                top: 20,
                left: 10,
                right: 10,
                bottom: 5,
              }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                stroke="#64748b"
                fontSize={11}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                stroke="#64748b"
                fontSize={11}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.75rem',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
              />
              <Line
                dataKey="count"
                name="Tasks Added"
                type="monotone"
                stroke="#3170c5"
                strokeWidth={3}
                activeDot={{ r: 6 }}
                dot={{ stroke: '#3170c5', strokeWidth: 2, fill: '#fff', r: 4 }}
              >
                <LabelList
                  position="top"
                  offset={10}
                  fill="#475569"
                  fontSize={10}
                  fontWeight="600"
                />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Task Distribution</h3>
          <div className="h-72 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={pieData} 
                  innerRadius={68} 
                  outerRadius={92} 
                  paddingAngle={5} 
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                <span className="text-sm text-slate-600 font-medium">{d.name}: <span className="text-slate-800 font-semibold">{d.value}</span></span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Task Priority Levels</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart accessibilityLayer data={barData} barSize={60} margin={{ top: 20, right: 10, left: 0, bottom: 18 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={10} stroke="#64748b" fontSize={11} />
                <YAxis hide />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="count" radius={8}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="count" position="top" offset={12} fill="#475569" fontSize={12} fontWeight="600" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-slate-800">Recent Tasks</h3>
          <button
            onClick={() => onNavigate('tasks')}
            className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
          >
            See All <ArrowRight size={16} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-500 border-b border-gray-100">
                <th className="pb-3 pl-2">Name</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Priority</th>
                <th className="pb-3">Created On</th>
              </tr>
            </thead>
            <tbody>
              {recentTasks.map((task) => (
                <tr
                  key={task.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openTaskDetail(task.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openTaskDetail(task.id);
                    }
                  }}
                  className="border-b border-gray-50 last:border-none hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="py-4 pl-2 font-medium text-slate-800">{task.title}</td>
                  <td className="py-4">
                    <span className={`px-3 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="py-4">
                    <span className={`px-3 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="py-4 text-sm text-slate-500">{task.startDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
