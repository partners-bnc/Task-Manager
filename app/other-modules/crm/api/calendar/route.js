import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { adminClient } from "@/utils/supabase/admin";
import { resolveAuthenticatedUserContext } from "@/utils/auth/context";

const TABLE = "crm_calendar_events";

async function getAuthenticatedUser(supabase) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;
  return user;
}

async function getUserDetails(supabase, user) {
  try {
    const authContext = await resolveAuthenticatedUserContext(supabase, user);
    const displayName = authContext?.user?.name || user.user_metadata?.full_name || user.email || 'User';
    const email = authContext?.user?.email || user.email || '';
    return `${displayName} (${email})`;
  } catch (error) {
    console.error("Error resolving user context:", error);
    return user.email ? `${user.user_metadata?.full_name || user.email} (${user.email})` : 'System';
  }
}

// GET calendar events (with optional date range filtering)
export async function GET(request) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const leadId = searchParams.get("lead_id");
    const eventId = searchParams.get("event_id");

    // Single event fetch
    if (eventId) {
      const { data, error } = await adminClient
        .from(TABLE)
        .select(`
          *,
          lead:crm_leads (
            lead_id,
            full_name,
            email,
            phone,
            company_name
          )
        `)
        .eq("event_id", eventId)
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json({ event: data });
    }

    let query = adminClient
      .from(TABLE)
      .select(`
        *,
        lead:crm_leads (
          lead_id,
          full_name,
          email,
          phone,
          company_name
        )
      `);

    // Date range filter
    if (start) {
      query = query.gte("start_time", start);
    }
    if (end) {
      query = query.lte("start_time", end);
    }

    // Lead filter
    if (leadId) {
      query = query.eq("lead_id", leadId);
    }

    const { data, error } = await query.order("start_time", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ events: data || [] });
  } catch (error) {
    console.error("GET calendar events error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST new calendar event
export async function POST(request) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const userDetails = await getUserDetails(supabase, user);

    if (!body.title || !body.start_time || !body.end_time) {
      return NextResponse.json(
        { error: "title, start_time, and end_time are required" },
        { status: 400 }
      );
    }

    const { data, error } = await adminClient
      .from(TABLE)
      .insert({
        title: body.title,
        description: body.description || null,
        event_type: body.event_type || 'meeting',
        start_time: body.start_time,
        end_time: body.end_time,
        all_day: body.all_day || false,
        location: body.location || null,
        color: body.color || '#3b82f6',
        lead_id: body.lead_id || null,
        assigned_to: body.assigned_to || null,
        status: body.status || 'scheduled',
        created_by: userDetails,
      })
      .select(`
        *,
        lead:crm_leads (
          lead_id,
          full_name,
          email,
          phone,
          company_name
        )
      `)
      .single();

    if (error) throw error;
    return NextResponse.json({ event: data });
  } catch (error) {
    console.error("POST calendar event error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// PUT update calendar event
export async function PUT(request) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { event_id, ...updates } = body;

    if (!event_id) {
      return NextResponse.json({ error: "event_id is required" }, { status: 400 });
    }

    const { data, error } = await adminClient
      .from(TABLE)
      .update(updates)
      .eq("event_id", event_id)
      .select(`
        *,
        lead:crm_leads (
          lead_id,
          full_name,
          email,
          phone,
          company_name
        )
      `)
      .single();

    if (error) throw error;
    return NextResponse.json({ event: data });
  } catch (error) {
    console.error("PUT calendar event error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DELETE calendar event
export async function DELETE(request) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("event_id");

    if (!eventId) {
      return NextResponse.json({ error: "event_id is required" }, { status: 400 });
    }

    const { error } = await adminClient
      .from(TABLE)
      .delete()
      .eq("event_id", eventId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE calendar event error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
