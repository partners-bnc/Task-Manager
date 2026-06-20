import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const [leadsRes, tasksRes, activitiesRes, followupsRes, customersRes] = await Promise.all([
      supabase.from("crm_leads").select("status, value"),
      supabase.from("crm_tasks").select("status"),
      supabase.from("crm_activities").select("id, type, date, subject").order("date", { ascending: false }).limit(5),
      supabase.from("crm_followups").select("status"),
      supabase.from("crm_customers").select("id"),
    ]);

    const leads = leadsRes.data || [];
    const tasks = tasksRes.data || [];
    const followups = followupsRes.data || [];

    // Lead counts by status
    const leadsByStatus = {};
    leads.forEach(l => { leadsByStatus[l.status] = (leadsByStatus[l.status] || 0) + 1; });

    // Parse dollar values for revenue calculations
    const parseValue = (v) => Number((v || "").replace(/[^0-9.]/g, "")) || 0;
    const pipelineValue = leads.filter(l => !["Won", "Lost"].includes(l.status)).reduce((sum, l) => sum + parseValue(l.value), 0);
    const wonRevenue = leads.filter(l => l.status === "Won").reduce((sum, l) => sum + parseValue(l.value), 0);

    // Tasks by status
    const tasksByStatus = {};
    tasks.forEach(t => { tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1; });

    // Followups by status
    const followupsByStatus = {};
    followups.forEach(f => { followupsByStatus[f.status] = (followupsByStatus[f.status] || 0) + 1; });

    return NextResponse.json({
      leadsByStatus,
      totalLeads: leads.length,
      pipelineValue,
      wonRevenue,
      tasksByStatus,
      totalTasks: tasks.length,
      recentActivities: activitiesRes.data || [],
      followupsByStatus,
      totalFollowups: followups.length,
      totalCustomers: (customersRes.data || []).length,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
