"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCrm } from '../context/CrmContext';
import { 
  AreaChart, Area, 
  BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  Clock, Calendar, Briefcase, Globe, Activity as ActivityIcon, 
  Mail, RefreshCw, Layers, Award, CheckCircle
} from 'lucide-react';

export default function DashboardPage() {
  const { currentUser } = useCrm();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/other-modules/crm/api/dashboard');
      if (response.ok) {
        const json = await response.json();
        setData(json);
      }
    } catch (err) {
      console.error("Error loading dashboard metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchDashboardData();
  }, []);

  if (!mounted) return null; // Avoid Hydration mismatch on Recharts

  // Strict RBAC: Only Admin & Manager
  if (!["admin", "manager"].includes(currentUser?.role)) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-8 text-center transition-colors">
        <div className="max-w-md bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-red-200 dark:border-red-900/50">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-medium">!</div>
          <h1 className="text-2xl font-medium text-slate-800 dark:text-white mb-2">Executive Access Denied</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6 font-normal">
            Your role (<span className="uppercase font-semibold">{currentUser?.role}</span>) does not have authorization to view macro-level analytical statistics.
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

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-450">Assembling executive analytics...</span>
        </div>
      </div>
    );
  }

  // Fallbacks in case tables are empty
  const totalLeads = data?.totalLeads || 0;
  const campaignsMetrics = data?.campaignsMetrics || { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 };
  const experienceMetrics = data?.experienceMetrics || { topCompanies: [], avgDuration: 0, totalEntries: 0 };
  const educationMetrics = data?.educationMetrics || { topInstitutions: [], topDegrees: [], totalEntries: 0 };
  const leadsTrend = data?.leadsTrend || [];
  const recentActivities = data?.recentActivities || [];

  // Funnel Data parsing
  const leadsByStatus = data?.leadsByStatus || {};
  const funnelData = [
    { name: 'New', count: leadsByStatus['New'] || 0, color: '#94a3b8' },
    { name: 'Contacted', count: leadsByStatus['Contacted'] || 0, color: '#3b82f6' },
    { name: 'Qualified', count: leadsByStatus['Qualified'] || 0, color: '#8b5cf6' },
    { name: 'Converted', count: leadsByStatus['Converted'] || 0, color: '#10b981' }
  ];

  // Campaign rates
  const deliveryRate = campaignsMetrics.sent > 0 ? ((campaignsMetrics.delivered / campaignsMetrics.sent) * 100).toFixed(0) : 0;
  const openRate = campaignsMetrics.delivered > 0 ? ((campaignsMetrics.opened / campaignsMetrics.delivered) * 100).toFixed(0) : 0;
  const clickRate = campaignsMetrics.opened > 0 ? ((campaignsMetrics.clicked / campaignsMetrics.opened) * 100).toFixed(0) : 0;

  // Followups rates
  const followupsByStatus = data?.followupsByStatus || {};
  const completedFollowups = followupsByStatus['Completed'] || 0;
  const scheduledFollowups = followupsByStatus['Scheduled'] || 0;
  const totalFollowupsCount = completedFollowups + scheduledFollowups;
  const followupsSuccessRate = totalFollowupsCount > 0 ? ((completedFollowups / totalFollowupsCount) * 100).toFixed(0) : 0;

  const formatDateValue = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="p-8 text-slate-800 dark:text-slate-200 transition-colors duration-300 h-full overflow-y-auto bg-slate-50/30 dark:bg-slate-900/10">
      
      {/* Header bar */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-slate-900 dark:text-white mb-2">Executive Dashboard</h1>
          <p className="text-sm font-normal text-slate-500 dark:text-slate-400">Macro analytical insights compiled from live pipelines, campaigns, and candidates backgrounds.</p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-xs font-medium transition shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Stats
        </button>
      </div>

      {/* KPI Cards row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Card 1: Pipeline Density */}
        <div className="bg-white dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-150 dark:border-slate-800/60 shadow-sm flex flex-col justify-between h-[150px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pipeline Density</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-medium tracking-tight text-slate-900 dark:text-white">{totalLeads}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">Active lead entities tracked</p>
          </div>
        </div>

        {/* Card 2: Campaign Reach */}
        <div className="bg-white dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-150 dark:border-slate-800/60 shadow-sm flex flex-col justify-between h-[150px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Campaign Outreach</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-medium tracking-tight text-slate-900 dark:text-white">
              {campaignsMetrics.sent.toLocaleString()}
            </div>
            <div className="flex gap-2 mt-1 text-xs font-normal text-slate-500 dark:text-slate-400">
              <span>{openRate}% Open</span>
              <span>•</span>
              <span>{clickRate}% Click</span>
            </div>
          </div>
        </div>

        {/* Card 3: Followups completed */}
        <div className="bg-white dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-150 dark:border-slate-800/60 shadow-sm flex flex-col justify-between h-[150px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Outreach Success</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-medium tracking-tight text-slate-900 dark:text-white">
              {followupsSuccessRate}%
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">
              {completedFollowups} of {totalFollowupsCount} interactions met
            </p>
          </div>
        </div>

        {/* Card 4: Background Profiling Coverage */}
        <div className="bg-white dark:bg-slate-800/80 p-6 rounded-2xl border border-slate-150 dark:border-slate-800/60 shadow-sm flex flex-col justify-between h-[150px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Profile Coverage</span>
            <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-medium tracking-tight text-slate-900 dark:text-white">
              {experienceMetrics.totalEntries + educationMetrics.totalEntries}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">
              Relational history records linked
            </p>
          </div>
        </div>

      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Weekly Ingestion Trend */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800/85 p-6 rounded-2xl border border-slate-150 dark:border-slate-800/60 shadow-sm">
          <div className="mb-6">
            <h2 className="text-base font-medium text-slate-900 dark:text-white">Lead Ingestion Trend</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">Weekly compile of new lead creations over the last 6 cycles.</p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={leadsTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#475569" opacity={0.15} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 400}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 400}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value) => [value, 'New Leads']}
                />
                <Area type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Pipeline Phase Funnel */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-800/85 p-6 rounded-2xl border border-slate-150 dark:border-slate-800/60 shadow-sm">
          <div className="mb-6">
            <h2 className="text-base font-medium text-slate-900 dark:text-white">Pipeline Phase Funnel</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">Density distribution by current status.</p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={funnelData} margin={{ top: 0, right: 20, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#475569" opacity={0.15} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 505}} width={90} />
                <Tooltip 
                  cursor={{fill: 'transparent'}} 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }} 
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={30}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Relational Candidate Profiles Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Career Profile Insights */}
        <div className="bg-white dark:bg-slate-800/85 p-6 rounded-2xl border border-slate-150 dark:border-slate-800/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h2 className="text-base font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-500" /> Career Profile Insights
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">Aggregated from experiences linked to candidates records.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Top Past Companies</h3>
                <div className="space-y-2">
                  {experienceMetrics.topCompanies.map((c, i) => (
                    <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-750/30 last:border-0">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{c.name}</span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-650 dark:text-blue-400">
                        {c.count} leads
                      </span>
                    </div>
                  ))}
                  {experienceMetrics.topCompanies.length === 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-455 py-2">No work experiences recorded in the database yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-150 dark:border-slate-750/50 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Average Tenure</span>
            <span className="text-base font-medium text-slate-900 dark:text-white">{experienceMetrics.avgDuration} years</span>
          </div>
        </div>

        {/* Academic Profile Insights */}
        <div className="bg-white dark:bg-slate-800/85 p-6 rounded-2xl border border-slate-150 dark:border-slate-800/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h2 className="text-base font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-500" /> Academic Profile Insights
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">Aggregated from education histories linked to candidates.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Top Universities / Schools</h3>
                <div className="space-y-2">
                  {educationMetrics.topInstitutions.map((inst, i) => (
                    <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-750/30 last:border-0">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{inst.name}</span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-450">
                        {inst.count} grads
                      </span>
                    </div>
                  ))}
                  {educationMetrics.topInstitutions.length === 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-455 py-2">No educational qualifications recorded in the database yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-150 dark:border-slate-750/50 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Education Profiles</span>
            <span className="text-base font-medium text-slate-900 dark:text-white">{educationMetrics.totalEntries} entries</span>
          </div>
        </div>

      </div>

      {/* Campaigns and Operational Feed row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Email Campaigns KPI Summary */}
        <div className="bg-white dark:bg-slate-800/85 p-6 rounded-2xl border border-slate-150 dark:border-slate-800/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-6 flex justify-between items-center border-b border-slate-100 dark:border-slate-800/40 pb-4">
              <h2 className="text-base font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-500" /> Mass Mailing Performance
              </h2>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Live Campaigns</span>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Emails Sent</span>
                <span className="text-2xl font-medium text-slate-900 dark:text-white">{campaignsMetrics.sent.toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Delivered</span>
                <span className="text-2xl font-medium text-slate-900 dark:text-white">{campaignsMetrics.delivered.toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Opens</span>
                <span className="text-2xl font-medium text-slate-900 dark:text-white">{campaignsMetrics.opened.toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Clicks</span>
                <span className="text-2xl font-medium text-slate-900 dark:text-white">{campaignsMetrics.clicked.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-2 pt-4 border-t border-slate-150 dark:border-slate-750/50 text-center">
            <div>
              <div className="text-xs font-medium text-slate-550 dark:text-slate-400">Delivery Rate</div>
              <div className="text-sm font-semibold text-slate-850 dark:text-slate-200 mt-1">{deliveryRate}%</div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-550 dark:text-slate-400">Open Rate</div>
              <div className="text-sm font-semibold text-slate-850 dark:text-slate-200 mt-1">{openRate}%</div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-550 dark:text-slate-400">Click Rate</div>
              <div className="text-sm font-semibold text-slate-850 dark:text-slate-200 mt-1">{clickRate}%</div>
            </div>
          </div>
        </div>

        {/* Operational activity feed */}
        <div className="bg-white dark:bg-slate-800/85 p-6 rounded-2xl border border-slate-150 dark:border-slate-800/60 shadow-sm flex flex-col h-[340px]">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40 pb-4 shrink-0">
            <h2 className="text-base font-medium text-slate-900 dark:text-white flex items-center gap-2">
              <ActivityIcon className="w-5 h-5 text-emerald-500" /> Operational Feed
            </h2>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Recent Completed Logs</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {recentActivities.map((act, i) => (
              <div key={act.id || i} className="flex gap-3 items-start py-1.5 border-b border-slate-50 dark:border-slate-800/20 last:border-0">
                <div className="w-1.5 h-1.5 mt-2 rounded-full bg-emerald-500 shrink-0"></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-850 dark:text-slate-200 leading-snug break-words">
                    {act.assigned_to || 'Sales Representative'} completed a <span className="lowercase font-semibold text-blue-600 dark:text-blue-400">{act.type}</span> outreach.
                  </p>
                  {act.outcome && (
                    <p className="text-xs font-normal text-slate-500 dark:text-slate-450 mt-1 truncate">
                      {act.outcome}
                    </p>
                  )}
                  <p className="text-[10px] font-normal text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDateValue(act.date)}
                  </p>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <Clock className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-normal text-slate-500">No interaction feed logs logged in this cycle.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
