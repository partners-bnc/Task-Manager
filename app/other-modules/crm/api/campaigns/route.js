import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const TABLE = "crm_campaigns";

// Helper for template variable substitution
function substitute(templateStr, lead) {
  if (!templateStr) return "";
  const vars = {
    first_name: lead.full_name ? lead.full_name.split(' ')[0] : '',
    full_name: lead.full_name || '',
    phone: lead.phone || '',
    email: lead.email || '',
    company_name: lead.company_name || '',
    lead_source: lead.lead_source || '',
    assigned_to: lead.assigned_to || ''
  };
  return templateStr.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match;
  });
}

// GET all campaigns or single campaign detail
export async function GET(request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      // Fetch single campaign details
      const { data: campaign, error } = await supabase
        .from(TABLE)
        .select(`
          *,
          template:crm_email_templates (
            id,
            name,
            subject,
            html_body,
            plain_text_body
          )
        `)
        .eq("campaign_id", id)
        .single();

      if (error) throw error;

      // Fetch campaign recipients
      const { data: recipients, error: recError } = await supabase
        .from("crm_campaign_recipients")
        .select(`
          *,
          lead:crm_leads (
            lead_id,
            full_name,
            email,
            phone,
            lead_source,
            lead_status,
            priority
          )
        `)
        .eq("campaign_id", id);

      if (recError) throw recError;

      return NextResponse.json({ campaign, recipients: recipients || [] });
    }

    // Fetch all campaigns
    const { data: campaignsList, error: listError } = await supabase
      .from(TABLE)
      .select(`
        *,
        template:crm_email_templates (
          id,
          name
        )
      `)
      .order("created_at", { ascending: false });

    if (listError) throw listError;
    return NextResponse.json({ campaigns: campaignsList || [] });
  } catch (error) {
    console.error("GET Campaigns error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper to launch a campaign
async function launchCampaign(supabase, campaignId) {
  // 1. Fetch campaign
  const { data: campaign, error: campErr } = await supabase
    .from(TABLE)
    .select("*")
    .eq("campaign_id", campaignId)
    .single();

  if (campErr || !campaign) throw new Error("Campaign not found");

  // 2. Fetch template
  const { data: template, error: tempErr } = await supabase
    .from("crm_email_templates")
    .select("*")
    .eq("id", campaign.template_id)
    .single();

  if (tempErr || !template) throw new Error("Template not found");

  // 3. Fetch all leads
  const { data: leads, error: leadsErr } = await supabase
    .from("crm_leads")
    .select("*");

  if (leadsErr) throw leadsErr;

  // 4. Fetch unsubscribed lead IDs
  const { data: unsubscribedRecipients, error: unsubErr } = await supabase
    .from("crm_campaign_recipients")
    .select("lead_id")
    .eq("unsubscribed", true);

  if (unsubErr) throw unsubErr;
  const unsubscribedIds = new Set((unsubscribedRecipients || []).map(r => String(r.lead_id)));

  // 5. Apply filters from target_filter
  const filter = campaign.target_filter || {};
  const matchedLeads = leads.filter(lead => {
    // Exclude unsubscribed
    if (unsubscribedIds.has(String(lead.lead_id))) return false;
    // Exclude leads with no email
    if (!lead.email) return false;

    // Filter properties
    for (const [key, filterValues] of Object.entries(filter)) {
      if (!filterValues || (Array.isArray(filterValues) && filterValues.length === 0)) {
        continue;
      }

      const leadValue = lead[key];

      if (key === "tags") {
        // tags filter (usually a string or array)
        const filterTag = String(filterValues).toLowerCase();
        const leadTags = String(lead.tags || "").toLowerCase();
        if (!leadTags.includes(filterTag)) return false;
      } else if (key === "created_at_range") {
        const { start, end } = filterValues;
        const leadDate = new Date(lead.created_at);
        if (start && leadDate < new Date(start)) return false;
        if (end && leadDate > new Date(end)) return false;
      } else {
        // Multi-select or single match
        if (Array.isArray(filterValues)) {
          if (!filterValues.map(v => String(v).toLowerCase()).includes(String(leadValue || "").toLowerCase())) {
            return false;
          }
        } else {
          if (String(filterValues).toLowerCase() !== String(leadValue || "").toLowerCase()) {
            return false;
          }
        }
      }
    }
    return true;
  });

  const total = matchedLeads.length;
  if (total === 0) {
    // Update campaign stats
    await supabase
      .from(TABLE)
      .update({
        total_recipients: 0,
        status: "Completed",
        completed_at: new Date().toISOString()
      })
      .eq("campaign_id", campaignId);
    return;
  }

  const isScheduled = campaign.scheduled_at && new Date(campaign.scheduled_at) > new Date();

  // Create campaign_recipients and follow_ups for each matched lead
  for (const lead of matchedLeads) {
    const subSubject = substitute(template.subject, lead);
    const subBody = substitute(template.html_body, lead);

    // A. Insert followup
    const { data: followup, error: followErr } = await supabase
      .from("crm_follow_ups")
      .insert({
        lead_id: lead.lead_id,
        followup_type: "Email",
        direction: "Outbound",
        status: isScheduled ? "Scheduled" : "Sent",
        scheduled_at: isScheduled ? campaign.scheduled_at : new Date().toISOString(),
        completed_at: isScheduled ? null : new Date().toISOString(),
        template_id: campaign.template_id,
        campaign_id: campaignId,
        email_sent_to: lead.email,
        email_subject_sent: subSubject,
        email_body_snapshot: subBody,
        email_delivery_status: isScheduled ? "Pending" : "Sent",
        assigned_to: lead.assigned_to || null
      })
      .select("*")
      .single();

    if (followErr) {
      console.error(`Error inserting followup for lead ${lead.lead_id}:`, followErr.message);
      continue;
    }

    // B. Insert campaign_recipient
    const { error: recErr } = await supabase
      .from("crm_campaign_recipients")
      .insert({
        campaign_id: campaignId,
        lead_id: lead.lead_id,
        email_sent_to: lead.email,
        delivery_status: isScheduled ? "Pending" : "Sent",
        sent_at: isScheduled ? null : new Date().toISOString(),
        followup_id: followup.followup_id
      });

    if (recErr) {
      console.error(`Error inserting recipient for lead ${lead.lead_id}:`, recErr.message);
    }
  }

  // Update campaign
  const campaignUpdates = {
    total_recipients: total,
    status: isScheduled ? "Scheduled" : "Completed",
    launched_at: new Date().toISOString(),
    sent_count: isScheduled ? 0 : total,
    delivered_count: isScheduled ? 0 : total
  };

  if (!isScheduled) {
    campaignUpdates.completed_at = new Date().toISOString();
  }

  await supabase
    .from(TABLE)
    .update(campaignUpdates)
    .eq("campaign_id", campaignId);
}

// POST new campaign
export async function POST(request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data: campaign, error } = await supabase
      .from(TABLE)
      .insert({
        campaign_name: body.campaign_name,
        campaign_type: body.campaign_type || "Email",
        template_id: body.template_id || null,
        target_filter: body.target_filter || {},
        status: body.status || "Draft",
        scheduled_at: body.scheduled_at || null,
        created_by: body.created_by || "System",
      })
      .select("*")
      .single();

    if (error) throw error;

    // If campaign is launched directly
    if (campaign.status === "Running" || campaign.status === "Scheduled") {
      await launchCampaign(supabase, campaign.campaign_id);
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("POST Campaign error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// PUT update campaign
export async function PUT(request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { campaign_id, ...updates } = body;

    if (!campaign_id) {
      return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });
    }

    // Fetch current status to see if it's changing
    const { data: currentCampaign, error: fetchErr } = await supabase
      .from(TABLE)
      .select("status")
      .eq("campaign_id", campaign_id)
      .single();

    if (fetchErr) throw fetchErr;

    const { data: campaign, error } = await supabase
      .from(TABLE)
      .update(updates)
      .eq("campaign_id", campaign_id)
      .select("*")
      .single();

    if (error) throw error;

    // If launching or pausing/resuming
    if (
      (updates.status === "Running" || updates.status === "Scheduled") &&
      currentCampaign.status === "Draft"
    ) {
      await launchCampaign(supabase, campaign_id);
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("PUT Campaign error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DELETE campaign
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const campaign_id = searchParams.get("campaign_id");

    if (!campaign_id) {
      return NextResponse.json({ error: "campaign_id is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.from(TABLE).delete().eq("campaign_id", campaign_id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Campaign error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
