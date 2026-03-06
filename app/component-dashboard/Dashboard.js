'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, YAxis } from 'recharts';
import { ArrowRight } from 'lucide-react';
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
  const { user, tasks, isAdminMode } = useData();
  const [dashboardDateTime, setDashboardDateTime] = useState(() => getDashboardDateTime());

  useEffect(() => {
    const updateDateTime = () => setDashboardDateTime(getDashboardDateTime());
    const intervalId = setInterval(updateDateTime, 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'Pending').length,
    inProgress: tasks.filter((t) => t.status === 'In Progress').length,
    completed: tasks.filter((t) => t.status === 'Completed').length,
  };

  const pieData = [
    { name: 'Pending', value: stats.pending, color: '#8b5cf6' },
    { name: 'In Progress', value: stats.inProgress, color: '#7F40EE' },
    { name: 'Completed', value: stats.completed, color: '#84cc16' },
  ];

  const barData = [
    { name: 'Low', count: tasks.filter((t) => t.priority === 'Low').length, fill: '#10b981' },
    { name: 'Medium', count: tasks.filter((t) => t.priority === 'Medium').length, fill: '#f59e0b' },
    { name: 'High', count: tasks.filter((t) => t.priority === 'High').length, fill: '#f43f5e' },
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
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'Pending':
        return 'bg-purple-100 text-purple-600';
      case 'In Progress':
        return 'bg-[#7F40EE]/10 text-[#7F40EE]';
      case 'Completed':
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const openTaskDetail = (taskId) => {
    const path = isAdminMode ? `/admin/tasks/${taskId}` : `/dashboard/tasks/${taskId}`;
    window.open(path, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="p-8">
      <div className="bg-white rounded-xl p-6 mb-8 shadow-sm">
        <h2 className="text-2xl font-bold text-black mb-6">{dashboardDateTime.greeting}! {user?.name}</h2>
        <p className="text-slate-500 mb-6">{dashboardDateTime.date}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-1 bg-[#7F40EE] h-8 rounded-full"></div>
            <div>
              <div className="text-2xl font-bold text-black">{stats.total}</div>
              <div className="text-slate-500 text-sm">Total Tasks</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-1 bg-purple-600 h-8 rounded-full"></div>
            <div>
              <div className="text-2xl font-bold text-black">{stats.pending}</div>
              <div className="text-slate-500 text-sm">Pending Tasks</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-1 bg-[#7F40EE] h-8 rounded-full"></div>
            <div>
              <div className="text-2xl font-bold text-black">{stats.inProgress}</div>
              <div className="text-slate-500 text-sm">In Progress</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-1 bg-green-600 h-8 rounded-full"></div>
            <div>
              <div className="text-2xl font-bold text-black">{stats.completed}</div>
              <div className="text-slate-500 text-sm">Completed Tasks</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Task Distribution</h3>
          <div className="h-64 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
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
                <span className="text-sm text-slate-600">{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Task Priority Levels</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barSize={60}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between px-8 text-sm text-slate-500 mt-2">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
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
