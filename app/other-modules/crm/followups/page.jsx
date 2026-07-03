"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  ArrowLeft,
  Calendar,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Settings,
  MoreVertical,
  SlidersHorizontal,
  Table as TableIcon,
  LayoutGrid,
  Trello,
  Briefcase,
  User,
  MapPin,
  FileText,
  UserCheck,
  Building,
  TrendingUp,
  History,
  CornerDownRight,
  Sparkles,
  RefreshCw,
  Flag,
  MousePointerClick,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

// Official Flaticon CDN Logos
const OFFICIAL_ICONS = {
  WhatsApp: 'https://cdn-icons-png.flaticon.com/128/3536/3536445.png',
  Call: 'https://cdn-icons-png.flaticon.com/128/724/724664.png',
  Email: 'https://cdn-icons-png.flaticon.com/128/5968/5968534.png',
  Meeting: 'https://cdn-icons-png.flaticon.com/128/5968/5968552.png'
};

export default function FollowupsPage() {
  const { toast } = useToast();
  const [leads, setLeads] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Views and Filters
  const [viewMode, setViewMode] = useState('table'); // 'table', 'kanban', 'card'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [urgencyFilter, setUrgencyFilter] = useState('All');
  
  // Detail Mode
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [leadDetail, setLeadDetail] = useState(null);
  const [manualLogs, setManualLogs] = useState([]);
  const [campaignLogs, setCampaignLogs] = useState([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState('timeline'); // 'timeline', 'log', 'profile'
  const [expandedTimelineItems, setExpandedTimelineItems] = useState({});
  
  // Form State for logging follow-up
  const [formType, setFormType] = useState('Call'); // 'Call', 'WhatsApp', 'Email', 'Meeting'
  const [formOutcome, setFormOutcome] = useState('');
  const [formNextDate, setFormNextDate] = useState('');
  const [formNextType, setFormNextType] = useState('Call');
  const [formLeadStatus, setFormLeadStatus] = useState('Follow-up');
  const [formLeadCategory, setFormLeadCategory] = useState('Warm');
  const [isSavingLog, setIsSavingLog] = useState(false);

  useEffect(() => {
    fetchFollowupData();
  }, []);

  const fetchFollowupData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/other-modules/crm/api/followups');
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setFollowups(data.followups || []);
      } else {
        toast.error('Failed to load follow-up records.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching data.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeadDetail = async (leadId) => {
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/other-modules/crm/api/followups?lead_id=${leadId}`);
      if (res.ok) {
        const data = await res.json();
        setLeadDetail(data.lead);
        setManualLogs(data.manualFollowups || []);
        setCampaignLogs(data.campaignRecipients || []);
        
        // Pre-fill form values with current lead status
        if (data.lead) {
          setFormLeadStatus(data.lead.lead_status || 'Follow-up');
          setFormLeadCategory(data.lead.lead_category || 'Warm');
        }
        
        setExpandedTimelineItems({});
      } else {
        toast.error('Failed to load lead details.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error loading lead details.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleOpenLead = (leadId) => {
    setSelectedLeadId(leadId);
    setDetailTab('timeline');
    fetchLeadDetail(leadId);
  };

  const handleCloseLead = () => {
    setSelectedLeadId(null);
    setLeadDetail(null);
    setManualLogs([]);
    setCampaignLogs([]);
    setExpandedTimelineItems({});
  };

  const handleSaveLog = async (e) => {
    e.preventDefault();
    if (!formOutcome.trim()) {
      toast.error('Please enter discussion notes or outcome.');
      return;
    }

    setIsSavingLog(true);
    try {
      const logRes = await fetch('/other-modules/crm/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedLeadId,
          followup_type: formType,
          direction: 'Outbound',
          status: 'Completed',
          outcome: formOutcome,
          next_followup_date: formNextDate || null,
          next_followup_type: formNextDate ? formNextType : null
        })
      });

      if (!logRes.ok) throw new Error('Failed to record follow-up activity.');

      const leadRes = await fetch('/other-modules/crm/api/leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedLeadId,
          lead_status: formLeadStatus,
          lead_category: formLeadCategory
        })
      });

      if (!leadRes.ok) throw new Error('Failed to update lead classification.');

      toast.success('Follow-up activity recorded successfully.');
      setFormOutcome('');
      setFormNextDate('');
      
      fetchLeadDetail(selectedLeadId);
      fetchFollowupData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error saving follow-up.');
    } finally {
      setIsSavingLog(false);
    }
  };

  const getUrgency = (dateStr) => {
    if (!dateStr) return 'No Follow-up';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(dateStr);
    nextDate.setHours(0, 0, 0, 0);
    
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return 'This Week';
    return 'Later';
  };

  const stats = useMemo(() => {
    let overdue = 0;
    let today = 0;
    let thisWeek = 0;
    let completed = 0;

    leads.forEach(l => {
      const urgency = getUrgency(l.next_followup_date);
      if (urgency === 'Overdue') overdue++;
      if (urgency === 'Today') today++;
      if (urgency === 'Tomorrow' || urgency === 'This Week') thisWeek++;
    });

    completed = followups.filter(f => f.status === 'Completed' || f.status === 'Sent').length;

    return { overdue, today, thisWeek, completed, totalLeads: leads.length };
  }, [leads, followups]);

  const processedLeads = useMemo(() => {
    return leads.map(lead => {
      const leadFollowups = followups.filter(f => f.lead_id === lead.lead_id);
      
      const completed = leadFollowups.filter(f => f.status === 'Completed' || f.status === 'Sent');
      const lastCompleted = completed.length > 0 ? completed[0] : null;

      const scheduled = leadFollowups.filter(f => f.status === 'Scheduled' || f.status === 'Pending');
      const nextScheduled = scheduled.length > 0 ? scheduled[scheduled.length - 1] : null;

      const urgency = getUrgency(lead.next_followup_date || (nextScheduled ? nextScheduled.scheduled_at : null));

      return {
        ...lead,
        urgency,
        lastCompleted,
        nextScheduled
      };
    });
  }, [leads, followups]);

  const filteredLeads = useMemo(() => {
    return processedLeads.filter(lead => {
      const name = lead.full_name || '';
      const company = lead.company_name || '';
      const email = lead.email || '';
      const matchQuery = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatus = statusFilter === 'All' || lead.lead_status === statusFilter;
      const matchCategory = categoryFilter === 'All' || lead.lead_category === categoryFilter;
      const matchUrgency = urgencyFilter === 'All' || lead.urgency === urgencyFilter;

      return matchQuery && matchStatus && matchCategory && matchUrgency;
    });
  }, [processedLeads, searchQuery, statusFilter, categoryFilter, urgencyFilter]);

  const kanbanColumns = ['Overdue', 'Today', 'Tomorrow', 'This Week', 'Later', 'No Follow-up'];

  const kanbanGroups = useMemo(() => {
    const groups = {
      'Overdue': [],
      'Today': [],
      'Tomorrow': [],
      'This Week': [],
      'Later': [],
      'No Follow-up': []
    };
    filteredLeads.forEach(lead => {
      if (groups[lead.urgency]) {
        groups[lead.urgency].push(lead);
      } else {
        groups['No Follow-up'].push(lead);
      }
    });
    return groups;
  }, [filteredLeads]);

  const combinedTimeline = useMemo(() => {
    const list = [];
    
    manualLogs.forEach(log => {
      list.push({
        id: `manual-${log.followup_id}`,
        type: 'manual',
        channel: log.followup_type,
        direction: log.direction,
        timestamp: log.completed_at || log.created_at,
        outcome: log.outcome,
        agent: log.assigned_to,
        status: log.status,
        nextDate: log.next_followup_date,
        nextType: log.next_followup_type
      });
    });

    campaignLogs.forEach(log => {
      list.push({
        id: `campaign-${log.recipient_id}`,
        type: 'campaign',
        channel: 'Email',
        direction: 'Outbound',
        timestamp: log.created_at,
        outcome: `Sent Campaign Broadcast: "${log.campaign?.template?.subject || 'No Subject'}"`,
        campaignName: log.campaign?.campaign_name || 'Broadcast',
        agent: 'Campaign Engine',
        status: log.unsubscribed ? 'Unsubscribed' : log.delivery_status
      });
    });

    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [manualLogs, campaignLogs]);

  const toggleTimelineItem = (itemId) => {
    setExpandedTimelineItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Image CDN Logo render helper
  const renderOfficialLogo = (type, sizeClass = "w-5 h-5") => {
    const src = OFFICIAL_ICONS[type];
    if (src) {
      return (
        <img 
          src={src} 
          className={`${sizeClass} object-contain shrink-0`} 
          alt={type} 
        />
      );
    }
    return <Clock className={`${sizeClass} text-slate-400 shrink-0`} />;
  };

  const getChannelColor = (type) => {
    switch (type) {
      case 'WhatsApp':
        return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30';
      case 'Call':
        return 'text-blue-500 bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30';
      case 'Email':
        return 'text-violet-500 bg-violet-50 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/30';
      case 'Meeting':
        return 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30';
      default:
        return 'text-slate-500 bg-slate-50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800';
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'Overdue':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200 dark:border-rose-900/30';
      case 'Today':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-450 border-amber-250 dark:border-amber-900/30';
      case 'Tomorrow':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200 dark:border-blue-900/30';
      case 'This Week':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/30';
      case 'Later':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-355 border-slate-205 dark:border-slate-700';
      default:
        return 'bg-slate-50 text-slate-450 dark:bg-slate-850 dark:text-slate-500 border-slate-150 dark:border-slate-800/80';
    }
  };

  const getLeadStatusColor = (status) => {
    switch (status) {
      case 'New':
        return 'bg-blue-50 text-blue-655 dark:bg-blue-955/20 dark:text-blue-400 border-blue-100 dark:border-blue-900/30';
      case 'Contacted':
        return 'bg-indigo-50 text-indigo-655 dark:bg-indigo-955/20 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30';
      case 'Follow-up':
        return 'bg-amber-50 text-amber-655 dark:bg-amber-955/20 dark:text-amber-400 border-amber-105 dark:border-amber-900/30';
      case 'Qualified':
        return 'bg-emerald-50 text-emerald-655 dark:bg-emerald-955/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30';
      case 'Converted':
        return 'bg-teal-50 text-teal-655 dark:bg-teal-955/20 dark:text-teal-400 border-teal-100 dark:border-teal-900/30';
      case 'Lost':
        return 'bg-rose-50 text-rose-655 dark:bg-rose-955/20 dark:text-rose-400 border-rose-100 dark:border-rose-900/30';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-100 dark:border-slate-800';
    }
  };

  const getPriorityStyle = (priority) => {
    const p = priority?.toLowerCase() || '';
    if (p === 'high' || p === 'urgent') {
      return 'text-rose-500 dark:text-rose-400';
    }
    if (p === 'low') {
      return 'text-slate-500 dark:text-slate-400';
    }
    return 'text-amber-605 dark:text-amber-500';
  };

  const getDeliveryStatusBadge = (status) => {
    const s = String(status).toLowerCase();
    switch (s) {
      case 'opened':
        return (
          <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-750 border border-violet-100 px-2 py-0.5 rounded-full text-[10px] font-bold dark:bg-violet-955/25 dark:text-violet-400">
            <Eye size={10} className="shrink-0" />
            <span>Opened</span>
          </span>
        );
      case 'clicked':
        return (
          <span className="inline-flex items-center gap-1 bg-fuchsia-50 text-fuchsia-750 border border-fuchsia-100 px-2 py-0.5 rounded-full text-[10px] font-bold dark:bg-fuchsia-955/25 dark:text-fuchsia-400">
            <MousePointerClick size={10} className="shrink-0" />
            <span>Clicked</span>
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-750 border border-emerald-100 px-2 py-0.5 rounded-full text-[10px] font-bold dark:bg-emerald-955/25 dark:text-emerald-450">
            <CheckCircle size={10} className="shrink-0" />
            <span>Delivered</span>
          </span>
        );
      case 'bounced':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-750 border border-rose-100 px-2 py-0.5 rounded-full text-[10px] font-bold dark:bg-rose-955/25 dark:text-rose-400">
            <AlertTriangle size={10} className="shrink-0" />
            <span>Bounced</span>
          </span>
        );
      case 'unsubscribed':
        return (
          <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-655 border border-slate-100 px-2 py-0.5 rounded-full text-[10px] font-bold dark:bg-slate-900 dark:text-slate-400">
            <AlertCircle size={10} className="shrink-0" />
            <span>Unsubscribed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-755 border border-blue-105 px-2 py-0.5 rounded-full text-[10px] font-bold dark:bg-blue-955/25 dark:text-blue-400">
            <Mail size={10} className="shrink-0" />
            <span>Sent</span>
          </span>
        );
    }
  };

  // FULL PAGE LEAD DETAIL VIEWS
  if (selectedLeadId && leadDetail) {
    return (
      <div className="p-6 text-slate-800 dark:text-slate-150 transition-colors duration-300 h-full overflow-y-auto bg-slate-50 dark:bg-slate-900 font-sans">
        
        {/* Header navigation bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-slate-200/60 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCloseLead}
              className="p-2 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 hover:bg-slate-55 dark:hover:bg-slate-850 text-slate-655 dark:text-slate-355 rounded-full shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lead details</span>
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 border rounded-full ${getLeadStatusColor(leadDetail.lead_status)}`}>
                  {leadDetail.lead_status}
                </span>
                {leadDetail.lead_category && (
                  <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    {leadDetail.lead_category} Temperature
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-semibold text-slate-800 dark:text-white mt-1 leading-tight tracking-tight">{leadDetail.full_name}</h1>
            </div>
          </div>
          
          <button
            onClick={() => fetchLeadDetail(selectedLeadId)}
            className="px-4 py-2 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-955 hover:bg-slate-55 dark:hover:bg-slate-855 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-full inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          >
            <RefreshCw size={12} />
            <span>Refresh details</span>
          </button>
        </div>

        {/* THREE SECTION TABS - Full page width, perfectly aligned to the left */}
        <div className="flex border-b border-slate-200/60 dark:border-slate-800/80 mb-6 w-full">
          {[
            { id: 'timeline', label: 'Timeline Pipeline', icon: History },
            { id: 'log', label: 'Log Follow-up Action', icon: Sparkles },
            { id: 'profile', label: 'Personal Details', icon: User }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = detailTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setDetailTab(tab.id)}
                className={`py-3 px-5 font-semibold text-xs border-b-2 inline-flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap -mb-[2px] ${
                  active
                    ? 'border-[#6057DA] text-[#6057DA] dark:border-[#7C74F0] dark:text-[#7C74F0]'
                    : 'border-transparent text-slate-450 hover:text-slate-850 dark:hover:text-white'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TABS CONTAINER - Left-aligned but restricted in width so it doesn't stretch too wide */}
        <div className="w-full max-w-4xl">
          {isLoadingDetail ? (
            <div className="flex flex-col items-center justify-center p-24 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl">
              <div className="w-8 h-8 border-3 border-indigo-650 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs text-slate-455">Loading pipeline log history...</p>
            </div>
          ) : (
            <>
              {/* SECTION 1: TIMELINE PIPELINE */}
              {detailTab === 'timeline' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-150 dark:border-slate-800/60">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Pipeline History</h3>
                    <span className="text-[10px] font-semibold text-slate-400">{combinedTimeline.length} events logged</span>
                  </div>
                  
                  {combinedTimeline.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl">
                      <History size={36} className="text-slate-350 stroke-[1.2] mb-3" />
                      <p className="text-xs text-slate-450">No communication logs recorded yet.</p>
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-slate-200/80 dark:border-slate-800 pl-8 ml-3 space-y-6">
                      {combinedTimeline.map((item) => {
                        const isExpanded = !!expandedTimelineItems[item.id];
                        return (
                          <div key={item.id} className="relative">
                            {/* Node dot icon with official app-logo style images - Perfectly centered and fitted */}
                            <span className="absolute -left-[48px] top-1 w-9 h-9 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-xl shadow-sm inline-flex items-center justify-center p-1.5 overflow-hidden">
                              {renderOfficialLogo(item.channel, "w-6 h-6")}
                            </span>
                            
                            {/* Timeline Accordion Header */}
                            <div 
                              onClick={() => toggleTimelineItem(item.id)}
                              className="flex items-center justify-between gap-3 p-4 bg-white dark:bg-slate-955 border border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 rounded-xl cursor-pointer transition-all duration-150 shadow-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[13px] font-semibold text-slate-855 dark:text-slate-200">
                                  {item.channel}
                                </span>
                                {item.type === 'campaign' ? (
                                  <span className="text-[8px] bg-indigo-50 border border-indigo-100 text-[#6057DA] dark:bg-indigo-955/25 dark:text-indigo-400 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider shrink-0">
                                    Campaign
                                  </span>
                                ) : (
                                  <span className="text-[8px] bg-slate-105 border border-slate-200 text-slate-655 dark:bg-slate-900 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider shrink-0">
                                    Manual Log
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-3 shrink-0">
                                {item.type === 'campaign' ? (
                                  getDeliveryStatusBadge(item.status)
                                ) : (
                                  <span className="text-[9px] bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase dark:bg-emerald-955/25 dark:text-emerald-450">
                                    Completed
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                                  {new Date(item.timestamp).toLocaleString()}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp size={14} className="text-slate-400" />
                                ) : (
                                  <ChevronDown size={14} className="text-slate-400" />
                                )}
                              </div>
                            </div>

                            {/* Accordion outcome detail */}
                            {isExpanded && (
                              <div className="mt-1 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-4 rounded-xl shadow-xs transition-all duration-200">
                                <p className="text-xs text-slate-655 dark:text-slate-350 leading-relaxed font-normal whitespace-pre-line">
                                  {item.outcome}
                                </p>
                                {item.type === 'campaign' && item.campaignName && (
                                  <div className="mt-2 text-[10px] text-slate-455 flex items-center gap-1">
                                    <CornerDownRight size={10} />
                                    <span>Origin: Campaign "{item.campaignName}"</span>
                                  </div>
                                )}
                                {item.agent && (
                                  <div className="mt-2.5 text-[10px] text-slate-400 flex items-center gap-1 border-t border-slate-100 dark:border-slate-855 pt-2">
                                    <User size={10} className="shrink-0" />
                                    <span>Recorded by: {item.agent}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 2: LOG FOLLOW-UP ACTION FORM */}
              {detailTab === 'log' && (
                <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs">
                  <div className="flex items-center gap-2 pb-3.5 border-b border-slate-150 dark:border-slate-800/80 mb-4">
                    <Sparkles className="text-indigo-500 w-4.5 h-4.5" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-355">Log Follow-up Action</h3>
                  </div>

                  <form onSubmit={handleSaveLog} className="space-y-4">
                    {/* Channel selectors with soft borders and official Flaticon CDN images */}
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { id: 'Call', label: 'Call' },
                        { id: 'WhatsApp', label: 'WhatsApp' },
                        { id: 'Email', label: 'Email' },
                        { id: 'Meeting', label: 'Meeting' }
                      ].map(opt => {
                        const active = formType === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setFormType(opt.id)}
                            className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all cursor-pointer shadow-xs ${
                              active 
                                ? 'border-indigo-305 bg-indigo-50/15 text-[#6057DA] dark:border-indigo-800 dark:bg-indigo-950/20' 
                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-855'
                            }`}
                          >
                            <span className="w-10 h-10 flex items-center justify-center">
                              {renderOfficialLogo(opt.id, "w-7 h-7")}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider mt-1">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Notes Area */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-455 uppercase">Discussion Conclusion / Notes</label>
                      <textarea
                        rows={4}
                        required
                        value={formOutcome}
                        onChange={(e) => setFormOutcome(e.target.value)}
                        placeholder="Write call details, whatsapp chat updates, or next step notes..."
                        className="w-full p-3.5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-855 dark:text-slate-100 rounded-xl outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 text-xs leading-relaxed"
                      />
                    </div>

                    {/* Scheduling Column */}
                    <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <Calendar size={13} className="text-indigo-500" />
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase">Schedule Next Action (Optional)</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Date</span>
                          <input
                            type="date"
                            value={formNextDate}
                            onChange={(e) => setFormNextDate(e.target.value)}
                            className="w-full p-2 border border-slate-100 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-xs text-slate-705 dark:text-slate-200 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Channel Type</span>
                          <select
                            value={formNextType}
                            onChange={(e) => setFormNextType(e.target.value)}
                            className="w-full p-2 border border-slate-100 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-xs text-slate-705 dark:text-slate-200 outline-none"
                          >
                            <option value="Call">Call</option>
                            <option value="WhatsApp">WhatsApp</option>
                            <option value="Email">Email</option>
                            <option value="Meeting">Meeting</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Classification updates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-455 uppercase">Update Status</label>
                        <select
                          value={formLeadStatus}
                          onChange={(e) => setFormLeadStatus(e.target.value)}
                          className="w-full p-2.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs text-slate-705 dark:text-slate-200 outline-none"
                        >
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Follow-up">Follow-up</option>
                          <option value="Qualified">Qualified</option>
                          <option value="Converted">Converted</option>
                          <option value="Lost">Lost</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-455 uppercase">Update Temperature</label>
                        <select
                          value={formLeadCategory}
                          onChange={(e) => setFormLeadCategory(e.target.value)}
                          className="w-full p-2.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs text-slate-705 dark:text-slate-200 outline-none"
                        >
                          <option value="Hot">Hot</option>
                          <option value="Warm">Warm</option>
                          <option value="Cold">Cold</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingLog}
                      className="w-full py-3 bg-[#6057DA] hover:bg-[#4E46C8] text-white text-[13px] font-semibold rounded-xl inline-flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingLog ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Saving logs...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={15} />
                          <span>Save & Update Follow-up</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* SECTION 3: PERSONAL DETAILS (FULL PROFILE) */}
              {detailTab === 'profile' && (
                <div className="space-y-6">
                  
                  {/* Personal Contact */}
                  <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs">
                    <div className="flex items-center gap-2 pb-3.5 border-b border-slate-150 dark:border-slate-855 mb-4">
                      <User className="text-indigo-500 w-4.5 h-4.5" />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-355">Contact Information</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100/50 dark:border-slate-855">
                        <span className="font-normal text-slate-400 block mb-1">Email address</span>
                        <a href={`mailto:${leadDetail.email}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">{leadDetail.email || 'N/A'}</a>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100/50 dark:border-slate-855">
                        <span className="font-normal text-slate-400 block mb-1">Alternate Email</span>
                        <span className="font-medium text-slate-705 dark:text-slate-205">{leadDetail.email_alt || 'N/A'}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100/50 dark:border-slate-855">
                        <span className="font-normal text-slate-400 block mb-1">Phone number</span>
                        <a href={`tel:${leadDetail.phone}`} className="font-medium text-slate-755 dark:text-slate-205 hover:underline">{leadDetail.phone || 'N/A'}</a>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100/50 dark:border-slate-855">
                        <span className="font-normal text-slate-400 block mb-1">Alternate Phone</span>
                        <span className="font-medium text-slate-705 dark:text-slate-205">{leadDetail.phone_alt || 'N/A'}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100/50 dark:border-slate-855">
                        <span className="font-normal text-slate-400 block mb-1">WhatsApp number</span>
                        <a href={`https://wa.me/${String(leadDetail.whatsapp || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-600 dark:text-emerald-450 hover:underline">{leadDetail.whatsapp || 'N/A'}</a>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100/50 dark:border-slate-855">
                        <span className="font-normal text-slate-400 block mb-1">Source / Batch</span>
                        <span className="font-medium text-slate-755 dark:text-slate-250">{leadDetail.lead_source || 'N/A'} ({leadDetail.source_batch || 'Manual Input'})</span>
                      </div>
                    </div>
                  </div>

                  {/* Business Profile */}
                  <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs">
                    <div className="flex items-center gap-2 pb-3.5 border-b border-slate-150 dark:border-slate-855 mb-4">
                      <Building className="text-indigo-500 w-4.5 h-4.5" />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-355">Business Profile</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100/50 dark:border-slate-855">
                        <span className="font-normal text-slate-400 block mb-1">Company name</span>
                        <span className="font-medium text-slate-755 dark:text-slate-250">{leadDetail.company_name || 'N/A'}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100/50 dark:border-slate-855">
                        <span className="font-normal text-slate-400 block mb-1">Designation</span>
                        <span className="font-medium text-slate-755 dark:text-slate-250">{leadDetail.designation || 'N/A'}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100/50 dark:border-slate-855">
                        <span className="font-normal text-slate-400 block mb-1">Industry</span>
                        <span className="font-medium text-slate-755 dark:text-slate-250">{leadDetail.industry || 'N/A'}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100/50 dark:border-slate-855">
                        <span className="font-normal text-slate-400 block mb-1">Company Size</span>
                        <span className="font-medium text-slate-755 dark:text-slate-250">{leadDetail.company_size || 'N/A'}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100/50 dark:border-slate-855">
                        <span className="font-normal text-slate-400 block mb-1">Priority</span>
                        <span className={`font-semibold uppercase ${getPriorityStyle(leadDetail.priority)}`}>
                          {leadDetail.priority || 'Medium'}
                        </span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100/50 dark:border-slate-855">
                        <span className="font-normal text-slate-400 block mb-1">Lead Type</span>
                        <span className="font-medium text-slate-755 dark:text-slate-250">{leadDetail.lead_type || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Geography Location */}
                  <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs">
                    <div className="flex items-center gap-2 pb-3.5 border-b border-slate-150 dark:border-slate-855 mb-4">
                      <MapPin className="text-indigo-500 w-4.5 h-4.5" />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-355">Geography Location</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100/50 dark:border-slate-855">
                        <span className="font-normal text-slate-400 block mb-1">City</span>
                        <span className="font-medium text-slate-755 dark:text-slate-250">{leadDetail.city || 'N/A'}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100/50 dark:border-slate-855">
                        <span className="font-normal text-slate-400 block mb-1">State</span>
                        <span className="font-medium text-slate-755 dark:text-slate-250">{leadDetail.state || 'N/A'}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100/50 dark:border-slate-855">
                        <span className="font-normal text-slate-400 block mb-1">Country</span>
                        <span className="font-medium text-slate-755 dark:text-slate-250">{leadDetail.country || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </>
          )}
        </div>

      </div>
    );
  }

  return (
    <div className="p-6 text-slate-800 dark:text-slate-150 transition-colors duration-300 h-full overflow-y-auto bg-slate-50 dark:bg-slate-900 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-start gap-3">
          <History size={38} className="text-[#6057DA] stroke-[1.8] shrink-0 mt-0.5" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight dark:text-white bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent leading-none">Follow-up Management</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1.5">
              Track communication pipeline, log interactions, and schedule subsequent customer check-ins.
            </p>
          </div>
        </div>
        
        <button
          onClick={fetchFollowupData}
          className="p-2 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-955 rounded-full hover:bg-slate-55 dark:hover:bg-slate-850 text-slate-505 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all shadow-xs cursor-pointer active:scale-95"
          title="Refresh logs"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      {/* STATS OVERVIEW CARD GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4.5 mb-6">
        <div className="bg-white dark:bg-slate-855 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-455 uppercase tracking-wider block">Total Leads</span>
            <span className="text-3xl font-medium text-slate-800 dark:text-white mt-1 block leading-none">{stats.totalLeads}</span>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-955/20 text-blue-650 dark:text-blue-400 rounded-xl">
            <Briefcase size={22} className="stroke-[1.8]" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-855 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-rose-500 dark:text-rose-455 uppercase tracking-wider block">Overdue followups</span>
            <span className="text-3xl font-medium text-rose-655 mt-1 block leading-none">{stats.overdue}</span>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-955/20 text-rose-500 dark:text-rose-400 rounded-xl">
            <AlertCircle size={22} className="stroke-[1.8]" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-855 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-amber-500 dark:text-amber-450 uppercase tracking-wider block">Scheduled Today</span>
            <span className="text-3xl font-medium text-amber-600 dark:text-amber-450 mt-1 block leading-none">{stats.today}</span>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-955/20 text-amber-500 dark:text-amber-405 rounded-xl">
            <Clock size={22} className="stroke-[1.8]" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-855 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider block">Scheduled This Week</span>
            <span className="text-3xl font-medium text-indigo-655 mt-1 block leading-none">{stats.thisWeek}</span>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-955/20 text-indigo-500 dark:text-indigo-400 rounded-xl">
            <Calendar size={22} className="stroke-[1.8]" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-855 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-emerald-500 dark:text-emerald-455 uppercase tracking-wider block">Completed Actions</span>
            <span className="text-3xl font-medium text-emerald-600 dark:text-emerald-400 mt-1 block leading-none">{stats.completed}</span>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-955/20 text-emerald-500 dark:text-emerald-455 rounded-xl">
            <CheckCircle size={22} className="stroke-[1.8]" />
          </div>
        </div>
      </div>

      {/* FILTER BAR ROW */}
      <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        
        {/* Search */}
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search leads by name, company, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:border-[#6057DA] dark:focus:border-[#7C74F0] focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
          />
        </div>

        {/* Action Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-100 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-350 outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Qualified">Qualified</option>
              <option value="Converted">Converted</option>
              <option value="Lost">Lost</option>
            </select>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-100 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-655 dark:text-slate-355 outline-none"
          >
            <option value="All">All Temperatures</option>
            <option value="Hot">Hot</option>
            <option value="Warm">Warm</option>
            <option value="Cold">Cold</option>
          </select>

          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-100 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-655 dark:text-slate-355 outline-none"
          >
            <option value="All">All Urgencies</option>
            <option value="Overdue">Overdue</option>
            <option value="Today">Today</option>
            <option value="Tomorrow">Tomorrow</option>
            <option value="This Week">This Week</option>
            <option value="Later">Later</option>
            <option value="No Follow-up">No Follow-up</option>
          </select>

          {/* View Modes */}
          <div className="border-l border-slate-100 dark:border-slate-800 pl-3 flex gap-1 items-center">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg border transition-all hover:bg-slate-55 dark:hover:bg-slate-850 cursor-pointer ${
                viewMode === 'table' ? 'bg-indigo-50 border-indigo-100 text-[#6057DA] dark:bg-indigo-955/20 dark:border-indigo-900/30' : 'bg-transparent border-transparent text-slate-400'
              }`}
              title="Table view"
            >
              <TableIcon size={16} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg border transition-all hover:bg-slate-55 dark:hover:bg-slate-855 cursor-pointer ${
                viewMode === 'kanban' ? 'bg-indigo-50 border-indigo-100 text-[#6057DA] dark:bg-indigo-955/20 dark:border-indigo-900/30' : 'bg-transparent border-transparent text-slate-400'
              }`}
              title="Kanban Board view"
            >
              <Trello size={16} />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-lg border transition-all hover:bg-slate-55 dark:hover:bg-slate-855 cursor-pointer ${
                viewMode === 'card' ? 'bg-indigo-50 border-indigo-100 text-[#6057DA] dark:bg-indigo-955/20 dark:border-indigo-900/30' : 'bg-transparent border-transparent text-slate-400'
              }`}
              title="Grid Card view"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* CORE CONTENT SWITCHER */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm text-slate-450 dark:text-slate-400">Loading communication pipeline...</p>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-slate-955 border border-slate-100 dark:border-slate-850 rounded-2xl">
          <UserCheck size={48} className="text-slate-300 dark:text-slate-700 stroke-[1.2] mb-4" />
          <h3 className="text-base font-semibold text-slate-750 dark:text-slate-200">No leads found</h3>
          <p className="text-xs text-slate-455 dark:text-slate-400 mt-1 max-w-sm text-center">
            We couldn't find any matching leads requiring follow-up under your current search parameters.
          </p>
        </div>
      ) : (
        <>
          {/* VIEW 1: TABLE VIEW */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm bg-white dark:bg-slate-900">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-4 font-medium text-slate-900 dark:text-slate-200 text-[14px] whitespace-nowrap">Lead ID</th>
                  <th className="py-3 px-4 font-medium text-slate-900 dark:text-slate-200 text-[14px] whitespace-nowrap">Name</th>
                  <th className="py-3 px-4 font-medium text-slate-900 dark:text-slate-200 text-[14px] whitespace-nowrap">Company</th>
                  <th className="py-3 px-4 font-medium text-slate-900 dark:text-slate-200 text-[14px] text-center w-36 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 font-medium text-slate-900 dark:text-slate-200 text-[14px] whitespace-nowrap">Last Contacted</th>
                  <th className="py-3 px-4 font-medium text-slate-900 dark:text-slate-200 text-[14px] whitespace-nowrap">Next Follow-up</th>
                  <th className="py-3 px-4 font-medium text-slate-900 dark:text-slate-200 text-[14px] whitespace-nowrap">Latest Outcome</th>
                  <th className="py-3 px-4 font-medium text-slate-900 dark:text-slate-200 text-[14px] text-center w-36 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="text-[14px] font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
                {filteredLeads.map((lead, index) => (
                  <tr
                    key={lead.lead_id ?? index}
                    className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors border-b border-slate-200 dark:border-slate-700 cursor-pointer"
                    onClick={() => handleOpenLead(lead.lead_id)}
                  >
                    <td className="py-1.5 px-4 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      {lead.lead_id}
                    </td>
                    <td className="py-1.5 px-4 border border-slate-200 dark:border-slate-700">
                      <span className="text-[14px] font-medium text-slate-900 dark:text-white">{lead.full_name}</span>
                    </td>
                    <td className="py-1.5 px-4 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                      {lead.company_name || 'No Company'}
                    </td>
                    <td className="py-1.5 px-4 border border-slate-200 dark:border-slate-700 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getLeadStatusColor(lead.lead_status)}`}>
                        {lead.lead_status}
                      </span>
                    </td>
                    <td className="py-1.5 px-4 border border-slate-200 dark:border-slate-700">
                      {lead.lastCompleted ? (
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg flex items-center justify-center p-1">
                            {renderOfficialLogo(lead.lastCompleted.followup_type, "w-4.5 h-4.5")}
                          </span>
                          <span className="text-slate-705 dark:text-slate-355">
                            {lead.last_contacted ? new Date(lead.last_contacted).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="py-1.5 px-4 border border-slate-200 dark:border-slate-700">
                      {lead.next_followup_date ? (
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[9px] font-semibold border rounded-full uppercase tracking-wider ${getUrgencyColor(lead.urgency)}`}>
                            {lead.urgency}
                          </span>
                          <span className="text-slate-805 dark:text-slate-250 font-medium">
                            {new Date(lead.next_followup_date).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="py-1.5 px-4 border border-slate-200 dark:border-slate-700 max-w-xs text-slate-600 dark:text-slate-450 truncate">
                      <p className="truncate leading-normal">
                        {lead.notes || (lead.lastCompleted ? lead.lastCompleted.outcome : '—')}
                      </p>
                    </td>
                    <td className="py-1.5 px-4 border border-slate-200 dark:border-slate-700 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenLead(lead.lead_id);
                        }}
                        className="px-4 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 hover:border-slate-350 text-[12px] font-medium text-slate-800 dark:text-slate-200 rounded-full shadow-sm inline-flex items-center gap-1.5 transition-all active:scale-[0.97] whitespace-nowrap cursor-pointer"
                      >
                        <Eye size={15} className="stroke-[1.8]" />
                        <span>View Timeline</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

    </div>
  );
}
