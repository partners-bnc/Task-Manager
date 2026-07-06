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
    const empId = authContext?.employee?.employee_id;
    if (empId) {
      return `${displayName} [${empId}]`;
    }
    return `${displayName} (${email})`;
  } catch (error) {
    console.error("Error resolving user context on backend:", error);
    return user.email ? `${user.user_metadata?.full_name || user.email} (${user.email})` : 'System';
  }
}

const TABLE = "crm_campaigns";
const ZEPTOMAIL_URL = "https://api.zeptomail.in/v1.1/email";
const ZEPTOMAIL_FROM = {
  address: "noreply@bncglobal.in",
  name: "noreply",
};

// Helper for template variable substitution
function substitute(templateStr, lead) {
  if (!templateStr) return "";
  
  const getNormalizedValue = (key) => {
    const norm = key.toLowerCase().replace(/[\s_\-]+/g, '');
    
    switch (norm) {
      // Name mappings
      case 'contactname':
      case 'fullname':
      case 'leadname':
      case 'name':
        return lead.full_name || '';
      case 'firstname':
        return lead.full_name ? lead.full_name.split(' ')[0] : '';
        
      // Company mappings
      case 'companyname':
      case 'company':
        return lead.company_name || '';
        
      // Agent / Assigned to mappings
      case 'agentname':
      case 'agent':
      case 'assignedto':
        return lead.assigned_to || 'Sales Team';
        
      // Product
      case 'productname':
      case 'product':
        return lead.product_name || lead.product || 'Enterprise Audit Package';
        
      // Estimated Value / Currency
      case 'estimatedvalue':
      case 'value':
        return lead.estimated_value || lead.value || '$10,000';
      case 'currency':
        return lead.currency || 'USD';
        
      // Followup Date
      case 'followupdate':
      case 'nextfollowupdate':
        return lead.next_followup_date || 'May 28, 2026';
        
      // Contact info
      case 'phone':
      case 'phonenumber':
        return lead.phone || '';
      case 'email':
      case 'emailaddress':
        return lead.email || '';
        
      // Other Lead fields
      case 'leadsource':
      case 'source':
        return lead.lead_source || '';
      case 'leadstatus':
      case 'status':
        return lead.lead_status || '';
      case 'priority':
        return lead.priority || '';
      case 'designation':
        return lead.designation || '';
      case 'industry':
        return lead.industry || '';
        
      default:
        // Try looking up the property directly on lead
        if (lead[key] !== undefined) return String(lead[key]);
        const cleanKey = key.replace(/[\s_\-]+/g, '_').toLowerCase();
        if (lead[cleanKey] !== undefined) return String(lead[cleanKey]);
        return null;
    }
  };

  return templateStr.replace(/\{\{\s*([a-zA-Z0-9_\s\-]+?)\s*\}\}/g, (match, key) => {
    const val = getNormalizedValue(key);
    return val !== null ? val : match;
  });
}

function extractProviderMessageId(responseBody) {
  const data = Array.isArray(responseBody?.data) ? responseBody.data[0] : responseBody?.data;
  return (
    responseBody?.message_id ||
    responseBody?.email_reference ||
    responseBody?.request_id ||
    data?.message_id ||
    data?.email_reference ||
    data?.request_id ||
    null
  );
}

async function sendZeptoCampaignEmail({ token, lead, subject, body, format, campaignId, recipientId }) {
  const payload = {
    from: ZEPTOMAIL_FROM,
    to: [
      {
        email_address: {
          address: lead.email,
          name: lead.full_name || lead.email,
        },
      },
    ],
    subject,
    client_reference: `campaign_id=${campaignId}&recipient_id=${recipientId}&lead_id=${lead.lead_id}`,
  };

  if (format === "text") {
    payload.textbody = body || "";
  } else {
    payload.htmlbody = body || "";
  }

  const response = await fetch(ZEPTOMAIL_URL, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      responseBody?.message ||
      responseBody?.error ||
      responseBody?.data?.[0]?.message ||
      `ZeptoMail failed with status ${response.status}`;
    throw new Error(String(message));
  }

  return {
    providerMessageId: extractProviderMessageId(responseBody),
    responseBody,
  };
}

// GET all campaigns or single campaign detail
export async function GET(request) {
  try {
    const supabase = adminClient;
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
  const zohoToken = process.env.ZOHO_TOKEN;
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
  if (!isScheduled && !zohoToken) {
    throw new Error("ZOHO_TOKEN is required to send CRM campaign emails through ZeptoMail");
  }

  // Create campaign_recipients for each matched lead
  let sentCount = 0;
  let failedCount = 0;
  for (const lead of matchedLeads) {
    const subSubject = substitute(template.subject, lead);
    const emailFormat = campaign.email_format || "html";
    const bodyField = emailFormat === "text" ? (template.plain_text_body || "") : (template.html_body || "");
    const subBody = substitute(bodyField, lead);

    // Insert campaign_recipient
    const { data: recipient, error: recErr } = await supabase
      .from("crm_campaign_recipients")
      .insert({
        campaign_id: campaignId,
        lead_id: lead.lead_id,
        email_sent_to: lead.email,
        delivery_status: "Pending",
        provider: "zeptomail"
      })
      .select("*")
      .single();

    if (recErr) {
      console.error(`Error inserting recipient for lead ${lead.lead_id}:`, recErr.message);
      continue;
    }

    if (isScheduled) {
      continue;
    }

    try {
      const sentAt = new Date().toISOString();
      const { providerMessageId } = await sendZeptoCampaignEmail({
        token: zohoToken,
        lead,
        subject: subSubject,
        body: subBody,
        format: emailFormat,
        campaignId,
        recipientId: recipient.recipient_id,
      });

      await supabase
        .from("crm_campaign_recipients")
        .update({
          delivery_status: "Sent",
          sent_at: sentAt,
          provider: "zeptomail",
          provider_message_id: providerMessageId,
        })
        .eq("recipient_id", recipient.recipient_id);

      sentCount += 1;
    } catch (sendErr) {
      failedCount += 1;
      console.error(`ZeptoMail send failed for lead ${lead.lead_id}:`, sendErr.message);

      await supabase
        .from("crm_campaign_recipients")
        .update({
          delivery_status: "Failed",
          provider: "zeptomail",
        })
        .eq("recipient_id", recipient.recipient_id);
    }
  }

  // Update campaign
  const campaignUpdates = {
    total_recipients: total,
    status: isScheduled ? "Scheduled" : failedCount > 0 && sentCount === 0 ? "Paused" : "Completed",
    launched_at: new Date().toISOString(),
    sent_count: isScheduled ? 0 : sentCount,
    delivered_count: 0
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
    const supabaseClient = await createClient();
    const user = await getAuthenticatedUser(supabaseClient);
    let creatorName = "System";
    if (user) {
      creatorName = await getUserDetails(supabaseClient, user);
    }

    const supabase = adminClient;
    const body = await request.json();

    const templateId = Number(body.template_id);
    if (!Number.isInteger(templateId) || templateId <= 0) {
      return NextResponse.json({ error: "A valid template_id is required." }, { status: 400 });
    }

    const { data: templateExists, error: templateCheckError } = await supabase
      .from("crm_email_templates")
      .select("id")
      .eq("id", templateId)
      .single();

    if (templateCheckError || !templateExists) {
      return NextResponse.json({ error: "Selected email template was not found." }, { status: 400 });
    }

    const { data: campaign, error } = await supabase
      .from(TABLE)
      .insert({
        campaign_name: body.campaign_name,
        campaign_type: body.campaign_type || "Email",
        template_id: templateId,
        email_format: body.email_format || "html",
        target_filter: body.target_filter || {},
        status: body.status || "Draft",
        scheduled_at: body.scheduled_at || null,
        created_by: creatorName,
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
    const supabase = adminClient;
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

    const supabase = adminClient;
    const { error } = await supabase.from(TABLE).delete().eq("campaign_id", campaign_id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Campaign error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
