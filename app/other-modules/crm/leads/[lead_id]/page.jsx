"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '../../context/ToastContext';
import {
  ArrowLeft,
  Copy,
  Check,
  Building2,
  Calendar,
  Phone,
  Mail,
  User,
  Plus,
  Trash2,
  Clock,
  Briefcase,
  FileText,
  Activity,
  MessageSquare,
  Globe,
  MapPin,
  Sparkles,
  Flag
} from 'lucide-react';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const leadId = params.lead_id;

  const [lead, setLead] = useState(null);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState(null);

  // Activity notes logger state
  const [noteText, setNoteText] = useState('');
  const [loggingAction, setLoggingAction] = useState(false);

  // Modals state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingLead, setDeletingLead] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    date: '',
    time: '',
    description: ''
  });

  // Fetch lead and activity details
  const loadLeadData = async () => {
    if (!leadId) return;
    try {
      const leadRes = await fetch(`/other-modules/crm/api/leads?lead_id=${leadId}`);
      if (!leadRes.ok) throw new Error('Failed to fetch lead');
      const leadData = await leadRes.json();
      
      if (leadData.lead) {
        setLead(leadData.lead);
      } else {
        toast.error('Lead not found');
      }

      const followupsRes = await fetch(`/other-modules/crm/api/followups?lead_id=${leadId}`);
      if (followupsRes.ok) {
        const followupsData = await followupsRes.json();
        setFollowups(followupsData.followups || []);
      }
    } catch (err) {
      console.error('Error loading lead detail:', err);
      toast.error('Error loading lead data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeadData();
  }, [leadId]);

  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getStatusStyle = (status) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('new') || s.includes('fresh')) {
      return 'text-blue-600 dark:text-blue-400';
    }
    if (s.includes('won') || s.includes('close') || s.includes('converted')) {
      return 'text-emerald-600 dark:text-emerald-400';
    }
    if (s.includes('lost') || s.includes('dead') || s.includes('junk')) {
      return 'text-slate-500 dark:text-slate-400';
    }
    return 'text-amber-600 dark:text-amber-400';
  };

  const getPriorityStyle = (priority) => {
    const p = priority?.toLowerCase() || '';
    if (p === 'high' || p === 'urgent') {
      return 'text-rose-655 dark:text-rose-400';
    }
    if (p === 'low') {
      return 'text-slate-500 dark:text-slate-400';
    }
    return 'text-amber-600 dark:text-amber-405';
  };

  const analytics = useMemo(() => {
    let calls = 0;
    let emails = 0;
    let meetings = 0;
    let lastActive = null;

    followups.forEach((f) => {
      const type = f.followup_type?.toLowerCase() || '';
      if (type.includes('call')) {
        calls++;
      } else if (type.includes('email')) {
        emails++;
      } else if (type.includes('meeting') || type.includes('event')) {
        meetings++;
      }

      if (f.status === 'Completed' || f.status === 'Sent') {
        const d = new Date(f.scheduled_at || f.created_at);
        if (!lastActive || d > lastActive) {
          lastActive = d;
        }
      }
    });

    return { calls, emails, meetings, lastActive };
  }, [followups]);

  const detailSections = useMemo(() => {
    if (!lead) return [];

    return [
      {
        title: 'Contact Information',
        items: [
          { label: 'Full Name', value: lead.full_name, icon: User },
          { label: 'Primary Email', value: lead.email, type: 'email', icon: Mail },
          { label: 'Alternate Email', value: lead.email_alt, type: 'email', icon: Mail },
          { label: 'Primary Phone', value: lead.phone, type: 'phone', icon: Phone },
          { label: 'Alternate Phone', value: lead.phone_alt, type: 'phone', icon: Phone },
          { label: 'WhatsApp', value: lead.whatsapp, type: 'whatsapp', icon: MessageSquare },
        ],
      },
      {
        title: 'Address & Region',
        items: [
          { label: 'Country', value: lead.country, icon: Globe },
          { label: 'State', value: lead.state, icon: MapPin },
          { label: 'City', value: lead.city, icon: MapPin },
          { label: 'Business Country', value: lead.business_country, icon: Globe },
          { label: 'Business City', value: lead.business_city, icon: Building2 },
          { label: 'Website', value: lead.website, type: 'website', icon: Globe },
        ],
      },
      {
        title: 'Business Profile',
        items: [
          { label: 'Company Name', value: lead.company_name, icon: Building2 },
          { label: 'Designation', value: lead.designation, icon: Briefcase },
          { label: 'Industry', value: lead.industry, icon: Briefcase },
          { label: 'Company Size', value: lead.company_size, icon: Building2 },
        ],
      },
      {
        title: 'Tracking & Ownership',
        items: [
          { label: 'Lead Source', value: lead.lead_source, icon: Globe },
          { label: 'Lead Status', value: lead.lead_status, type: 'status', icon: Activity },
          { label: 'Priority', value: lead.priority, type: 'priority', icon: Sparkles },
          { label: 'Lead Type', value: lead.lead_type, type: 'pill', icon: Sparkles },
          { label: 'Lead Category', value: lead.lead_category, type: 'pill', icon: Sparkles },
          { label: 'Assigned Agent', value: lead.assigned_to, icon: User },
          { label: 'Source Batch', value: lead.source_batch, icon: FileText },
          { label: 'Next Follow-up', value: lead.next_followup_date, type: 'date', icon: Calendar },
          { label: 'Last Contacted', value: lead.last_contacted, type: 'date', icon: Clock },
          { label: 'Created On', value: lead.created_at, type: 'datetime', icon: Calendar },
          { label: 'Last Updated', value: lead.updated_at, type: 'datetime', icon: Clock },
          { label: 'Tags', value: lead.tags, type: 'tags', icon: Sparkles },
        ],
      },
    ];
  }, [lead]);

  const formatDateValue = (value, includeTime = false) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return includeTime
      ? date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderFieldValue = (item) => {
    if (!item?.value) {
      return <span className="text-sm font-medium text-slate-450 dark:text-slate-500">-</span>;
    }

    if (item.type === 'status') {
      return <span className={`text-[15px] font-medium leading-6 ${getStatusStyle(item.value)}`}>{item.value}</span>;
    }

    if (item.type === 'priority') {
      const val = item.value || '';
      const p = val.toLowerCase();
      let flagColor = 'fill-slate-400 text-slate-400';
      if (p === 'urgent') {
        flagColor = 'fill-red-500 text-red-500';
      } else if (p === 'high') {
        flagColor = 'fill-amber-500 text-amber-500';
      } else if (p === 'medium') {
        flagColor = 'fill-blue-500 text-blue-500';
      } else if (p === 'low') {
        flagColor = 'fill-slate-400 text-slate-400';
      }
      return (
        <span className={`inline-flex items-center gap-1.5 text-[15px] font-medium leading-6 ${getPriorityStyle(item.value)}`}>
          <Flag className={`w-3.5 h-3.5 ${flagColor} shrink-0`} />
          <span>{item.value}</span>
        </span>
      );
    }

    if (item.type === 'pill') {
      return <span className="text-[15px] font-medium leading-6 text-indigo-600 dark:text-indigo-400">{item.value}</span>;
    }

    if (item.type === 'tags') {
      const tags = String(item.value).split(',').map(tag => tag.trim()).filter(Boolean);
      if (!tags.length) {
        return <span className="text-sm font-medium text-slate-455 dark:text-slate-500">-</span>;
      }
      return (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="inline-flex rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-705 dark:border-slate-700 dark:text-slate-300">
              {tag}
            </span>
          ))}
        </div>
      );
    }

    if (item.type === 'date' || item.type === 'datetime') {
      return <span className="text-[15px] font-medium leading-6 text-slate-900 dark:text-slate-100">{formatDateValue(item.value, item.type === 'datetime')}</span>;
    }

    if (item.type === 'website' || item.type === 'email' || item.type === 'phone' || item.type === 'whatsapp') {
      let href = item.value;
      if (item.type === 'website' && !String(item.value).startsWith('http')) href = `https://${item.value}`;
      else if (item.type === 'email') href = `mailto:${item.value}`;
      else if (item.type === 'phone') href = `tel:${item.value}`;
      else if (item.type === 'whatsapp') href = `https://wa.me/${String(item.value).replace(/\D/g, '')}`;
      
      let textColor = 'text-blue-600 dark:text-blue-400';
      if (item.type === 'whatsapp') textColor = 'text-emerald-600 dark:text-emerald-400';
      if (item.type === 'phone') textColor = 'text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-455';

      return (
        <div className="flex items-start justify-between gap-3">
          <a href={href} target={item.type === 'website' || item.type === 'whatsapp' ? "_blank" : "_self"} rel="noopener noreferrer" className={`text-[15px] font-medium leading-6 break-all ${textColor} hover:underline`}>
            {item.value}
          </a>
          <button onClick={() => handleCopy(item.value, item.label)} className="mt-0.5 text-slate-400 transition hover:text-slate-655 dark:hover:text-slate-300 shrink-0">
            {copiedField === item.label ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      );
    }

    return <span className="text-[15px] font-medium leading-6 text-slate-900 dark:text-slate-100 break-words">{item.value}</span>;
  };
  
  const handleLogActivity = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setLoggingAction(true);
    try {
      const scheduledAt = new Date().toISOString();
      const res = await fetch('/other-modules/crm/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          followup_type: 'Note',
          outcome: noteText,
          status: 'Completed',
          scheduled_at: scheduledAt
        })
      });

      if (!res.ok) throw new Error('Failed to save activity note');
      
      toast.success('Activity logged successfully');
      setNoteText('');
      
      await loadLeadData();
    } catch (err) {
      console.error('Error logging activity:', err);
      toast.error('Error saving activity.');
    } finally {
      setLoggingAction(false);
    }
  };

  const handleDeleteLead = async () => {
    setDeletingLead(true);
    try {
      const res = await fetch(`/other-modules/crm/api/leads?lead_id=${leadId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete lead');
      toast.success('Lead deleted successfully');
      router.push('/other-modules/crm/leads');
    } catch (err) {
      console.error('Error deleting lead:', err);
      toast.error('Failed to delete lead.');
      setDeletingLead(false);
    }
  };

  const handleBookEventSubmit = async (e) => {
    e.preventDefault();
    try {
      const startDateTime = new Date(`${eventForm.date}T${eventForm.time || '12:00'}:00`).toISOString();
      // Default to a 1 hour duration
      const endDateTime = new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000).toISOString();
      const res = await fetch('/other-modules/crm/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventForm.title,
          event_type: 'meeting',
          start_time: startDateTime,
          end_time: endDateTime,
          color: '#8b5cf6', // default purple color for meetings
          description: eventForm.description,
          lead_id: leadId
        })
      });

      if (!res.ok) throw new Error('Failed to book event');
      toast.success('Event booked successfully!');
      setIsEventModalOpen(false);
      setEventForm({ title: '', date: '', time: '', description: '' });
      await loadLeadData();
    } catch (err) {
      console.error('Error booking event:', err);
      toast.error('Failed to book event.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50/50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading lead profile...</span>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50/50 dark:bg-slate-950 p-6">
        <h3 className="text-lg font-bold text-slate-705 dark:text-slate-200">Lead profile not found</h3>
        <p className="text-sm text-slate-500 mt-1">The requested lead record does not exist or has been deleted.</p>
        <button
          onClick={() => router.push('/other-modules/crm/leads')}
          className="mt-4 px-4 py-2 bg-indigo-550 text-white rounded-lg text-xs font-semibold hover:bg-indigo-600 transition"
        >
          Back to Leads
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f4f6f8] dark:bg-[#0c121e] p-8 space-y-6 font-sans text-slate-800 dark:text-slate-200">
      
      {/* Header navigation bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/other-modules/crm/leads')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-[#1c2a42] rounded-xl shadow-[0_3px_0_0_#d1d5db] dark:shadow-[0_3px_0_0_#0f172a] hover:translate-y-[1px] hover:shadow-[0_2px_0_0_#d1d5db] dark:hover:shadow-[0_2px_0_0_#0f172a] active:translate-y-[3px] active:shadow-none transition-all focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Lead Tracking
        </button>
      </div>

      <div className="bg-white dark:bg-[#151f32] rounded-3xl border border-slate-200/70 dark:border-slate-800/60 shadow-sm overflow-hidden">
        <div className="p-6 md:p-7 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6 border-b border-slate-100 dark:border-slate-800/40">
          <div className="flex items-start gap-4 md:gap-5">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-[#2f66f6] to-[#1d4ed8] text-white flex items-center justify-center text-2xl md:text-3xl font-semibold shadow-sm shrink-0">
              {lead.full_name ? lead.full_name.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Lead Profile</p>
                <h1 className="text-2xl md:text-3xl font-semibold text-slate-955 dark:text-white tracking-tight leading-tight">
                  {lead.full_name || 'Unnamed Lead'}
                </h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {lead.designation || 'Lead contact'}{lead.company_name ? ` at ${lead.company_name}` : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 xl:items-end">
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <button
                onClick={() => setIsEventModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/35"
              >
                <Plus className="w-4 h-4" />
                Book Event
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-550 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-450 dark:hover:bg-rose-950/35"
              >
                <Trash2 className="w-4 h-4" />
                Delete Lead
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-7">
          <div className="flex items-start gap-3 pb-6 border-b border-slate-100 dark:border-slate-800/40">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Client Profile & Details
              </h2>
            </div>
          </div>

          <div className="space-y-8 pt-6">
            {detailSections.map((section) => (
              <section key={section.title} className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{section.title}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {section.items.map((item) => {
                    const Icon = item.icon || FileText;
                    return (
                      <div key={`${section.title}-${item.label}`} className="rounded-2xl border border-slate-200/80 dark:border-slate-800/70 p-4 transition-colors hover:border-slate-300 dark:hover:border-slate-700">
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-slate-50 dark:bg-slate-900/60 flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5 text-slate-600 dark:text-slate-305" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                              {item.label}
                            </span>
                            <div className="mt-2 min-w-0">
                              {renderFieldValue(item)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/70 p-5 md:p-6 border-l-4 border-l-blue-500">
              <div className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Internal Client Notes
                </span>
                <p className="mt-2 text-sm font-medium leading-7 text-slate-707 dark:text-slate-305 whitespace-pre-wrap">
                  {lead.notes || 'No general notes logged.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Analytics Card */}
        <div className="bg-white dark:bg-[#151f32] rounded-3xl border border-slate-200/70 dark:border-slate-800/60 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/40">
            <Activity className="w-5 h-5 text-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">LEAD COMMUNICATION ANALYTICS</h2>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {/* Calls Logged Card */}
              <div className="flex flex-col justify-between rounded-xl bg-blue-50/50 dark:bg-blue-950/20 p-4 border border-blue-100/60 dark:border-blue-900/30 min-h-[96px]">
                <div className="flex items-center gap-1.5 w-full justify-start">
                  <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-550 dark:text-blue-400">CALLS LOGGED</span>
                </div>
                <span className="block text-3xl font-bold text-slate-900 dark:text-white my-auto text-center w-full">{analytics.calls}</span>
              </div>

              {/* Emails Sent Card */}
              <div className="flex flex-col justify-between rounded-xl bg-violet-50/50 dark:bg-violet-950/20 p-4 border border-violet-100/60 dark:border-violet-900/30 min-h-[96px]">
                <div className="flex items-center gap-1.5 w-full justify-start">
                  <Mail className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-555 dark:text-violet-400">EMAILS SENT</span>
                </div>
                <span className="block text-3xl font-bold text-slate-900 dark:text-white my-auto text-center w-full">{analytics.emails}</span>
              </div>

              {/* Meetings Card */}
              <div className="flex flex-col justify-between rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 p-4 border border-emerald-100/60 dark:border-emerald-900/30 min-h-[96px]">
                <div className="flex items-center gap-1.5 w-full justify-start">
                  <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-555 dark:text-emerald-455">MEETINGS</span>
                </div>
                <span className="block text-3xl font-bold text-slate-900 dark:text-white my-auto text-center w-full">{analytics.meetings}</span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-5 flex items-center gap-4 mt-auto border border-slate-100 dark:border-slate-800">
              <Clock className="w-5 h-5 text-blue-500" />
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Last Active Interaction</h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  {analytics.lastActive ? formatDateValue(analytics.lastActive, true) : 'No interaction recorded yet.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Feed & Interaction Notes */}
        <div className="bg-white dark:bg-[#151f32] rounded-3xl border border-slate-200/70 dark:border-slate-800/60 shadow-sm overflow-hidden flex flex-col max-h-[800px]">
          <div className="p-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/40 shrink-0">
            <MessageSquare className="w-5 h-5 text-indigo-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">ACTIVITY FEED & INTERACTION NOTES</h2>
          </div>

          <div className="p-6 flex-1 flex flex-col">
            <form onSubmit={handleLogActivity} className="space-y-4 mb-6">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Log a call outcome or write an internal note here..."
                className="w-full p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 outline-none text-sm text-slate-705 dark:text-slate-205 resize-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                rows={2}
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loggingAction || !noteText.trim()}
                  className="rounded-lg bg-indigo-500 px-5 py-2 text-xs font-bold text-white transition hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loggingAction ? 'Saving...' : 'Log Activity Note'}
                </button>
              </div>
            </form>

            <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
              {followups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center h-full">
                  <Activity className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-3" />
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">No historical activity recorded yet.</p>
                </div>
              ) : (
                <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent dark:before:via-slate-800">
                  {followups.map((f, i) => {
                    const type = f.followup_type?.toLowerCase() || 'note';
                    let FeedIcon = FileText;
                    let iconColor = 'text-slate-500 dark:text-slate-400';
                    let iconBg = 'bg-slate-100 dark:bg-slate-800';

                    if (type.includes('call')) {
                      FeedIcon = Phone;
                      iconColor = 'text-blue-500 dark:text-blue-400';
                      iconBg = 'bg-blue-100 dark:bg-blue-900/30';
                    } else if (type.includes('email')) {
                      FeedIcon = Mail;
                      iconColor = 'text-violet-500 dark:text-violet-400';
                      iconBg = 'bg-violet-100 dark:bg-violet-900/30';
                    } else if (type.includes('meet') || type.includes('event')) {
                      FeedIcon = Calendar;
                      iconColor = 'text-emerald-500 dark:text-emerald-400';
                      iconBg = 'bg-emerald-100 dark:bg-emerald-900/30';
                    }

                    return (
                      <div key={f.followup_id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-[#151f32] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconBg}`}>
                            <FeedIcon className={`w-4 h-4 ${iconColor}`} />
                          </div>
                        </div>

                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-800/70 dark:bg-slate-900/20 dark:hover:bg-slate-900/40">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              {f.followup_type || 'Activity'}
                            </span>
                            <span className="text-[11px] font-medium text-slate-400">
                              {formatDateValue(f.created_at || f.scheduled_at)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-305 break-words leading-relaxed">
                            {f.outcome || f.notes || 'No description provided.'}
                          </p>
                          {f.status && (
                            <div className="mt-3">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                f.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                  f.status === 'Scheduled' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                    'bg-slate-205 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                                {f.status}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#151f32] rounded-2xl w-full max-w-md p-6 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-650 dark:text-rose-450" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Lead Profile</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Are you sure you want to permanently delete <strong className="text-slate-700 dark:text-slate-303">{lead?.full_name}</strong>? This action cannot be undone and all associated activity will be lost.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-205 text-slate-705 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-202 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteLead}
                disabled={deletingLead}
                className="py-2 px-4 rounded-lg bg-[#e02424] hover:bg-[#c81e1e] text-white text-xs font-semibold"
              >
                {deletingLead ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Book Event Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#151f32] rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800/30">
              <h3 className="text-sm font-bold text-slate-805 dark:text-white uppercase tracking-wider">Book New Event</h3>
              <button onClick={() => setIsEventModalOpen(false)} className="text-slate-400 hover:text-slate-655 text-lg">×</button>
            </div>
            <form onSubmit={handleBookEventSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-400 uppercase tracking-wider font-bold mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Discovery Call, Onboarding Session"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-[#1b283f] outline-none text-slate-805 dark:text-slate-202"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 uppercase tracking-wider font-bold mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-[#1b283f] outline-none text-slate-805 dark:text-slate-202"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 uppercase tracking-wider font-bold mb-1">Time</label>
                  <input
                    type="time"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-[#1b283f] outline-none text-slate-805 dark:text-slate-202"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 uppercase tracking-wider font-bold mb-1">Description / Agenda</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  rows={3}
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-[#1b283f] outline-none text-slate-805 dark:text-slate-202 resize-none"
                  placeholder="Describe the meeting agenda or action items..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-705 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-205"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 rounded-lg bg-[#00a35c] hover:bg-[#008f51] text-white"
                >
                  Confirm Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
