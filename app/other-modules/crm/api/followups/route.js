import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const TABLE = "crm_follow_ups";

// GET followups (all or filtered by lead_id)
export async function GET(request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("lead_id");
    const status = searchParams.get("status");

    let query = supabase
      .from(TABLE)
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
        ),
        campaign:crm_campaigns (
          campaign_id,
          campaign_name
        ),
        template:crm_email_templates (
          id,
          name
        )
      `);

    if (leadId) {
      query = query.eq("lead_id", leadId);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.order("scheduled_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ followups: data || [] });
  } catch (error) {
    console.error("GET followups error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST new followup
export async function POST(request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        lead_id: body.lead_id,
        followup_type: body.followup_type,
        direction: body.direction,
        status: body.status || 'Scheduled',
        scheduled_at: body.scheduled_at || null,
        completed_at: body.completed_at || null,
        duration_seconds: body.duration_seconds || null,
        outcome: body.outcome || '',
        next_followup_date: body.next_followup_date || null,
        next_followup_type: body.next_followup_type || null,
        template_id: body.template_id || null,
        campaign_id: body.campaign_id || null,
        email_sent_to: body.email_sent_to || null,
        email_subject_sent: body.email_subject_sent || null,
        email_body_snapshot: body.email_body_snapshot || null,
        email_delivery_status: body.email_delivery_status || 'Pending',
        email_opened: body.email_opened || false,
        email_opened_at: body.email_opened_at || null,
        email_clicked: body.email_clicked || false,
        email_clicked_at: body.email_clicked_at || null,
        call_recording_url: body.call_recording_url || null,
        ai_call_transcript: body.ai_call_transcript || null,
        assigned_to: body.assigned_to || null,
      })
      .select("*")
      .single();

    if (error) throw error;

    // Side effects on crm_leads
    const leadUpdates = {};
    if (body.next_followup_date) {
      leadUpdates.next_followup_date = body.next_followup_date;
    }
    if (body.status === 'Completed' || body.status === 'Sent') {
      leadUpdates.last_contacted = new Date().toISOString().split('T')[0];
    }

    if (Object.keys(leadUpdates).length > 0) {
      await supabase.from("crm_leads").update(leadUpdates).eq("lead_id", body.lead_id);
    }

    return NextResponse.json({ followup: data });
  } catch (error) {
    console.error("POST followup error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// PUT (update) followup
export async function PUT(request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { followup_id, ...updates } = body;

    if (!followup_id) {
      return NextResponse.json({ error: "followup_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update(updates)
      .eq("followup_id", followup_id)
      .select("*")
      .single();

    if (error) throw error;

    // Side effects on crm_leads
    const leadUpdates = {};
    if (updates.next_followup_date) {
      leadUpdates.next_followup_date = updates.next_followup_date;
    }
    if (updates.status === 'Completed' || updates.status === 'Sent') {
      leadUpdates.last_contacted = new Date().toISOString().split('T')[0];
    }

    if (Object.keys(leadUpdates).length > 0 && data.lead_id) {
      await supabase.from("crm_leads").update(leadUpdates).eq("lead_id", data.lead_id);
    }

    return NextResponse.json({ followup: data });
  } catch (error) {
    console.error("PUT followup error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DELETE followup
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const followup_id = searchParams.get("followup_id");

    if (!followup_id) {
      return NextResponse.json({ error: "followup_id is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.from(TABLE).delete().eq("followup_id", followup_id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE followup error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
