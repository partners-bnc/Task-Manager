import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { adminClient } from "@/utils/supabase/admin";
import { resolveAuthenticatedUserContext } from "@/utils/auth/context";

async function getAuthenticatedUser(supabase) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return null;
  }
  return user;
}

async function getUserDetails(supabase, user) {
  try {
    const authContext = await resolveAuthenticatedUserContext(supabase, user);
    const displayName = authContext?.user?.name || user.user_metadata?.full_name || user.email || 'User';
    const email = authContext?.user?.email || user.email || '';
    return `${displayName} (${email})`;
  } catch (error) {
    console.error("Error resolving user context on backend:", error);
    return user.email ? `${user.user_metadata?.full_name || user.email} (${user.email})` : 'System';
  }
}

const LEADS_TABLE = "crm_leads";
const FOLLOWUPS_TABLE = "crm_follow_ups";
const RECIPIENTS_TABLE = "crm_campaign_recipients";

export async function GET(request) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("lead_id");

    if (leadId) {
      // Fetch details for a specific lead
      const { data: lead, error: leadErr } = await adminClient
        .from(LEADS_TABLE)
        .select("*")
        .eq("lead_id", leadId)
        .single();

      if (leadErr) throw leadErr;

      // Fetch manual followups
      const { data: manualFollowups, error: followErr } = await adminClient
        .from(FOLLOWUPS_TABLE)
        .select(`
          *,
          template:crm_email_templates (
            name,
            subject
          ),
          campaign:crm_campaigns (
            campaign_name
          )
        `)
        .eq("lead_id", leadId)
        .order("scheduled_at", { ascending: false });

      if (followErr) throw followErr;

      // Fetch campaign recipient logs
      const { data: campaignRecipients, error: recErr } = await adminClient
        .from(RECIPIENTS_TABLE)
        .select(`
          recipient_id,
          campaign_id,
          email_sent_to,
          delivery_status,
          created_at,
          unsubscribed,
          unsubscribed_at,
          campaign:crm_campaigns (
            campaign_name,
            status,
            template:crm_email_templates (
              subject,
              name
            )
          )
        `)
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (recErr) throw recErr;

      return NextResponse.json({
        lead,
        manualFollowups: manualFollowups || [],
        campaignRecipients: campaignRecipients || [],
        followups: manualFollowups || []
      });
    }

    // Fetch all leads across PostgREST 1000-row page boundaries
    const { data: firstLeadsChunk, count: totalLeadsCount, error: leadsErr } = await adminClient
      .from(LEADS_TABLE)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(0, 999);

    if (leadsErr) throw leadsErr;

    let leads = [...(firstLeadsChunk || [])];
    if (totalLeadsCount && totalLeadsCount > 1000) {
      const leadPromises = [];
      for (let i = 1000; i < totalLeadsCount; i += 1000) {
        leadPromises.push(
          adminClient
            .from(LEADS_TABLE)
            .select("*")
            .order("created_at", { ascending: false })
            .range(i, i + 999)
        );
      }
      const leadResults = await Promise.all(leadPromises);
      leadResults.forEach(res => {
        if (res.data) leads.push(...res.data);
      });
    }

    // Fetch all follow-ups across PostgREST 1000-row page boundaries
    const { data: firstFollowupsChunk, count: totalFollowupsCount, error: allFollowErr } = await adminClient
      .from(FOLLOWUPS_TABLE)
      .select("*", { count: "exact" })
      .order("scheduled_at", { ascending: false })
      .range(0, 999);

    if (allFollowErr) throw allFollowErr;

    let allFollowups = [...(firstFollowupsChunk || [])];
    if (totalFollowupsCount && totalFollowupsCount > 1000) {
      const followupPromises = [];
      for (let i = 1000; i < totalFollowupsCount; i += 1000) {
        followupPromises.push(
          adminClient
            .from(FOLLOWUPS_TABLE)
            .select("*")
            .order("scheduled_at", { ascending: false })
            .range(i, i + 999)
        );
      }
      const followupResults = await Promise.all(followupPromises);
      followupResults.forEach(res => {
        if (res.data) allFollowups.push(...res.data);
      });
    }

    return NextResponse.json({
      leads: leads || [],
      followups: allFollowups || []
    });
  } catch (error) {
    console.error("GET CRM Followups error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      lead_id,
      followup_type,
      direction,
      status,
      scheduled_at,
      completed_at,
      outcome,
      next_followup_date,
      next_followup_type
    } = body;

    if (!lead_id || !followup_type) {
      return NextResponse.json({ error: "lead_id and followup_type are required" }, { status: 400 });
    }

    const userDetails = await getUserDetails(supabase, user);
    const agentName = userDetails || "System";

    // 1. Insert the new followup log
    const { data: newFollowup, error: insertErr } = await adminClient
      .from(FOLLOWUPS_TABLE)
      .insert({
        lead_id,
        followup_type,
        direction: direction || "Outbound",
        status: status || "Completed",
        scheduled_at: scheduled_at || new Date().toISOString(),
        completed_at: completed_at || (status === "Completed" ? new Date().toISOString() : null),
        outcome,
        assigned_to: agentName,
        next_followup_date: next_followup_date || null,
        next_followup_type: next_followup_type || null
      })
      .select("*")
      .single();

    if (insertErr) throw insertErr;

    // 2. If next_followup_date is supplied, also create a scheduled pending followup row
    if (next_followup_date) {
      await adminClient
        .from(FOLLOWUPS_TABLE)
        .insert({
          lead_id,
          followup_type: next_followup_type || "Call",
          direction: "Outbound",
          status: "Scheduled",
          scheduled_at: new Date(next_followup_date).toISOString(),
          completed_at: null,
          outcome: "Scheduled next contact",
          assigned_to: agentName
        });
    }

    return NextResponse.json({ followup: newFollowup });
  } catch (error) {
    console.error("POST CRM Followup error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
