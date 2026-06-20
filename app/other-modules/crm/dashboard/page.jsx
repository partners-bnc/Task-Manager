"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCrm, MOCK_USERS } from '../context/CrmContext';
import MOCK_DATA from '../data/mockData.json';
import { 
  AreaChart, Area, 
  BarChart, Bar, 
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { Clock, CheckSquare, Activity as ActivityIcon } from 'lucide-react';

export default function DashboardPage() {
  const { currentUser, followups } = useCrm();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Strict RBAC: Only Admin & Manager
  if (!["admin", "manager"].includes(currentUser.role)) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-8 text-center transition-colors">
        <div className="max-w-md bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-red-200 dark:border-red-900/50">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">!</div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Executive Access Denied</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Your role (<span className="uppercase font-bold">{currentUser.role}</span>) does not have authorization to view macro-level analytical statistics.
          </p>
          <button 
            onClick={() => router.push('/other-modules/crm/leads')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition"
          >
            Return to Pipeline
          </button>
        </div>
      </div>
    );
  }

  // Derived Metrics
  const totalLeads = MOCK_DATA.leads.length;
  const activeCustomers = MOCK_DATA.leads.filter(l => l.status === "Won").length;
  const computedRevenue = MOCK_DATA.leads.filter(l => l.status === "Won").reduce((acc, l) => {
    return acc + (parseFloat(l.value.replace(/[^0-9.-]+/g,"")) || 0);
  }, 0);

  // Recharts: Funnel Data (Dynamic)
  const funnelData = [
    { name: 'New', count: MOCK_DATA.leads.filter(l => l.status === 'New').length, color: '#94a3b8' },
    { name: 'Contacted', count: MOCK_DATA.leads.filter(l => l.status === 'Contacted').length, color: '#3b82f6' },
    { name: 'Qualified', count: MOCK_DATA.leads.filter(l => l.status === 'Qualified').length, color: '#8b5cf6' },
    { name: 'Won', count: MOCK_DATA.leads.filter(l => l.status === 'Won').length, color: '#22c55e' }
  ];

  // Recharts: Mock Temporal Data
  const monthlyPerfData = [
    { name: 'Jan', revenue: 42000 }, { name: 'Feb', revenue: 58000 }, 
    { name: 'Mar', revenue: 39000 }, { name: 'Apr', revenue: 75000 }, 
    { name: 'May', revenue: 88000 }, { name: 'Jun', revenue: 145000 }
  ];

  const leadsTrendData = [
    { name: 'W1', leads: 12 }, { name: 'W2', leads: 24 }, 
    { name: 'W3', leads: 20 }, { name: 'W4', leads: 43 }, 
    { name: 'W5', leads: 58 }, { name: 'W6', leads: 91 }
  ];

  // Feeds
  const pendingTasks = MOCK_DATA.tasks.filter(t => t.status !== "Completed").slice(0, 4);
  const activeFollowups = followups?.filter(f => f.status !== "Completed").sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 4) || [];
  const recentActivities = [...MOCK_DATA.activities].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  
  const getAssigneeName = (id) => MOCK_USERS[Object.keys(MOCK_USERS).find(k => MOCK_USERS[k].id === id)]?.name || "Unknown";
  const getLeadName = (id) => MOCK_DATA.leads.find(l => l.id === id)?.company || "Unknown";

  if (!mounted) return null; // Avoid Hydration mismatch on Recharts

  return (
    <div className="p-8 text-slate-800 dark:text-slate-100 transition-colors duration-300 h-full overflow-y-auto">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold dark:text-white mb-2">Executive Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400">High-level insights across revenue, trends, and operations.</p>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 tracking-wide uppercase">Pipeline Density</h3>
          <p className="text-3xl font-bold text-slate-800 dark:text-white">{totalLeads}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 tracking-wide uppercase">Active Customers</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{activeCustomers}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1 tracking-wide uppercase">Realized Revenue</h3>
          <p className="text-3xl font-bold text-slate-800 dark:text-white">${computedRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Primary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Monthly Performance */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
          <h2 className="text-lg font-bold dark:text-white mb-6">Monthly Revenue Performance</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyPerfData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `$${value/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Pipeline Funnel */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
          <h2 className="text-lg font-bold dark:text-white mb-6">Lead Pipeline Phase</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={funnelData} margin={{ top: 0, right: 30, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 13, fontWeight: 600}} width={80} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={40}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Secondary Charts & Lists Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Leads Trend */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors flex flex-col">
          <h2 className="text-lg font-bold dark:text-white mb-6">Leads Generation Trend</h2>
          <div className="flex-1 h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={leadsTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Line type="monotone" dataKey="leads" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff'}} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Tasks -> Follow-ups & Reminders */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold dark:text-white flex items-center"><CheckSquare className="w-5 h-5 mr-2 text-amber-500" /> Follow-ups & Reminders</h2>
            <button onClick={() => router.push('/other-modules/crm/followups')} className="text-xs font-bold text-blue-500 hover:text-blue-600 uppercase tracking-widest">View All</button>
          </div>
          <div className="space-y-4">
            {activeFollowups.map(fwp => (
              <div key={fwp.id} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0 last:pb-0">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight mb-1">{fwp.title}</h4>
                  <p className="text-xs font-semibold text-slate-500 flex items-center uppercase tracking-wide">
                     {new Date(fwp.dueDate).toLocaleDateString()} • {getAssigneeName(fwp.assigneeId)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${fwp.status === 'Overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : fwp.status === 'New' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'}`}>
                    {fwp.status}
                  </span>
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${fwp.priority === 'High' ? 'text-red-600 border border-red-200' : 'text-slate-500 border border-slate-200'}`}>
                    {fwp.priority}
                  </span>
                </div>
              </div>
            ))}
            {activeFollowups.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No pending follow-ups.</p>
            )}
          </div>
        </div>

        {/* Feed - Recent Activities */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold dark:text-white flex items-center"><ActivityIcon className="w-5 h-5 mr-2 text-indigo-500" /> Operational Feed</h2>
            <button onClick={() => router.push('/other-modules/crm/activities')} className="text-xs font-bold text-blue-500 hover:text-blue-600 uppercase tracking-widest">Timeline</button>
          </div>
          <div className="space-y-4">
            {recentActivities.map(activity => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                     <span className="font-bold">{getAssigneeName(activity.assigneeId)}</span> logged a <span className="font-bold lowercase">{activity.type}</span> regarding <span className="font-bold text-blue-500">{getLeadName(activity.leadId)}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5"><Clock className="w-3 h-3 inline mr-1 -mt-0.5" />{new Date(activity.date).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
