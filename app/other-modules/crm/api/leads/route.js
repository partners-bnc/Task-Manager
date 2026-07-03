import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { adminClient } from "@/utils/supabase/admin";
import { resolveAuthenticatedUserContext } from "@/utils/auth/context";

const TABLE = "crm_leads";

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

// Helper to query crm_follow_ups and populate notes, last_contacted, next_followup_date
async function populateLeadsFollowupData(leads) {
  if (!leads || leads.length === 0) return [];
  const leadIds = leads.map(l => l.lead_id);
  
  // Fetch all follow-ups for these leads
  const { data: followups, error } = await adminClient
    .from("crm_follow_ups")
    .select("*")
    .in("lead_id", leadIds)
    .order("scheduled_at", { ascending: false });

  if (error) {
    console.error("Error populating leads follow-up data:", error);
    return leads;
  }

  // Create a mapping of lead_id -> followups
  const followupsMap = {};
  followups.forEach(f => {
    if (!followupsMap[f.lead_id]) {
      followupsMap[f.lead_id] = [];
    }
    followupsMap[f.lead_id].push(f);
  });

  return leads.map(lead => {
    const leadFollowups = followupsMap[lead.lead_id] || [];
    
    // Find latest completed followup
    const completed = leadFollowups.filter(f => f.status === "Completed" || f.status === "Sent" || f.status === "Failed");
    const lastContacted = completed.length > 0 ? completed[0].completed_at : null;
    
    // Find earliest scheduled followup
    const scheduled = leadFollowups.filter(f => f.status === "Scheduled" || f.status === "Pending");
    const nextFollowup = scheduled.length > 0 ? (scheduled[scheduled.length - 1].next_followup_date || scheduled[scheduled.length - 1].scheduled_at) : null;
    
    // Find latest outcome for notes
    const manualNotes = leadFollowups.filter(f => f.followup_type !== "Email" && f.outcome && f.outcome !== "Scheduled next contact");
    const notes = manualNotes.length > 0 ? manualNotes[0].outcome : "";

    return {
      ...lead,
      last_contacted: lastContacted ? lastContacted.split('T')[0] : null,
      next_followup_date: nextFollowup ? nextFollowup.split('T')[0] : null,
      notes
    };
  });
}

export async function GET(request) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const phones = searchParams.get("phones");
    const emails = searchParams.get("emails");
    const lead_id = searchParams.get("lead_id");

    if (lead_id) {
      const { data: leadData, error } = await adminClient
        .from(TABLE)
        .select("*")
        .eq("lead_id", lead_id)
        .maybeSingle();

      if (error) throw error;

      // Populate follow-up data for the single lead
      let populatedLead = leadData;
      if (leadData) {
        const [populated] = await populateLeadsFollowupData([leadData]);
        populatedLead = populated;
      }

      // Query campaign emails sent to this lead
      const { data: campaignEmails, error: campErr } = await adminClient
        .from("crm_campaign_recipients")
        .select(`
          recipient_id,
          campaign_id,
          email_sent_to,
          delivery_status,
          unsubscribed,
          unsubscribed_at,
          created_at,
          updated_at,
          campaign:crm_campaigns (
            campaign_name,
            status,
            template:crm_email_templates (
              subject
            )
          )
        `)
        .eq("lead_id", lead_id)
        .order("created_at", { ascending: false });

      if (campErr) {
        console.error("Error fetching campaign emails for lead:", campErr);
      }

      return NextResponse.json({ 
        lead: populatedLead,
        campaignEmails: campaignEmails || []
      });
    }

    if (phones || emails) {
      let queryParts = [];
      if (phones) {
        const phoneList = phones.split(',').map(p => p.trim()).filter(Boolean);
        if (phoneList.length > 0) {
          queryParts.push(`phone.in.(${phoneList.map(p => `"${p}"`).join(',')})`);
        }
      }
      if (emails) {
        const emailList = emails.split(',').map(e => e.trim()).filter(Boolean);
        if (emailList.length > 0) {
          queryParts.push(`email.in.(${emailList.map(e => `"${e}"`).join(',')})`);
        }
      }

      if (queryParts.length > 0) {
        const { data, error } = await adminClient
          .from(TABLE)
          .select("lead_id, full_name, phone, email")
          .or(queryParts.join(','));

        if (error) throw error;
        return NextResponse.json({ leads: data || [] });
      }
    }

    const sortField = searchParams.get("sortField") || "created_at";
    const sortDirection = searchParams.get("sortDirection") || "desc";

    // Query all leads
    const { data, error } = await adminClient
      .from(TABLE)
      .select("*")
      .order(sortField === "next_followup_date" || sortField === "last_contacted" || sortField === "notes" ? "created_at" : sortField, { ascending: sortDirection === 'asc' });

    if (error) throw error;

    // Populate followups dynamically
    const populatedLeads = await populateLeadsFollowupData(data || []);

    // If sorting by populated fields, handle sorting in memory
    if (sortField === "next_followup_date" || sortField === "last_contacted" || sortField === "notes") {
      populatedLeads.sort((a, b) => {
        const valA = a[sortField] || "";
        const valB = b[sortField] || "";
        if (sortDirection === 'asc') {
          return valA.localeCompare(valB);
        } else {
          return valB.localeCompare(valA);
        }
      });
    }

    return NextResponse.json({ leads: populatedLeads });
  } catch (error) {
    console.error("GET CRM Leads error:", error);
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
    const userDetails = await getUserDetails(supabase, user);

    const { notes, next_followup_date, ...leadData } = body;

    const { data: lead, error } = await adminClient
      .from(TABLE)
      .insert({
        ...leadData,
        created_by: userDetails
      })
      .select("*")
      .single();

    if (error) throw error;

    // Save notes as a completed followup log
    if (notes) {
      await adminClient
        .from("crm_follow_ups")
        .insert({
          lead_id: lead.lead_id,
          followup_type: "Call",
          direction: "Outbound",
          status: "Completed",
          scheduled_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          outcome: notes,
          assigned_to: userDetails
        });
    }

    // Save next_followup_date as a scheduled followup log
    if (next_followup_date) {
      await adminClient
        .from("crm_follow_ups")
        .insert({
          lead_id: lead.lead_id,
          followup_type: "Call",
          direction: "Outbound",
          status: "Scheduled",
          scheduled_at: new Date(next_followup_date).toISOString(),
          completed_at: null,
          outcome: "Scheduled next contact",
          next_followup_date,
          assigned_to: userDetails
        });
    }

    return NextResponse.json({ lead: { ...lead, notes, next_followup_date } });
  } catch (error) {
    console.error("POST CRM Lead error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(request) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.lead_id) {
      return NextResponse.json({ error: "lead_id is required" }, { status: 400 });
    }

    const { lead_id, notes, next_followup_date, ...updates } = body;
    const userDetails = await getUserDetails(supabase, user);

    const { data: lead, error } = await adminClient
      .from(TABLE)
      .update({
        ...updates,
        updated_by: userDetails
      })
      .eq("lead_id", lead_id)
      .select("*")
      .single();

    if (error) throw error;

    // Handle notes update (insert a new completed manual followup activity log)
    if (notes) {
      await adminClient
        .from("crm_follow_ups")
        .insert({
          lead_id: lead.lead_id,
          followup_type: "Call",
          direction: "Outbound",
          status: "Completed",
          scheduled_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          outcome: notes,
          assigned_to: userDetails
        });
    }

    // Handle next followup date update (insert a new scheduled followup)
    if (next_followup_date) {
      // First cancel existing scheduled followups to avoid duplicate scheduling
      await adminClient
        .from("crm_follow_ups")
        .delete()
        .eq("lead_id", lead_id)
        .eq("status", "Scheduled");

      await adminClient
        .from("crm_follow_ups")
        .insert({
          lead_id: lead.lead_id,
          followup_type: "Call",
          direction: "Outbound",
          status: "Scheduled",
          scheduled_at: new Date(next_followup_date).toISOString(),
          completed_at: null,
          outcome: "Scheduled next contact",
          next_followup_date,
          assigned_to: userDetails
        });
    }

    return NextResponse.json({ lead: { ...lead, notes, next_followup_date } });
  } catch (error) {
    console.error("PUT CRM Lead error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lead_id = searchParams.get("lead_id");
    if (!lead_id) {
      return NextResponse.json({ error: "lead_id is required" }, { status: 400 });
    }

    const { error } = await adminClient
      .from(TABLE)
      .delete()
      .eq("lead_id", lead_id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE CRM Lead error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
