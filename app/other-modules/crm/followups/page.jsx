"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useCrm } from "../context/CrmContext";
import { renderTemplateVariables } from "../utils/emailTemplates";
import {
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Play,
  Volume2,
  User,
  Send,
  FileText,
  ChevronRight,
  Copy,
  Check,
  CalendarDays,
  Smartphone,
  Users,
  Eye,
  ArrowLeft,
  UserX,
} from "lucide-react";

export default function FollowUpsPage() {
  const {
    leads,
    followups,
    addFollowup,
    updateFollowup,
    deleteFollowup,
    currentUser,
    refreshCrmData,
  } = useCrm();

  // Local state
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("Scheduled"); // Default to showing scheduled
  const [sortBy, setSortBy] = useState("scheduled_asc"); // default sort
  const [templates, setTemplates] = useState([]);
  const [showEmailPreviewModal, setShowEmailPreviewModal] = useState(null); // stores email details

  // Form State
  const [formLeadId, setFormLeadId] = useState("");
  const [formType, setFormType] = useState("Call");
  const [formDirection, setFormDirection] = useState("Outbound");
  const [formStatus, setFormStatus] = useState("Scheduled");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formOutcome, setFormOutcome] = useState("");
  const [formNextFollowupDate, setFormNextFollowupDate] = useState("");
  const [formNextFollowupType, setFormNextFollowupType] = useState("Call");
  const [formTemplateId, setFormTemplateId] = useState("");
  const [formDuration, setFormDuration] = useState("");
  const [formRecordingUrl, setFormRecordingUrl] = useState("");
  const [formTranscript, setFormTranscript] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Load email templates
  useEffect(() => {
    async function loadTemplates() {
      try {
        const res = await fetch("/other-modules/crm/api/templates");
        if (res.ok) {
          const data = await res.json();
          setTemplates(data.templates || []);
        }
      } catch (err) {
        console.error("Failed to load templates:", err);
      }
    }
    loadTemplates();
  }, []);

  // Sync selected lead to form when selected lead changes
  useEffect(() => {
    if (selectedLeadId) {
      setFormLeadId(String(selectedLeadId));
    }
  }, [selectedLeadId]);

  // Selected Lead details
  const selectedLead = useMemo(() => {
    if (!selectedLeadId) return null;
    return leads.find((l) => String(l.lead_id) === String(selectedLeadId));
  }, [selectedLeadId, leads]);

  // Lead Timeline Touchpoints
  const leadTimeline = useMemo(() => {
    if (!selectedLeadId) return [];
    return followups
      .filter((f) => String(f.lead_id) === String(selectedLeadId))
      .sort((a, b) => new Date(b.scheduled_at || b.created_at) - new Date(a.scheduled_at || a.created_at));
  }, [selectedLeadId, followups]);

  // Queue Processing (Section A)
  const filteredQueue = useMemo(() => {
    return followups
      .filter((f) => {
        // Search
        const leadName = f.lead?.full_name || leads.find((l) => String(l.lead_id) === String(f.lead_id))?.full_name || "";
        const matchesSearch =
          leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (f.outcome && f.outcome.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (f.email_sent_to && f.email_sent_to.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch) return false;

        // Type Filter
        if (typeFilter !== "all" && f.followup_type !== typeFilter) return false;

        // Status Filter
        if (statusFilter !== "all" && f.status !== statusFilter) return false;

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.scheduled_at || a.created_at || 0);
        const dateB = new Date(b.scheduled_at || b.created_at || 0);

        if (sortBy === "scheduled_asc") return dateA - dateB;
        if (sortBy === "scheduled_desc") return dateB - dateA;
        return dateB - dateA;
      });
  }, [followups, leads, searchQuery, typeFilter, statusFilter, sortBy]);

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formLeadId) {
      setFormError("Please select a lead.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const scheduledDateTime = formDate
        ? new Date(`${formDate}T${formTime || "12:00"}`).toISOString()
        : new Date().toISOString();

      const matchedLead = leads.find((l) => String(l.lead_id) === String(formLeadId));

      let emailSubject = "";
      let emailBody = "";
      let resolvedTemplateId = null;

      if (formType === "Email" && formTemplateId) {
        resolvedTemplateId = parseInt(formTemplateId, 10);
        const selectedTemp = templates.find((t) => String(t.id) === String(formTemplateId));
        if (selectedTemp && matchedLead) {
          // Perform substitution
          const vars = {
            ContactName: matchedLead.full_name || "",
            CompanyName: matchedLead.company_name || "",
            AgentName: currentUser.name || "Sales Agent",
            ProductName: "Enterprise Packages",
            FollowupDate: formNextFollowupDate || "",
            Email: matchedLead.email || "",
          };
          emailSubject = renderTemplateVariables(selectedTemp.subject, vars);
          emailBody = renderTemplateVariables(selectedTemp.html_body || selectedTemp.plain_text_body, vars);
        }
      }

      const payload = {
        lead_id: parseInt(formLeadId, 10),
        followup_type: formType,
        direction: formDirection,
        status: formStatus,
        scheduled_at: scheduledDateTime,
        completed_at: ["Completed", "Sent", "No Answer"].includes(formStatus) ? new Date().toISOString() : null,
        duration_seconds: formDuration ? parseInt(formDuration, 10) : null,
        outcome: formOutcome,
        next_followup_date: formNextFollowupDate || null,
        next_followup_type: formNextFollowupDate ? formNextFollowupType : null,
        template_id: resolvedTemplateId,
        email_sent_to: matchedLead?.email || null,
        email_subject_sent: emailSubject || null,
        email_body_snapshot: emailBody || null,
        email_delivery_status: formType === "Email" ? (formStatus === "Scheduled" ? "Pending" : "Sent") : null,
        call_recording_url: formRecordingUrl || null,
        ai_call_transcript: formTranscript || null,
        assigned_to: currentUser.name || null,
      };

      await addFollowup(payload);

      // Reset form fields
      setFormOutcome("");
      setFormNextFollowupDate("");
      setFormRecordingUrl("");
      setFormTranscript("");
      setFormDuration("");
      setFormTemplateId("");
      
      // Auto select this lead to show it on timeline
      setSelectedLeadId(formLeadId);
    } catch (err) {
      console.error(err);
      setFormError("An error occurred while saving the follow-up.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Action: Complete a Scheduled Follow-up
  const handleMarkAsCompleted = async (followup, e) => {
    e.stopPropagation();
    try {
      const updates = {
        status: "Completed",
        completed_at: new Date().toISOString(),
      };
      await updateFollowup(followup.followup_id, updates);
    } catch (err) {
      console.error("Failed to complete followup:", err);
    }
  };

  // Get color badges
  const getStatusBadge = (status) => {
    switch (status) {
      case "Scheduled":
        return "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/40";
      case "Completed":
      case "Sent":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40";
      case "No Answer":
        return "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/40";
      case "Cancelled":
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border-rose-100 dark:border-rose-800/30";
      case "medium":
        return "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 dark:border-amber-800/30";
      case "low":
        return "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-150 dark:border-slate-700";
      default:
        return "bg-slate-50 text-slate-600 border-slate-150";
    }
  };

  const getTouchpointIcon = (type) => {
    switch (type) {
      case "Call":
      case "AI Call":
        return <Phone className="w-4 h-4" />;
      case "Email":
        return <Mail className="w-4 h-4" />;
      case "WhatsApp":
        return <Smartphone className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 overflow-hidden font-sans">
      {/* Top Banner/Header */}
      <div className="px-8 py-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-xs">
        <div className="flex items-start gap-3">
          <CalendarDays size={38} className="text-[#6057DA] stroke-[1.8] shrink-0 mt-0.5" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight dark:text-white bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent leading-none">Follow-ups</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1.5">
              Log activities, view interactive lead timelines, and complete scheduled touchpoints.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[13px] font-semibold px-4 py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350">
            User: {currentUser.name} ({currentUser.role})
          </span>
          <button
            onClick={() => refreshCrmData()}
            className="px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 text-[13px] font-semibold text-slate-800 dark:text-slate-200 rounded-full inline-flex items-center gap-1.5 transition-all h-[40px] cursor-pointer focus:outline-none"
          >
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {selectedLeadId === null ? (
        /* PAGE 1: Follow-up Queue List View */
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-900/10">
          {/* Header Search & Filter */}
          <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-150 dark:border-slate-850/85 shrink-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex items-center bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-full px-3.5 w-full md:w-[260px] h-[40px] focus-within:border-slate-300 dark:focus-within:border-slate-700 transition-all">
                  <Search size={15} className="text-slate-450 mr-2 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search queue by lead..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-0 outline-none w-full p-0 text-slate-800 dark:text-slate-100 placeholder-slate-455 text-xs"
                  />
                </div>
                
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-4.5 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-full bg-slate-50 dark:bg-slate-955 text-slate-705 dark:text-slate-350 outline-none h-[40px] cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="Call">Call</option>
                  <option value="AI Call">AI Call</option>
                  <option value="Email">Email</option>
                  <option value="WhatsApp">WhatsApp</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4.5 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-full bg-slate-50 dark:bg-slate-955 text-slate-705 dark:text-slate-350 outline-none h-[40px] cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Completed">Completed</option>
                  <option value="Sent">Sent</option>
                  <option value="No Answer">No Answer</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4.5 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-full bg-slate-50 dark:bg-slate-955 text-slate-705 dark:text-slate-350 outline-none h-[40px] cursor-pointer"
                >
                  <option value="scheduled_asc">Date Asc</option>
                  <option value="scheduled_desc">Date Desc</option>
                </select>
              </div>

              <button
                onClick={() => {
                  const firstLead = leads[0];
                  if (firstLead) {
                    setSelectedLeadId(firstLead.lead_id);
                  }
                }}
                className="px-5 bg-[#6057DA] hover:bg-[#4E46C8] text-white text-[13px] font-semibold rounded-full shadow-sm inline-flex items-center gap-1.5 transition-all active:scale-[0.98] h-[40px]"
              >
                <Plus size={16} />
                <span>Log Touchpoint</span>
              </button>
            </div>
          </div>

          {/* Queue List Grid */}
          <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
            {filteredQueue.length === 0 ? (
              <div className="text-center py-16 px-6 bg-white/60 dark:bg-slate-900/40 rounded-2xl max-w-md mx-auto shadow-xs backdrop-blur-xs border-none">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                </div>
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">No Follow-ups Found</h3>
                <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">No matching follow-ups in the queue.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                {filteredQueue.map((item) => {
                  const leadName = item.lead?.full_name || leads.find((l) => String(l.lead_id) === String(item.lead_id))?.full_name || "Unknown Lead";
                  const leadPriority = item.lead?.priority || leads.find((l) => String(l.lead_id) === String(item.lead_id))?.priority || "Medium";
                  const scheduledDate = new Date(item.scheduled_at || item.created_at);

                  return (
                    <div
                      key={item.followup_id}
                      onClick={() => setSelectedLeadId(item.lead_id)}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-850 p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group shadow-sm"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-4">
                          <div className="flex items-center gap-3">
                            <span className="p-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 text-slate-550 dark:text-slate-400 group-hover:bg-[#6057DA]/10 group-hover:text-[#6057DA] transition-colors">
                              {getTouchpointIcon(item.followup_type)}
                            </span>
                            <div>
                              <h4 className="text-sm font-semibold text-slate-805 dark:text-slate-155 leading-tight group-hover:text-[#6057DA] transition-colors">
                                {leadName}
                              </h4>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                {item.followup_type} • {item.direction}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getStatusBadge(item.status)}`}>
                              {item.status}
                            </span>
                            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getPriorityBadge(leadPriority)}`}>
                              {leadPriority}
                            </span>
                          </div>
                        </div>

                        {item.outcome && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 bg-slate-50 dark:bg-slate-955 p-2.5 rounded-lg border border-slate-105 dark:border-slate-855 font-medium leading-relaxed">
                            {item.outcome}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3.5 border-t border-slate-105 dark:border-slate-850 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {scheduledDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} at{" "}
                            {scheduledDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        
                        <span className="text-[#6057DA] font-semibold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                          Deep Dive <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* PAGE 2: Selected Lead Detail View (Drill-Down / Switchable Page) */
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-900/10">
          {/* Breadcrumb Header Row */}
          <div className="px-8 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedLeadId(null)}
                className="p-2 bg-slate-50 hover:bg-slate-105 dark:bg-slate-955 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-705 dark:text-slate-350 rounded-full transition-colors flex items-center justify-center cursor-pointer focus:outline-none"
                title="Back to Follow-up queue"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-800 dark:text-white leading-tight">
                    {selectedLead?.full_name || "Unknown Lead"}
                  </h2>
                  <span className="bg-slate-100 text-slate-655 border border-slate-200 dark:bg-slate-855 dark:text-slate-400 dark:border-slate-805 text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full">
                    {selectedLead?.lead_status || "Active"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedLead?.company_name ? `${selectedLead.company_name} • ` : ""}
                  {selectedLead?.email || "No email"} • Source: {selectedLead?.lead_source || "Direct"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold px-3 py-1 rounded-full border uppercase tracking-wider ${getPriorityBadge(selectedLead?.priority || 'Medium')}`}>
                Priority: {selectedLead?.priority || "Medium"}
              </span>
              <button
                onClick={() => setSelectedLeadId(null)}
                className="px-4.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-855 text-xs font-semibold text-slate-700 dark:text-slate-305 rounded-full transition-colors cursor-pointer"
              >
                Back to Queue
              </button>
            </div>
          </div>

          {/* Side-by-Side Detail View */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* Left: Timeline touchpoint log (span 7) */}
            <div className="lg:col-span-7 flex flex-col bg-slate-50/20 dark:bg-slate-900/10 overflow-hidden h-full">
              <div className="p-5 border-b border-slate-150 dark:border-slate-850/80 bg-white dark:bg-slate-900 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white leading-none">Interactive Lead Timeline</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Full history of contacts and logged actions.</p>
                </div>
                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-450 px-2.5 py-1 rounded-full font-semibold">
                  {leadTimeline.length} events
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                {leadTimeline.length === 0 ? (
                  <div className="text-center py-16 px-6 bg-white/60 dark:bg-slate-900/40 rounded-2xl max-w-md mx-auto shadow-xs backdrop-blur-xs border-none my-8">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">No History Logged</h3>
                    <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">No touchpoints have been logged for this lead yet.</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-slate-205 dark:border-slate-800 ml-4 pl-6 space-y-6 py-2">
                    {leadTimeline.map((item) => {
                      const itemDate = new Date(item.scheduled_at || item.created_at);
                      return (
                        <div key={item.followup_id} className="relative group/item">
                          {/* Timeline Dot */}
                          <div className="absolute -left-[31px] top-1.5 p-1 rounded-full bg-white dark:bg-slate-955 border-2 border-blue-500 text-blue-500 dark:text-blue-405 shadow-sm shrink-0">
                            {getTouchpointIcon(item.followup_type)}
                          </div>

                          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850/60 rounded-xl p-4.5 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-50 dark:border-slate-850/40 pb-2.5">
                              <div>
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                  {item.followup_type} Touchpoint
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-2 font-medium">
                                  {item.direction}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getStatusBadge(item.status)}`}>
                                  {item.status}
                                </span>
                                <button
                                  onClick={() => deleteFollowup(item.followup_id)}
                                  className="p-1 text-slate-300 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors opacity-0 group-hover/item:opacity-100 cursor-pointer"
                                  title="Delete touchpoint"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Outcome / Content */}
                            {item.outcome && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 bg-slate-50 dark:bg-slate-955 p-3 rounded-lg border border-slate-100/60 dark:border-slate-800/40 font-medium leading-relaxed">
                                {item.outcome}
                              </p>
                            )}

                            {/* Email Details */}
                            {item.followup_type === "Email" && item.email_sent_to && (
                              <div className="mt-3 text-[11px] border-t border-slate-105 dark:border-slate-850 pt-2 space-y-1 text-slate-555 dark:text-slate-400 font-medium">
                                <div><span className="text-slate-400 dark:text-slate-500 mr-1">To:</span> {item.email_sent_to}</div>
                                {item.email_subject_sent && (
                                  <div><span className="text-slate-400 dark:text-slate-500 mr-1">Subject:</span> {item.email_subject_sent}</div>
                                )}
                                {item.email_body_snapshot && (
                                  <button
                                    onClick={() => setShowEmailPreviewModal(item)}
                                    className="text-xs text-[#6057DA] dark:text-[#7C74F0] font-semibold hover:underline mt-1.5 flex items-center gap-1 cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> View Sent HTML
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Call Details */}
                            {item.followup_type === "Call" && item.call_recording_url && (
                              <div className="mt-3 flex items-center gap-2 bg-slate-50 dark:bg-slate-955 p-2 rounded-lg border border-slate-100 dark:border-slate-800/40">
                                <Volume2 className="w-4 h-4 text-blue-500 shrink-0" />
                                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-350 truncate">Recording Available</span>
                                <a
                                  href={item.call_recording_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-[#6057DA] dark:text-[#7C74F0] font-semibold hover:underline shrink-0 ml-auto flex items-center gap-0.5"
                                >
                                  Play <Play className="w-3 h-3 fill-current" />
                                </a>
                              </div>
                            )}

                            {/* AI Call Details */}
                            {item.followup_type === "AI Call" && (
                              <div className="mt-3 space-y-2">
                                {item.call_recording_url && (
                                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-955 p-2 rounded-lg border border-slate-100 dark:border-slate-805">
                                    <Volume2 className="w-4 h-4 text-blue-500" />
                                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-355 truncate">AI Call recording</span>
                                    <a
                                      href={item.call_recording_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-[#6057DA] dark:text-[#7C74F0] font-semibold hover:underline ml-auto"
                                    >
                                      Play
                                    </a>
                                  </div>
                                )}
                                {item.ai_call_transcript && (
                                  <div className="text-[11px] bg-slate-50 dark:bg-slate-955 p-2.5 rounded-lg border border-slate-105 dark:border-slate-850">
                                    <div className="font-semibold text-slate-400 dark:text-slate-500 uppercase text-[9px] mb-1">AI Transcript</div>
                                    <p className="text-slate-605 dark:text-slate-455 italic leading-relaxed whitespace-pre-line">
                                      "{item.ai_call_transcript}"
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Footer / Assignee / Time */}
                            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-505 border-t border-slate-105 dark:border-slate-850/60 pt-2.5 font-medium">
                              <span>Agent: {item.assigned_to || 'System'}</span>
                              <span>
                                {itemDate.toLocaleDateString()} {itemDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Log Follow-up Form (span 5) */}
            <div className="lg:col-span-5 flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto h-full p-6 scrollbar-thin">
              <h3 className="text-sm font-semibold text-slate-850 dark:text-white tracking-tight mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#6057DA]" />
                Log or Schedule Touchpoint
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {formError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-755 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Lead Select */}
                <div>
                  <label className="block font-semibold text-slate-555 dark:text-slate-450 uppercase mb-1.5 px-1">Target Lead *</label>
                  <select
                    value={formLeadId}
                    onChange={(e) => {
                      setFormLeadId(e.target.value);
                      if (e.target.value) {
                        setSelectedLeadId(parseInt(e.target.value, 10));
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-150 outline-none cursor-pointer focus:border-slate-350 transition-colors"
                    required
                  >
                    <option value="">Select a Lead...</option>
                    {leads.map((l) => (
                      <option key={l.lead_id} value={l.lead_id}>
                        {l.full_name} ({l.company_name || "No Company"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Form Type & Direction */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-555 dark:text-slate-450 uppercase mb-1.5 px-1">Type *</label>
                    <select
                      value={formType}
                      onChange={(e) => {
                        setFormType(e.target.value);
                        if (e.target.value === "Email") {
                          setFormDirection("Outbound");
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-150 outline-none cursor-pointer"
                    >
                      <option value="Call">Call</option>
                      <option value="AI Call">AI Call</option>
                      <option value="Email">Email</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Meeting">Meeting</option>
                      <option value="SMS">SMS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-555 dark:text-slate-450 uppercase mb-1.5 px-1">Direction *</label>
                    <select
                      value={formDirection}
                      onChange={(e) => setFormDirection(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-150 outline-none cursor-pointer"
                      disabled={formType === "Email"}
                    >
                      <option value="Outbound">Outbound</option>
                      <option value="Inbound">Inbound</option>
                    </select>
                  </div>
                </div>

                {/* Status Selector */}
                <div>
                  <label className="block font-semibold text-slate-555 dark:text-slate-450 uppercase mb-1.5 px-1">Status *</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-905 text-slate-855 dark:text-slate-150 outline-none cursor-pointer"
                  >
                    <option value="Scheduled">Scheduled (Future)</option>
                    <option value="Completed">Completed (Now)</option>
                    {formType === "Email" && <option value="Sent">Sent (Now)</option>}
                    <option value="No Answer">No Answer (Now)</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Scheduled/Completed Date & Time */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-555 dark:text-slate-450 uppercase mb-1.5 px-1">Date</label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-855 dark:text-slate-150 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-555 dark:text-slate-450 uppercase mb-1.5 px-1">Time</label>
                    <input
                      type="time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-855 dark:text-slate-150 outline-none"
                    />
                  </div>
                </div>

                {/* Email templates */}
                {formType === "Email" && (
                  <div>
                    <label className="block font-semibold text-slate-555 dark:text-slate-450 uppercase mb-1.5 px-1">Email Template</label>
                    <select
                      value={formTemplateId}
                      onChange={(e) => setFormTemplateId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-150 outline-none cursor-pointer"
                    >
                      <option value="">No Template (Plain Send)</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Duration for call / meeting */}
                {(formType === "Call" || formType === "Meeting") && (
                  <div>
                    <label className="block font-semibold text-slate-555 dark:text-slate-450 uppercase mb-1.5 px-1">Duration (seconds)</label>
                    <input
                      type="number"
                      placeholder="e.g. 120"
                      value={formDuration}
                      onChange={(e) => setFormDuration(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-905 text-slate-855 dark:text-slate-150 outline-none"
                    />
                  </div>
                )}

                {/* Recording details */}
                {(formType === "Call" || formType === "AI Call") && (
                  <div className="space-y-3 border-t border-slate-100 dark:border-slate-855 pt-3">
                    <div>
                      <label className="block font-semibold text-slate-400 dark:text-slate-500 uppercase mb-1.5 px-1">Recording URL</label>
                      <input
                        type="text"
                        placeholder="https://example.com/recording.mp3"
                        value={formRecordingUrl}
                        onChange={(e) => setFormRecordingUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-855 dark:text-slate-150 outline-none"
                      />
                    </div>
                    {formType === "AI Call" && (
                      <div>
                        <label className="block font-semibold text-slate-400 dark:text-slate-500 uppercase mb-1.5 px-1">Transcript</label>
                        <textarea
                          rows={2}
                          placeholder="Transcribed conversation..."
                          value={formTranscript}
                          onChange={(e) => setFormTranscript(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-855 dark:text-slate-150 outline-none resize-y"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Outcome / Notes */}
                <div>
                  <label className="block font-semibold text-slate-555 dark:text-slate-450 uppercase mb-1.5 px-1">Outcome / Description</label>
                  <textarea
                    rows={3}
                    placeholder="Log notes about what was discussed, what failed, or general outcomes."
                    value={formOutcome}
                    onChange={(e) => setFormOutcome(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-855 dark:text-slate-150 outline-none resize-y"
                  />
                </div>

                {/* Next Action Scheduling */}
                <div className="border-t border-slate-105 dark:border-slate-850 pt-3 space-y-3">
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-505 uppercase tracking-widest block px-1">
                    Schedule Next Step
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-555 dark:text-slate-450 uppercase mb-1.5 px-1">Next Follow-up Date</label>
                      <input
                        type="date"
                        value={formNextFollowupDate}
                        onChange={(e) => setFormNextFollowupDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-855 dark:text-slate-150 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-555 dark:text-slate-450 uppercase mb-1.5 px-1">Next Action Type</label>
                      <select
                        value={formNextFollowupType}
                        onChange={(e) => setFormNextFollowupType(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-855 dark:text-slate-150 outline-none cursor-pointer"
                        disabled={!formNextFollowupDate}
                      >
                        <option value="Call">Call</option>
                        <option value="AI Call">AI Call</option>
                        <option value="Email">Email</option>
                        <option value="WhatsApp">WhatsApp</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#6057DA] hover:bg-[#4E46C8] text-white font-semibold py-2.5 px-4 rounded-xl transition-all mt-2 flex items-center justify-center gap-2 border border-[#6057DA]/20 shadow-md cursor-pointer active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Save touchpoint
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Sent HTML Email */}
      {showEmailPreviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">
                  HTML Body Snapshot
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Subject: {showEmailPreviewModal.email_subject_sent}
                </p>
              </div>
              <button
                onClick={() => setShowEmailPreviewModal(null)}
                className="text-slate-400 hover:text-slate-655 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
              >
                Close
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
              {showEmailPreviewModal.email_body_snapshot?.includes("<table") ||
              showEmailPreviewModal.email_body_snapshot?.includes("<div") ? (
                <div
                  className="bg-white border rounded-xl overflow-hidden shadow-sm"
                  dangerouslySetInnerHTML={{ __html: showEmailPreviewModal.email_body_snapshot }}
                />
              ) : (
                <pre className="bg-white dark:bg-slate-955 p-4 border rounded-xl shadow-xs text-xs whitespace-pre-wrap font-mono text-slate-700 dark:text-slate-300">
                  {showEmailPreviewModal.email_body_snapshot}
                </pre>
              )}
            </div>

            <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-955/45 text-xs">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold self-center mr-auto">
                Sent to: {showEmailPreviewModal.email_sent_to}
              </span>
              <button
                onClick={() => setShowEmailPreviewModal(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-250 rounded-lg font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

