import { NextResponse } from "next/server";
import { adminClient } from "@/utils/supabase/admin";

export async function GET() {
  try {
    // 1. Fetch leads across PostgREST 1000-row page boundaries
    const { data: firstChunk, count, error: leadsErr } = await adminClient
      .from("crm_leads")
      .select("lead_id, lead_status, lead_category, lead_source, industry, country, created_at", { count: "exact" })
      .range(0, 999);
      
    if (leadsErr) throw leadsErr;

    let leads = [...(firstChunk || [])];
    if (count && count > 1000) {
      const fetchPromises = [];
      for (let i = 1000; i < count; i += 1000) {
        fetchPromises.push(
          adminClient
            .from("crm_leads")
            .select("lead_id, lead_status, lead_category, lead_source, industry, country, created_at")
            .range(i, i + 999)
        );
      }
      const results = await Promise.all(fetchPromises);
      results.forEach(res => {
        if (res.data) leads.push(...res.data);
      });
    }

    // 2. Fetch follow-ups across PostgREST 1000-row page boundaries
    const { data: firstFollowups, count: followupsCount, error: followupsErr } = await adminClient
      .from("crm_follow_ups")
      .select("followup_id, followup_type, status, scheduled_at, completed_at, outcome, assigned_to", { count: "exact" })
      .range(0, 999);
      
    if (followupsErr) throw followupsErr;

    let followups = [...(firstFollowups || [])];
    if (followupsCount && followupsCount > 1000) {
      const fPromises = [];
      for (let i = 1000; i < followupsCount; i += 1000) {
        fPromises.push(
          adminClient
            .from("crm_follow_ups")
            .select("followup_id, followup_type, status, scheduled_at, completed_at, outcome, assigned_to")
            .range(i, i + 999)
        );
      }
      const fResults = await Promise.all(fPromises);
      fResults.forEach(res => {
        if (res.data) followups.push(...res.data);
      });
    }

    // 3. Fetch campaigns
    const { data: campaigns, error: campaignsErr } = await adminClient
      .from("crm_campaigns")
      .select("*");
      
    if (campaignsErr) throw campaignsErr;

    // 4. Fetch experiences
    const { data: experiences, error: expErr } = await adminClient
      .from("crm_lead_experiences")
      .select("company_name, job_title, duration_years, company_industry");
      
    if (expErr) throw expErr;

    // 5. Fetch educations
    const { data: educations, error: eduErr } = await adminClient
      .from("crm_lead_educations")
      .select("institution_name, degree, field_of_study");
      
    if (eduErr) throw eduErr;

    // --- AGGREGATIONS ---

    // A. Leads by Status
    const leadsByStatus = {};
    leads.forEach(l => {
      const status = l.lead_status || 'New';
      leadsByStatus[status] = (leadsByStatus[status] || 0) + 1;
    });

    // B. Leads by Category
    const leadsByCategory = {};
    leads.forEach(l => {
      const cat = l.lead_category || 'Cold';
      leadsByCategory[cat] = (leadsByCategory[cat] || 0) + 1;
    });

    // C. Leads by Source
    const leadsBySource = {};
    leads.forEach(l => {
      const src = l.lead_source || 'Website';
      leadsBySource[src] = (leadsBySource[src] || 0) + 1;
    });

    // D. Leads by Industry
    const leadsByIndustry = {};
    leads.forEach(l => {
      const ind = l.industry || 'Unknown';
      leadsByIndustry[ind] = (leadsByIndustry[ind] || 0) + 1;
    });

    // E. Follow-ups by Status & Type
    const followupsByStatus = {};
    const followupsByType = {};
    followups.forEach(f => {
      const status = f.status || 'Scheduled';
      const type = f.followup_type || 'Call';
      followupsByStatus[status] = (followupsByStatus[status] || 0) + 1;
      followupsByType[type] = (followupsByType[type] || 0) + 1;
    });

    // F. Campaigns metrics sums
    let totalEmailsSent = 0;
    let totalEmailsDelivered = 0;
    let totalEmailsOpened = 0;
    let totalEmailsClicked = 0;
    let totalEmailsBounced = 0;

    campaigns.forEach(c => {
      totalEmailsSent += c.sent_count || 0;
      totalEmailsDelivered += c.delivered_count || 0;
      totalEmailsOpened += c.opened_count || 0;
      totalEmailsClicked += c.clicked_count || 0;
      totalEmailsBounced += c.bounced_count || 0;
    });

    // G. Experiences aggregations
    const companiesCount = {};
    let totalExpYears = 0;
    let expYearsCount = 0;

    experiences.forEach(e => {
      if (e.company_name) {
        companiesCount[e.company_name] = (companiesCount[e.company_name] || 0) + 1;
      }
      if (e.duration_years) {
        totalExpYears += Number(e.duration_years);
        expYearsCount++;
      }
    });

    const topCompanies = Object.entries(companiesCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // H. Educations aggregations
    const institutionsCount = {};
    const degreesCount = {};

    educations.forEach(edu => {
      if (edu.institution_name) {
        institutionsCount[edu.institution_name] = (institutionsCount[edu.institution_name] || 0) + 1;
      }
      if (edu.degree) {
        degreesCount[edu.degree] = (degreesCount[edu.degree] || 0) + 1;
      }
    });

    const topInstitutions = Object.entries(institutionsCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const topDegrees = Object.entries(degreesCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Weekly Lead Generation Trend (last 6 weeks)
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const leadsTrend = Array.from({ length: 6 }).map((_, idx) => {
      const weekStart = now - (6 - idx) * oneWeekMs;
      const weekEnd = weekStart + oneWeekMs;
      const count = leads.filter(l => {
        const cDate = new Date(l.created_at).getTime();
        return cDate >= weekStart && cDate < weekEnd;
      }).length;
      return {
        name: `Week ${idx + 1}`,
        leads: count
      };
    });

    // Recent activities: last 5 completed follow-ups
    const recentActivities = followups
      .filter(f => f.status === 'Completed')
      .sort((a, b) => new Date(b.completed_at || b.scheduled_at) - new Date(a.completed_at || a.scheduled_at))
      .slice(0, 5)
      .map(f => ({
        id: f.followup_id,
        type: f.followup_type,
        date: f.completed_at || f.scheduled_at,
        outcome: f.outcome,
        assigned_to: f.assigned_to
      }));

    return NextResponse.json({
      totalLeads: leads.length,
      leadsByStatus,
      leadsByCategory,
      leadsBySource,
      leadsByIndustry,
      
      followupsByStatus,
      followupsByType,
      totalFollowups: followups.length,
      recentActivities,

      campaignsCount: campaigns.length,
      campaignsMetrics: {
        sent: totalEmailsSent,
        delivered: totalEmailsDelivered,
        opened: totalEmailsOpened,
        clicked: totalEmailsClicked,
        bounced: totalEmailsBounced
      },

      experienceMetrics: {
        topCompanies,
        avgDuration: expYearsCount > 0 ? (totalExpYears / expYearsCount).toFixed(1) : 0,
        totalEntries: experiences.length
      },

      educationMetrics: {
        topInstitutions,
        topDegrees,
        totalEntries: educations.length
      },

      leadsTrend
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
