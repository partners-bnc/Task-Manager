"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useCrm } from "../context/CrmContext";
import { useToast } from "../context/ToastContext";
import {
  Mail,
  Plus,
  Trash2,
  Play,
  Pause,
  Clock,
  Users,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Eye,
  Settings,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  X,
  FileText,
  UserX,
  Megaphone,
  Trello,
  LayoutGrid,
  Table,
  Home,
} from "lucide-react";

export default function CampaignsPage() {
  const {
    leads,
    campaigns,
    addCampaign,
    deleteCampaign,
    currentUser,
    refreshCrmData,
  } = useCrm();

  const { toast } = useToast();

  // Navigation / View states
  const [activeTab, setActiveTab] = useState("list"); // 'list', 'wizard', 'detail'
  const [campaignViewMode, setCampaignViewMode] = useState("card"); // 'table', 'card', 'kanban'
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [selectedCampaignDetail, setSelectedCampaignDetail] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [recipientsSearch, setRecipientsSearch] = useState("");
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Email Templates
  const [templates, setTemplates] = useState([]);

  // Wizard state
  const [step, setStep] = useState(1);
  const [wizardName, setWizardName] = useState("");
  const [wizardType, setWizardType] = useState("Email");
  // Filters
  const [filterSources, setFilterSources] = useState([]);
  const [filterStatuses, setFilterStatuses] = useState([]);
  const [filterPriorities, setFilterPriorities] = useState([]);
  const [filterCategories, setFilterCategories] = useState([]);
  const [filterTags, setFilterTags] = useState("");
  // Template & Schedule
  const [wizardTemplateId, setWizardTemplateId] = useState("");
  const [wizardSendImmediately, setWizardSendImmediately] = useState(true);
  const [wizardDate, setWizardDate] = useState("");
  const [wizardTime, setWizardTime] = useState("");

  // Load Templates
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

  // Fetch campaign detail when selected campaign changes
  useEffect(() => {
    if (!selectedCampaignId) return;

    async function loadCampaignDetail() {
      setIsLoadingDetail(true);
      try {
        const res = await fetch(`/other-modules/crm/api/campaigns?id=${selectedCampaignId}`);
        if (res.ok) {
          const data = await res.json();
          setSelectedCampaignDetail(data.campaign);
          setRecipients(data.recipients || []);
        }
      } catch (err) {
        console.error("Failed to load campaign detail:", err);
        toast.error("Failed to load campaign statistics.");
      } finally {
        setIsLoadingDetail(false);
      }
    }

    loadCampaignDetail();
  }, [selectedCampaignId, toast]);

  // Unique filter values derived dynamically from current leads list
  const uniqueSources = useMemo(() => [...new Set(leads.map((l) => l.lead_source).filter(Boolean))], [leads]);
  const uniqueStatuses = useMemo(() => [...new Set(leads.map((l) => l.lead_status).filter(Boolean))], [leads]);
  const uniquePriorities = useMemo(() => [...new Set(leads.map((l) => l.priority).filter(Boolean))], [leads]);
  const uniqueCategories = useMemo(() => [...new Set(leads.map((l) => l.lead_category).filter(Boolean))], [leads]);

  // Real-time matched leads selector based on wizard criteria
  const matchedLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Exclude leads with no email
      if (!lead.email) return false;

      // Source filter
      if (filterSources.length > 0 && !filterSources.includes(lead.lead_source)) return false;
      // Status filter
      if (filterStatuses.length > 0 && !filterStatuses.includes(lead.lead_status)) return false;
      // Priority filter
      if (filterPriorities.length > 0 && !filterPriorities.includes(lead.priority)) return false;
      // Category filter
      if (filterCategories.length > 0 && !filterCategories.includes(lead.lead_category)) return false;

      // Tags filter
      if (filterTags.trim()) {
        const filterTag = filterTags.trim().toLowerCase();
        const leadTags = String(lead.tags || "").toLowerCase();
        if (!leadTags.includes(filterTag)) return false;
      }

      return true;
    });
  }, [leads, filterSources, filterStatuses, filterPriorities, filterCategories, filterTags]);

  const selectedTemplate = useMemo(() => {
    if (!wizardTemplateId) return null;
    return templates.find((t) => String(t.id) === String(wizardTemplateId));
  }, [wizardTemplateId, templates]);

  // Handle Launch Campaign
  const handleLaunch = async (status = "Running") => {
    if (!wizardName.trim()) {
      toast.error("Please enter a campaign name.");
      return;
    }
    if (!wizardTemplateId) {
      toast.error("Please select an email template.");
      return;
    }

    const scheduledAt = wizardSendImmediately
      ? null
      : new Date(`${wizardDate}T${wizardTime || "12:00"}`).toISOString();

    const targetFilter = {};
    if (filterSources.length > 0) targetFilter.lead_source = filterSources;
    if (filterStatuses.length > 0) targetFilter.lead_status = filterStatuses;
    if (filterPriorities.length > 0) targetFilter.priority = filterPriorities;
    if (filterCategories.length > 0) targetFilter.lead_category = filterCategories;
    if (filterTags.trim()) targetFilter.tags = filterTags.trim();

    const templateId = Number(wizardTemplateId);
    if (!Number.isInteger(templateId) || templateId <= 0) {
      toast.error("Please select a valid saved email template.");
      return;
    }

    const payload = {
      campaign_name: wizardName,
      campaign_type: wizardType,
      template_id: templateId,
      target_filter: targetFilter,
      status: scheduledAt ? "Scheduled" : status,
      scheduled_at: scheduledAt,
      created_by: currentUser.name || "System",
    };

    try {
      await addCampaign(payload);
      toast.success(scheduledAt ? "Campaign Scheduled Successfully!" : "Campaign Launched Successfully!");
      
      // Reset Wizard States
      setWizardName("");
      setFilterSources([]);
      setFilterStatuses([]);
      setFilterPriorities([]);
      setFilterCategories([]);
      setFilterTags("");
      setWizardTemplateId("");
      setWizardSendImmediately(true);
      setStep(1);
      
      setActiveTab("list");
      refreshCrmData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create campaign.");
    }
  };

  // Quick Action: Unsubscribe Lead from current and future campaigns
  const handleUnsubscribe = async (recipient) => {
    try {
      const res = await fetch("/other-modules/crm/api/campaigns/recipients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_id: recipient.recipient_id,
          unsubscribed: true,
        }),
      });

      if (res.ok) {
        toast.success(`${recipient.lead?.full_name || "Lead"} unsubscribed successfully.`);
        // Update local detail state
        setRecipients((prev) =>
          prev.map((r) =>
            r.recipient_id === recipient.recipient_id
              ? { ...r, unsubscribed: true, unsubscribed_at: new Date().toISOString() }
              : r
          )
        );
        
        // Refresh campaign details
        const detailsRes = await fetch(`/other-modules/crm/api/campaigns?id=${selectedCampaignId}`);
        if (detailsRes.ok) {
          const detailsData = await detailsRes.json();
          setSelectedCampaignDetail(detailsData.campaign);
        }
      } else {
        toast.error("Failed to unsubscribe lead.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to unsubscribe lead.");
    }
  };

  // Filter recipients list by search query
  const filteredRecipients = useMemo(() => {
    return recipients.filter((r) => {
      const name = r.lead?.full_name || "";
      const email = r.email_sent_to || "";
      const query = recipientsSearch.toLowerCase();
      return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
    });
  }, [recipients, recipientsSearch]);

  // Statistics calculation helpers
  const stats = useMemo(() => {
    if (!selectedCampaignDetail) return { openRate: 0, clickRate: 0, bounceRate: 0 };
    const sent = selectedCampaignDetail.sent_count || 0;
    const opened = selectedCampaignDetail.opened_count || 0;
    const clicked = selectedCampaignDetail.clicked_count || 0;
    const bounced = selectedCampaignDetail.bounced_count || 0;

    return {
      openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
      clickRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
      bounceRate: sent > 0 ? Math.round((bounced / sent) * 100) : 0,
    };
  }, [selectedCampaignDetail]);

  // Get status color badges for campaigns list
  const getCampaignStatusColor = (status) => {
    switch (status) {
      case "Draft":
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700";
      case "Scheduled":
        return "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/40";
      case "Running":
        return "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/40";
      case "Completed":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-250 dark:border-emerald-800/40";
      case "Paused":
        return "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-850";
      default:
        return "bg-slate-100 text-slate-750";
    }
  };

  const getRecipientStatusColor = (r) => {
    if (r.unsubscribed) return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-450 dark:border-rose-800/30";
    switch (r.delivery_status) {
      case "Pending":
        return "bg-slate-100 text-slate-650 border-slate-200 dark:bg-slate-800 dark:text-slate-400";
      case "Sent":
        return "bg-blue-50 text-blue-700 border-blue-150 dark:bg-blue-900/20 dark:text-blue-400";
      case "Opened":
        return "bg-emerald-50 text-emerald-700 border-emerald-150 dark:bg-emerald-900/20 dark:text-emerald-400";
      case "Clicked":
        return "bg-violet-50 text-violet-750 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400";
      case "Bounced":
        return "bg-amber-50 text-amber-750 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div className="p-6 text-slate-800 dark:text-slate-150 transition-colors duration-300 h-full overflow-y-auto bg-slate-50 dark:bg-slate-900 font-sans">
      
      {/* HEADER ROW */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-start gap-3">
          <Megaphone size={38} className="text-[#6057DA] stroke-[1.8] shrink-0 mt-0.5" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight dark:text-white bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent leading-none">Campaigns</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1.5">
              Build target filters, preview templates, and launch email campaigns.
            </p>
          </div>
        </div>
        
        {activeTab === "list" && (
          <button
            onClick={() => {
              setStep(1);
              setActiveTab("wizard");
            }}
            className="px-6 bg-[#6057DA] hover:bg-[#4E46C8] text-white text-[13px] font-semibold rounded-full shadow-sm inline-flex items-center gap-2 transition-all active:scale-[0.98] h-[40px]"
          >
            <Plus size={16} />
            <span>Create Campaign</span>
          </button>
        )}

        {activeTab !== "list" && (
          <button
            onClick={() => {
              setSelectedCampaignId(null);
              setSelectedCampaignDetail(null);
              setRecipients([]);
              setActiveTab("list");
            }}
            className="px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 text-[13px] font-semibold text-slate-800 dark:text-slate-200 rounded-full inline-flex items-center gap-1.5 transition-colors h-[40px] cursor-pointer focus:outline-none"
          >
            <ArrowLeft size={15} />
            <span>Back to Campaigns</span>
          </button>
        )}
      </div>

      {/* ════ TAB VIEW SWITCHER ════ */}
      {activeTab === "list" && (
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="flex gap-4">
            {[
              { id: 'table', label: 'Table View', icon: Table },
              { id: 'card', label: 'Card View', icon: LayoutGrid },
              { id: 'kanban', label: 'Kanban View', icon: Trello }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = campaignViewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCampaignViewMode(tab.id)}
                  className={`py-3 px-1.5 text-sm font-semibold inline-flex items-center gap-2 transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                    active 
                      ? 'border-[#6057DA] text-[#6057DA] dark:border-[#7C74F0] dark:text-[#7C74F0]' 
                      : 'border-transparent text-slate-505 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* FLOW 1: CAMPAIGN CREATION WIZARD */}
      {activeTab === "wizard" && (
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-lg overflow-hidden">
          {/* Stepper Wizard Indicator */}
          <div className="bg-slate-50 dark:bg-slate-950 p-5 border-b border-slate-200 dark:border-slate-850 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Step {step} of 4
            </span>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-2 w-12 rounded-full transition-all duration-300 ${
                    s <= step ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-800"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* STEP 1: SETUP DETAILS */}
            {step === 1 && (
              <div className="space-y-4 max-w-lg mx-auto">
                <div className="text-center pb-2">
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Setup Campaign Basics</h3>
                  <p className="text-xs text-slate-400 mt-1">Provide a recognizable name and choose your distribution channel.</p>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase">Campaign Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Q3 Outreach - CA Tech Leads"
                    value={wizardName}
                    onChange={(e) => setWizardName(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase">Campaign Type</label>
                  <select
                    value={wizardType}
                    onChange={(e) => setWizardType(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="Email">Email Template Send</option>
                    <option value="SMS">SMS Message (Coming Soon)</option>
                    <option value="WhatsApp">WhatsApp Message (Coming Soon)</option>
                  </select>
                </div>
              </div>
            )}

            {/* STEP 2: TARGET LEADS FILTER */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="text-center pb-2">
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Filter Target Leads</h3>
                  <p className="text-xs text-slate-400 mt-1">Dynamically filter contacts matching specific fields. Excludes unsubscribed automatically.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Filters selector */}
                  <div className="md:col-span-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Filter Options</h4>

                    {/* Source filter */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-450 uppercase">Lead Source</label>
                      <div className="max-h-24 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-white dark:bg-slate-900 space-y-1">
                        {uniqueSources.map(src => (
                          <label key={src} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-350 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filterSources.includes(src)}
                              onChange={(e) => {
                                if (e.target.checked) setFilterSources(prev => [...prev, src]);
                                else setFilterSources(prev => prev.filter(v => v !== src));
                              }}
                              className="rounded text-blue-500 border-slate-200"
                            />
                            {src}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Status filter */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-450 uppercase">Lead Status</label>
                      <div className="max-h-24 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-white dark:bg-slate-900 space-y-1">
                        {uniqueStatuses.map(status => (
                          <label key={status} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-350 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filterStatuses.includes(status)}
                              onChange={(e) => {
                                if (e.target.checked) setFilterStatuses(prev => [...prev, status]);
                                else setFilterStatuses(prev => prev.filter(v => v !== status));
                              }}
                              className="rounded text-blue-500 border-slate-200"
                            />
                            {status}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Priority filter */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-450 uppercase">Lead Priority</label>
                      <div className="max-h-24 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-white dark:bg-slate-900 space-y-1">
                        {uniquePriorities.map(prio => (
                          <label key={prio} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-350 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filterPriorities.includes(prio)}
                              onChange={(e) => {
                                if (e.target.checked) setFilterPriorities(prev => [...prev, prio]);
                                else setFilterPriorities(prev => prev.filter(v => v !== prio));
                              }}
                              className="rounded text-blue-500 border-slate-200"
                            />
                            {prio}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Tag filter */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-450 uppercase">Tags contain</label>
                      <input
                        type="text"
                        placeholder="e.g. tech, referral"
                        value={filterTags}
                        onChange={(e) => setFilterTags(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none text-xs"
                      />
                    </div>
                  </div>

                  {/* Matched Preview */}
                  <div className="md:col-span-7 flex flex-col border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden h-[340px] bg-white dark:bg-slate-950">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-350">Matched Lead List</span>
                      <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-400">
                        {matchedLeads.length} enrolled
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
                      {matchedLeads.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4">
                          <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                          <p className="text-xs text-slate-400">No leads match the selected criteria.</p>
                        </div>
                      ) : (
                        matchedLeads.map(lead => (
                          <div key={lead.lead_id} className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-900/80 bg-slate-50/30 dark:bg-slate-900/30 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-150 truncate">{lead.full_name}</h5>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{lead.email}</p>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 border rounded px-1.5 py-0.5 uppercase tracking-wider shrink-0 bg-white dark:bg-slate-950">
                              {lead.priority || "Medium"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: TEMPLATE & SCHEDULE */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="text-center pb-2">
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Template & Schedule</h3>
                  <p className="text-xs text-slate-400 mt-1">Select your outreach template and specify launching details.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Settings Column */}
                  <div className="md:col-span-5 space-y-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase">Email Template *</label>
                      <select
                        value={wizardTemplateId}
                        onChange={(e) => setWizardTemplateId(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-1 focus:ring-blue-500 outline-none"
                        required
                      >
                        <option value="">Select a template...</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3 border-t border-slate-100 dark:border-slate-850 pt-4">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={wizardSendImmediately}
                          onChange={(e) => setWizardSendImmediately(e.target.checked)}
                          className="rounded text-blue-500 border-slate-200 focus:ring-blue-500"
                        />
                        Send immediately on launch
                      </label>

                      {!wizardSendImmediately && (
                        <div className="grid grid-cols-2 gap-2 pl-6 animate-fade-in">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Scheduled Date</label>
                            <input
                              type="date"
                              value={wizardDate}
                              onChange={(e) => setWizardDate(e.target.value)}
                              className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none text-xs"
                              required={!wizardSendImmediately}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Scheduled Time</label>
                            <input
                              type="time"
                              value={wizardTime}
                              onChange={(e) => setWizardTime(e.target.value)}
                              className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none text-xs"
                              required={!wizardSendImmediately}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Template Preview Column */}
                  <div className="md:col-span-7 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950 flex flex-col h-[300px]">
                    <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-350">Template Preview</span>
                      <span className="text-[10px] text-slate-450 dark:text-slate-550 italic font-semibold">Variables: Name, Company, Agent</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {selectedTemplate ? (
                        <div className="space-y-2 text-xs">
                          <div>
                            <strong className="text-slate-500 dark:text-slate-450 uppercase text-[9px] block">Subject</strong>
                            <p className="text-slate-850 dark:text-slate-150 font-bold bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-850">{selectedTemplate.subject}</p>
                          </div>
                          <div>
                            <strong className="text-slate-500 dark:text-slate-450 uppercase text-[9px] block">Body Preview</strong>
                            <pre className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-850 text-[11px] font-mono text-slate-650 dark:text-slate-350 whitespace-pre-wrap max-h-36 overflow-y-auto">
                              {selectedTemplate.plain_text_body || selectedTemplate.html_body}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4">
                          <Eye className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                          <p className="text-xs text-slate-400">Select a template to view the design preview.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW & LAUNCH */}
            {step === 4 && (
              <div className="space-y-6 max-w-xl mx-auto">
                <div className="text-center">
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Review Campaign Details</h3>
                  <p className="text-xs text-slate-400 mt-1">Make sure everything is correct before launching.</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Campaign Name</span>
                      <strong className="text-slate-800 dark:text-slate-150 text-sm">{wizardName}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Type</span>
                      <strong className="text-slate-800 dark:text-slate-150 text-sm">{wizardType}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Selected Template</span>
                      <strong className="text-slate-800 dark:text-slate-150">{selectedTemplate?.name || "None"}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Timing / Launch</span>
                      <strong className="text-slate-850 dark:text-slate-150">
                        {wizardSendImmediately
                          ? "Send Immediately on Launch"
                          : `Scheduled: ${wizardDate} at ${wizardTime}`}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Target Filters Applied</span>
                    <div className="flex flex-wrap gap-1.5">
                      {filterSources.length > 0 && (
                        <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] dark:bg-slate-800 dark:text-slate-350">
                          Source: {filterSources.join(", ")}
                        </span>
                      )}
                      {filterStatuses.length > 0 && (
                        <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] dark:bg-slate-800 dark:text-slate-350">
                          Status: {filterStatuses.join(", ")}
                        </span>
                      )}
                      {filterPriorities.length > 0 && (
                        <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] dark:bg-slate-800 dark:text-slate-350">
                          Priority: {filterPriorities.join(", ")}
                        </span>
                      )}
                      {filterTags.trim() && (
                        <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] dark:bg-slate-800 dark:text-slate-350">
                          Tags contain: {filterTags}
                        </span>
                      )}
                      {filterSources.length === 0 && filterStatuses.length === 0 && filterPriorities.length === 0 && !filterTags.trim() && (
                        <span className="text-slate-450 italic">All leads with email addresses selected.</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/40 text-center">
                    <span className="text-[10px] text-blue-500 uppercase font-bold block mb-0.5">Enrolled Recipients</span>
                    <strong className="text-blue-700 dark:text-blue-450 text-xl font-black">{matchedLeads.length} leads</strong>
                    <p className="text-[10px] text-slate-400 mt-1">This campaign will create {matchedLeads.length} new communication logs.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stepper Buttons footer */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-200 dark:border-slate-850 flex justify-between items-center">
            <button
              onClick={() => {
                if (step > 1) setStep(step - 1);
                else setActiveTab("list");
              }}
              className="px-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-[13px] font-semibold text-slate-800 dark:text-slate-200 rounded-full inline-flex items-center gap-1.5 transition-colors h-[40px] cursor-pointer focus:outline-none"
            >
              <ArrowLeft size={15} /> <span>Back</span>
            </button>

            {step < 4 ? (
              <button
                onClick={() => {
                  if (step === 1 && !wizardName.trim()) {
                    toast.error("Please enter a campaign name.");
                    return;
                  }
                  if (step === 3 && !wizardTemplateId) {
                    toast.error("Please select a template.");
                    return;
                  }
                  setStep(step + 1);
                }}
                className="px-6 bg-[#6057DA] hover:bg-[#4E46C8] text-white text-[13px] font-semibold rounded-full shadow-sm inline-flex items-center gap-1.5 transition-all active:scale-[0.98] h-[40px]"
              >
                <span>Next</span> <ArrowRight size={15} />
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => handleLaunch("Draft")}
                  className="px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-250 text-[13px] font-semibold rounded-full transition h-[40px]"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => handleLaunch("Running")}
                  className="px-6 bg-[#6057DA] hover:bg-[#4E46C8] text-white text-[13px] font-semibold rounded-full shadow-sm inline-flex items-center gap-1.5 transition-all active:scale-[0.98] h-[40px]"
                >
                  <CheckCircle size={15} /> <span>Launch Campaign</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLOW 2: DETAILED CAMPAIGN ANALYTICS & RECIPIENTS VIEW */}
      {activeTab === "detail" && (
        <div className="space-y-6">
          {isLoadingDetail || !selectedCampaignDetail ? (
            <div className="flex items-center justify-center p-12 bg-white dark:bg-slate-950 border rounded-2xl animate-pulse">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-xs text-slate-400">Loading campaign performance metrics...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Campaign Meta Overview */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-semibold px-2 py-0.5 border rounded-full uppercase tracking-wider ${getCampaignStatusColor(selectedCampaignDetail.status)}`}>
                      {selectedCampaignDetail.status}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase">
                      {selectedCampaignDetail.campaign_type} Broadcast
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-white mt-1.5">
                    {selectedCampaignDetail.campaign_name}
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Template: <span className="font-semibold text-slate-750 dark:text-slate-350">{selectedCampaignDetail.template?.name || "Deleted template"}</span> • Created by: {selectedCampaignDetail.created_by}
                  </p>
                </div>
                
                <div className="text-left md:text-right text-xs shrink-0 text-slate-500 dark:text-slate-450 border-t md:border-t-0 border-slate-100 dark:border-slate-850 pt-3 md:pt-0">
                  <div><span className="font-medium text-slate-400 mr-1">Launched:</span> {selectedCampaignDetail.launched_at ? new Date(selectedCampaignDetail.launched_at).toLocaleString() : "Not launched"}</div>
                  {selectedCampaignDetail.completed_at && (
                    <div><span className="font-medium text-slate-400 mr-1">Completed:</span> {new Date(selectedCampaignDetail.completed_at).toLocaleString()}</div>
                  )}
                  {selectedCampaignDetail.scheduled_at && !selectedCampaignDetail.launched_at && (
                    <div><span className="font-medium text-slate-400 mr-1">Scheduled for:</span> {new Date(selectedCampaignDetail.scheduled_at).toLocaleString()}</div>
                  )}
                </div>
              </div>

              {/* Stats Counters Grid */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs text-center">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase block">Total Enrolled</span>
                  <span className="text-slate-800 dark:text-white text-lg font-semibold mt-1 block">{selectedCampaignDetail.total_recipients || 0}</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs text-center">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase block">Sent</span>
                  <span className="text-slate-800 dark:text-white text-lg font-semibold mt-1 block">{selectedCampaignDetail.sent_count || 0}</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs text-center">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase block">Delivered</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-lg font-semibold mt-1 block">{selectedCampaignDetail.delivered_count || 0}</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs text-center">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase block">Opened (Rate)</span>
                  <span className="text-[#6057DA] dark:text-[#7C74F0] text-lg font-semibold mt-1 block">
                    {selectedCampaignDetail.opened_count || 0} ({stats.openRate}%)
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs text-center">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase block">Clicked (CTR)</span>
                  <span className="text-violet-600 dark:text-violet-400 text-lg font-semibold mt-1 block">
                    {selectedCampaignDetail.clicked_count || 0} ({stats.clickRate}%)
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs text-center">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase block">Bounced (Rate)</span>
                  <span className="text-rose-500 dark:text-rose-400 text-lg font-semibold mt-1 block">
                    {selectedCampaignDetail.bounced_count || 0} ({stats.bounceRate}%)
                  </span>
                </div>
              </div>

              {/* Recipients list */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-50/40 dark:bg-slate-900/10">
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-350 uppercase tracking-widest shrink-0">
                    Recipient Delivery Logs
                  </h3>
                  
                  <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search recipients name or email..."
                      value={recipientsSearch}
                      onChange={(e) => setRecipientsSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/30 dark:bg-slate-900/30 text-slate-450 dark:text-slate-500 font-semibold uppercase border-b border-slate-100 dark:border-slate-800/80">
                        <th className="p-3.5 pl-5">Lead Name</th>
                        <th className="p-3.5">Email Sent To</th>
                        <th className="p-3.5">Lead Priority</th>
                        <th className="p-3.5">Delivery Status</th>
                        <th className="p-3.5 text-right pr-5">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850/60 font-medium">
                      {filteredRecipients.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400">
                            No recipients found.
                          </td>
                        </tr>
                      ) : (
                        filteredRecipients.map((r) => (
                          <tr key={r.recipient_id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/20 transition-colors">
                            <td className="p-3.5 pl-5">
                              <span className="font-medium text-slate-850 dark:text-slate-150">
                                {r.lead?.full_name || "Unknown Lead"}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-500 dark:text-slate-400">{r.email_sent_to}</td>
                            <td className="p-3.5">
                              <span className="bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-2.5 py-0.5 text-[10px] uppercase font-medium dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                                {r.lead?.priority || "Medium"}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getRecipientStatusColor(r)}`}>
                                {r.unsubscribed ? "Unsubscribed" : r.delivery_status}
                              </span>
                            </td>
                            <td className="p-3.5 text-right pr-5">
                              {!r.unsubscribed ? (
                                <button
                                  onClick={() => handleUnsubscribe(r)}
                                  className="text-[10px] font-semibold px-3 py-1.5 text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100/70 border border-red-100 hover:border-red-200 rounded-full dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30 transition-colors inline-flex items-center gap-1"
                                  title="Stop future communications to this contact"
                                >
                                  <UserX className="w-3.5 h-3.5" /> Unsubscribe
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Excluded</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* DEFAULT CAMPAIGNS LIST VIEW */}
      {activeTab === "list" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-450 dark:text-slate-550 font-bold mb-1">
            <span>List of Campaigns ({campaigns.length})</span>
          </div>

          {campaigns.length === 0 ? (
            <div className="bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-2xl p-12 text-center shadow-xs">
              <Mail className="w-10 h-10 text-slate-305 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-750 dark:text-slate-250">No Campaigns Yet</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Start dynamic marketing broadcasts. Create your first campaign to filter leads, apply template variables, and track deliveries.
              </p>
              <button
                onClick={() => {
                  setStep(1);
                  setActiveTab("wizard");
                }}
                className="px-6 bg-[#6057DA] hover:bg-[#4E46C8] text-white text-[13px] font-semibold rounded-full shadow-sm inline-flex items-center gap-2 transition-all active:scale-[0.98] h-[40px] mt-4"
              >
                <Plus size={16} />
                <span>Create Campaign</span>
              </button>
            </div>
          ) : (
            <>
              {/* 1. TABLE STRUCTURE — Matches ManageTasks grid table */}
              {campaignViewMode === "table" && (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm bg-white dark:bg-slate-900">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                        <th className="py-3 px-4 font-medium text-slate-900 dark:text-slate-200 text-[14px]">Campaign</th>
                        <th className="py-3 px-4 font-medium text-slate-900 dark:text-slate-200 text-[14px] w-36">Status</th>
                        <th className="py-3 px-4 font-medium text-slate-900 dark:text-slate-200 text-[14px] w-28">Type</th>
                        <th className="py-3 px-4 font-medium text-slate-900 dark:text-slate-200 text-[14px] w-32 text-center">Recipients</th>
                        <th className="py-3 px-4 font-medium text-slate-900 dark:text-slate-200 text-[14px] w-40">Performance</th>
                        <th className="py-3 px-4 font-medium text-slate-900 dark:text-slate-200 text-[14px] w-36">Created</th>
                        <th className="py-3 px-4 font-medium text-slate-900 dark:text-slate-200 text-[14px] w-36 text-center">Visible</th>
                      </tr>
                    </thead>
                    <tbody className="text-[14px] font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
                      {campaigns.map((camp, index) => {
                        const total = camp.total_recipients || 0;
                        const sent = camp.sent_count || 0;
                        const opened = camp.opened_count || 0;
                        const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
                        const dateStr = new Date(camp.created_at).toLocaleDateString();

                        return (
                          <tr
                            key={camp.campaign_id ?? camp.id ?? index}
                            className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors border-b border-slate-200 dark:border-slate-700"
                          >
                            <td className="py-1.5 px-4 border border-slate-200 dark:border-slate-700">
                              <span className="text-[14px] font-medium text-slate-900 dark:text-white">{camp.campaign_name}</span>
                            </td>
                            <td className="py-1.5 px-4 border border-slate-200 dark:border-slate-700">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${getCampaignStatusColor(camp.status)}`}>
                                {camp.status}
                              </span>
                            </td>
                            <td className="py-1.5 px-4 border border-slate-200 dark:border-slate-700 text-[14px] font-medium text-slate-600 dark:text-slate-400">
                              {camp.campaign_type || "Email"}
                            </td>
                            <td className="py-1.5 px-4 border border-slate-200 dark:border-slate-700 text-center text-[14px] font-medium">
                              {total}
                            </td>
                            <td className="py-1.5 px-4 border border-slate-200 dark:border-slate-700">
                              {camp.status !== "Draft" ? (
                                <div className="flex items-center gap-2.5">
                                  <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-500 bg-[#6057DA]" style={{ width: `${openRate}%` }} />
                                  </div>
                                  <span className="text-[13px] font-medium text-slate-900 dark:text-slate-200">{openRate}%</span>
                                </div>
                              ) : (
                                <span className="text-[13px] text-slate-400 italic">—</span>
                              )}
                            </td>
                            <td className="py-1.5 px-4 border border-slate-200 dark:border-slate-700 text-[14px] font-medium text-slate-600 dark:text-slate-400">
                              {dateStr}
                            </td>
                            <td className="py-1.5 px-4 border border-slate-200 dark:border-slate-700 text-center">
                              <button
                                onClick={() => {
                                  setSelectedCampaignId(camp.campaign_id);
                                  setActiveTab("detail");
                                }}
                                className="px-4 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 hover:border-slate-350 text-[12px] font-medium text-slate-800 dark:text-slate-200 rounded-full shadow-sm inline-flex items-center gap-2 transition-all active:scale-[0.97] whitespace-nowrap cursor-pointer"
                              >
                                <Eye size={15} className="stroke-[1.8]" />
                                <span>View Details</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 2. CARD STRUCTURE — Matches ManageTasks card view */}
              {campaignViewMode === "card" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {campaigns.map((camp, index) => {
                    const total = camp.total_recipients || 0;
                    const sent = camp.sent_count || 0;
                    const opened = camp.opened_count || 0;
                    const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
                    const dateStr = new Date(camp.created_at).toLocaleDateString();

                    return (
                      <div
                        key={camp.campaign_id ?? camp.id ?? index}
                        onClick={() => {
                          setSelectedCampaignId(camp.campaign_id);
                          setActiveTab("detail");
                        }}
                        className="relative bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-transparent hover:border-[#6057DA]/25 dark:hover:border-[#7C74F0]/25 transition-all hover:shadow-md group cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-wrap gap-2">
                            <span className={`px-3 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${getCampaignStatusColor(camp.status)}`}>
                              {camp.status}
                            </span>
                            <span className="px-3 py-1 rounded text-[10px] uppercase font-bold tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {camp.campaign_type || "Email"}
                            </span>
                          </div>
                        </div>

                        <h3 className="font-medium text-[14px] text-slate-900 dark:text-white mb-2 group-hover:text-[#6057DA] dark:group-hover:text-[#7C74F0] group-hover:underline transition-colors">
                          {camp.campaign_name}
                        </h3>
                        <p className="text-xs text-slate-400 mb-4 font-semibold">
                          Template: {camp.template?.name || "Plain/Unknown"}
                        </p>

                        <div className="mb-6">
                          <div className="flex justify-between items-center text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                            <span className="font-headline text-[1.35rem] font-light tracking-[0.02em] text-slate-800 dark:text-slate-200">
                              {total} Recipients
                            </span>
                            {camp.status !== "Draft" && (
                              <div className="flex items-center text-[#6057DA] gap-1 bg-[#6057DA]/10 px-2 py-0.5 rounded-full text-[11px] font-bold">
                                {openRate}% opened
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mb-6">
                          <div className="flex justify-between items-center text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                            <span>Campaign Performance</span>
                            <span>{openRate}%</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2">
                            <div
                              className="bg-[#6057DA] h-2 rounded-full transition-all duration-500"
                              style={{ width: `${openRate}%` }}
                            />
                          </div>
                        </div>

                        <div className="border-t border-gray-100 dark:border-slate-800 pt-4 flex justify-between items-end">
                          <div className="text-right">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                              <div className="text-slate-400 font-medium">Created</div>
                              <div className="text-slate-800 dark:text-slate-200 font-semibold">{dateStr}</div>
                              <div className="text-slate-400 font-medium">Sent</div>
                              <div className="text-slate-800 dark:text-slate-200 font-semibold">{sent} / {total}</div>
                            </div>
                          </div>
                          <span className="text-[#6057DA] dark:text-[#7C74F0] font-semibold text-xs flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                            Analytics <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 3. KANBAN STRUCTURE — Matches ManageTasks kanban board */}
              {campaignViewMode === "kanban" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { key: 'Draft', statuses: ['Draft', 'Paused'], label: 'Drafts & Paused', pillColor: 'bg-[#344054]' },
                    { key: 'Running', statuses: ['Scheduled', 'Running'], label: 'Active', pillColor: 'bg-[#0070c0]' },
                    { key: 'Completed', statuses: ['Completed'], label: 'Completed', pillColor: 'bg-[#039855]' }
                  ].map((column) => {
                    const columnCampaigns = campaigns.filter(c => column.statuses.includes(c.status));
                    return (
                      <div key={column.key} className="rounded-[24px] border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/30 p-4 flex flex-col min-h-[500px]">
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <span className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm ${column.pillColor}`}>
                            {column.label}
                          </span>
                          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-6 h-6 flex items-center justify-center rounded-full shadow-sm">
                            {columnCampaigns.length}
                          </span>
                        </div>

                        <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                          {columnCampaigns.map((camp, index) => {
                            const total = camp.total_recipients || 0;
                            const sent = camp.sent_count || 0;
                            const opened = camp.opened_count || 0;
                            const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
                            const dateStr = new Date(camp.created_at).toLocaleDateString();

                            return (
                              <div
                                key={camp.campaign_id ?? camp.id ?? index}
                                onClick={() => {
                                  setSelectedCampaignId(camp.campaign_id);
                                  setActiveTab("detail");
                                }}
                                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 p-4 text-left transition-all duration-200 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer"
                              >
                                {/* Title and arrow */}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-semibold text-slate-800 dark:text-white leading-snug break-words">
                                      {camp.campaign_name}
                                    </h4>
                                  </div>
                                  <ChevronRight size={14} className="mt-0.5 shrink-0 text-slate-400" />
                                </div>

                                {/* Bottom row: pills */}
                                <div className="mt-3.5 flex flex-wrap items-center gap-2.5 text-[11px] text-slate-500">
                                  <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700">
                                    <Mail size={12} className="text-slate-450" />
                                    <span>{camp.campaign_type || "Email"}</span>
                                  </div>
                                  <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700">
                                    <Users size={12} className="text-slate-450" />
                                    <span>{total} leads</span>
                                  </div>
                                  {camp.status !== "Draft" && (
                                    <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5 bg-[#6057DA]/10 text-[#6057DA] dark:text-[#7C74F0] border border-[#6057DA]/15 font-medium">
                                      <span>{openRate}% open</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {columnCampaigns.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-transparent px-4 py-8 text-center text-sm text-slate-400">
                              No campaigns here.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
