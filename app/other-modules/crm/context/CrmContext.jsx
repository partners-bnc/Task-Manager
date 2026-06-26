"use client";

import React, { createContext, useCallback, useContext, useState, useEffect } from "react";
import MOCK_DATA from "../data/mockData.json";

export const MOCK_USERS = {
  admin: { id: "u1", name: "Alice Admin", role: "admin" },
  manager: { id: "u2", name: "Bob Manager", role: "manager" },
  sales: { id: "u3", name: "Charlie Sales", role: "sales" },
  viewer: { id: "u4", name: "Dave Viewer", role: "viewer" },
};

const CrmContext = createContext(null);

// Helper: fetch with fallback
async function fetchOrFallback(url, key, fallback) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("API error");
    const json = await res.json();
    const data = json[key];
    return Array.isArray(data) ? data : fallback;
  } catch {
    return fallback;
  }
}

// Mock fallback data
const MOCK_LEADS = (() => {
  const sources = ["Service Enquiry", "Expert Request", "Voice Requirement", "Partner Registration", "Contact Form"];
  return MOCK_DATA.leads.map((l, i) => ({ ...l, source: sources[i % sources.length] }));
})();

const MOCK_ACTIVITIES = (() => {
  const actionTypes = ['registered', 'logged in', 'profile updated', 'AI profile submitted', 'agreement signed', 'requirement submitted', 'WhatsApp sent', 'email sent', 'call completed', 'admin note added', 'status changed'];
  return MOCK_DATA.activities.map((a, i) => ({ ...a, type: actionTypes[i % actionTypes.length] })).sort((x, y) => new Date(y.date) - new Date(x.date));
})();

const MOCK_FOLLOWUPS = [
  { id: "FWP001", leadId: 1, type: "Service Enquiry", title: "New inquiry from Acme Corp", priority: "High", dueDate: "2026-05-24", dueTime: "10:00 AM", status: "New", assigneeId: "u1", notes: "Inquired about enterprise SLA", created: "May 24, 2026" },
  { id: "FWP002", leadId: 3, type: "Expert Request", title: "Consultation request from Tony Stark", priority: "High", dueDate: "2026-05-24", dueTime: "11:30 AM", status: "In Progress", assigneeId: "u2", notes: "Needs details on integration APIs", created: "May 23, 2026" },
  { id: "FWP003", leadId: 7, type: "Voice Requirement", title: "Cyberdyne voice prompt setup", priority: "Medium", dueDate: "2026-05-25", dueTime: "02:00 PM", status: "New", assigneeId: "u3", notes: "Submitted voice form with strict guidelines", created: "May 24, 2026" },
  { id: "FWP004", leadId: 2, type: "Partner Registration", title: "Review Global Tech partner profile", priority: "Medium", dueDate: "2026-05-22", dueTime: "09:00 AM", status: "Overdue", assigneeId: "u1", notes: "Profile is 60% complete, missing agreement", created: "May 20, 2026" },
  { id: "FWP005", leadId: 4, type: "Contact Form", title: "General inquiry from Bruce Wayne", priority: "Low", dueDate: "2026-05-26", dueTime: "-", status: "New", assigneeId: "u3", notes: "Questions about bulk pricing", created: "May 24, 2026" }
];

export function CrmProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(MOCK_USERS.admin);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  const [leads, setLeads] = useState(MOCK_LEADS);
  const [tasks, setTasks] = useState(MOCK_DATA.tasks);
  const [activities, setActivities] = useState(MOCK_ACTIVITIES);
  const [followups, setFollowups] = useState(MOCK_FOLLOWUPS);
  const [campaigns, setCampaigns] = useState(MOCK_DATA.campaigns || []);
  const [enrollments, setEnrollments] = useState(MOCK_DATA.enrollments || []);
  const [calendarEvents, setCalendarEvents] = useState([]);

  const refreshCrmData = useCallback(async () => {
    const [leadsData, tasksData, followupsData, campaignsData, enrollmentsData, calendarData] = await Promise.all([
      fetchOrFallback("/other-modules/crm/api/leads", "leads", MOCK_LEADS),
      fetchOrFallback("/other-modules/crm/api/tasks", "tasks", MOCK_DATA.tasks),
      fetchOrFallback("/other-modules/crm/api/followups", "followups", MOCK_FOLLOWUPS),
      fetchOrFallback("/other-modules/crm/api/campaigns", "campaigns", MOCK_DATA.campaigns || []),
      fetchOrFallback("/other-modules/crm/api/campaigns/enrollments", "enrollments", MOCK_DATA.enrollments || []),
      fetchOrFallback("/other-modules/crm/api/calendar", "events", []),
    ]);
    setLeads(leadsData);
    setTasks(tasksData);
    setActivities(MOCK_ACTIVITIES);
    setFollowups(followupsData);
    setCampaigns(campaignsData);
    setEnrollments(enrollmentsData);
    setCalendarEvents(calendarData || []);
    setLoading(false);
  }, []);

  // Fetch from APIs on mount
  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshCrmData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshCrmData]);

  // --- Mutation helpers (call API + update local state) ---

  const addActivity = async (newActivity) => {
    setActivities(prev => [newActivity, ...prev]);
  };

  const addFollowup = async (newFollowup) => {
    try {
      const res = await fetch("/other-modules/crm/api/followups", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(newFollowup) 
      });
      if (res.ok) {
        const { followup } = await res.json();
        if (followup) {
          setFollowups(prev => [followup, ...prev]);
          refreshCrmData();
        }
      }
    } catch (e) { console.error("addFollowup API error:", e); }
  };

  const updateFollowup = async (followup_id, updates) => {
    try {
      const res = await fetch("/other-modules/crm/api/followups", { 
        method: "PUT", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ followup_id, ...updates }) 
      });
      if (res.ok) {
        const { followup } = await res.json();
        if (followup) {
          setFollowups(prev => prev.map(f => f.followup_id === followup_id ? followup : f));
          refreshCrmData();
        }
      }
    } catch (e) { console.error("updateFollowup API error:", e); }
  };

  const deleteFollowup = async (followup_id) => {
    try {
      const res = await fetch(`/other-modules/crm/api/followups?followup_id=${followup_id}`, { method: "DELETE" });
      if (res.ok) {
        setFollowups(prev => prev.filter(f => f.followup_id !== followup_id));
        refreshCrmData();
      }
    } catch (e) { console.error("deleteFollowup API error:", e); }
  };

  const addCampaign = async (campaign) => {
    try {
      const res = await fetch("/other-modules/crm/api/campaigns", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(campaign) 
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to create campaign");
      }
      const newCamp = data.campaign;
      if (newCamp) {
        setCampaigns(prev => [newCamp, ...prev]);
        refreshCrmData();
      }
    } catch (e) { console.error("addCampaign API error:", e); throw e; }
  };

  const updateCampaign = async (campaign_id, updates) => {
    try {
      const res = await fetch("/other-modules/crm/api/campaigns", { 
        method: "PUT", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ campaign_id, ...updates }) 
      });
      if (res.ok) {
        const { campaign: updatedCamp } = await res.json();
        if (updatedCamp) {
          setCampaigns(prev => prev.map(c => c.campaign_id === campaign_id ? updatedCamp : c));
          refreshCrmData();
        }
      }
    } catch (e) { console.error("updateCampaign API error:", e); }
  };

  const deleteCampaign = async (campaign_id) => {
    try {
      const res = await fetch(`/other-modules/crm/api/campaigns?campaign_id=${campaign_id}`, { method: "DELETE" });
      if (res.ok) {
        setCampaigns(prev => prev.filter(c => c.campaign_id !== campaign_id));
        refreshCrmData();
      }
    } catch (e) { console.error("deleteCampaign API error:", e); }
  };

  const enrollLead = async (leadId, campaignId) => {
    const newEnrollment = { lead_id: leadId, campaign_id: campaignId, current_step: 1, status: "Active" };
    setEnrollments(prev => [...prev, { id: `ENR-${Date.now()}`, ...newEnrollment, enrolled_at: new Date().toISOString() }]);
    try { await fetch("/other-modules/crm/api/campaigns/enrollments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newEnrollment) }); }
    catch (e) { console.error("enrollLead API error:", e); }
  };

  const updateEnrollment = async (id, updates) => {
    setEnrollments(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    try { await fetch("/other-modules/crm/api/campaigns/enrollments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...updates }) }); }
    catch (e) { console.error("updateEnrollment API error:", e); }
  };

  const updateTask = async (taskId, updates) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    try { await fetch("/other-modules/crm/api/tasks", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: taskId, ...updates }) }); }
    catch (e) { console.error("updateTask API error:", e); }
  };

  const addTask = async (newTask) => {
    setTasks(prev => [newTask, ...prev]);
    try { await fetch("/other-modules/crm/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newTask) }); }
    catch (e) { console.error("addTask API error:", e); }
  };

  const addCalendarEvent = async (newEvent) => {
    try {
      const res = await fetch("/other-modules/crm/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent)
      });
      if (res.ok) {
        const { event } = await res.json();
        if (event) {
          setCalendarEvents(prev => [...prev, event]);
          refreshCrmData();
        }
      }
    } catch (e) { console.error("addCalendarEvent API error:", e); }
  };

  const updateCalendarEvent = async (event_id, updates) => {
    try {
      const res = await fetch("/other-modules/crm/api/calendar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id, ...updates })
      });
      if (res.ok) {
        const { event } = await res.json();
        if (event) {
          setCalendarEvents(prev => prev.map(e => e.event_id === event_id ? event : e));
          refreshCrmData();
        }
      }
    } catch (e) { console.error("updateCalendarEvent API error:", e); }
  };

  const deleteCalendarEvent = async (event_id) => {
    try {
      const res = await fetch(`/other-modules/crm/api/calendar?event_id=${event_id}`, { method: "DELETE" });
      if (res.ok) {
        setCalendarEvents(prev => prev.filter(e => e.event_id !== event_id));
        refreshCrmData();
      }
    } catch (e) { console.error("deleteCalendarEvent API error:", e); }
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("crm-theme", next ? "dark" : "light");
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  };
  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);

  useEffect(() => {
    const stored = localStorage.getItem("crm-theme");
    if (stored === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);

  // RBAC helpers
  const canManageSystemSettings = currentUser.role === "admin";
  const canManageEmailTemplates = currentUser.role === "admin";
  const canDeleteLeads = ["admin", "manager"].includes(currentUser.role);
  const isReadOnly = currentUser.role === "viewer";

  return (
    <CrmContext.Provider
      value={{
        currentUser,
        isDarkMode,
        toggleDarkMode,
        isSidebarCollapsed,
        toggleSidebar,
        loading,
        tasks,
        setTasks,
        updateTask,
        addTask,
        activities,
        setActivities,
        addActivity,
        followups,
        setFollowups,
        addFollowup,
        updateFollowup,
        deleteFollowup,
        campaigns,
        setCampaigns,
        addCampaign,
        updateCampaign,
        deleteCampaign,
        enrollments,
        setEnrollments,
        enrollLead,
        updateEnrollment,
        leads,
        setLeads,
        calendarEvents,
        setCalendarEvents,
        addCalendarEvent,
        updateCalendarEvent,
        deleteCalendarEvent,
        refreshCrmData,
        permissions: {
          canManageSystemSettings,
          canManageEmailTemplates,
          canDeleteLeads,
          isReadOnly,
        },
      }}
    >
      <div className={isDarkMode ? "dark" : ""}>{children}</div>
    </CrmContext.Provider>
  );
}

export function useCrm() {
  const context = useContext(CrmContext);
  if (!context) {
    throw new Error("useCrm must be used within a CrmProvider");
  }
  return context;
}
