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
      const { data, error } = await adminClient
        .from(TABLE)
        .select("*")
        .eq("lead_id", lead_id)
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json({ lead: data });
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

    const { data, error } = await adminClient
      .from(TABLE)
      .select("*")
      .order(sortField, { ascending: sortDirection === 'asc' });

    if (error) throw error;
    return NextResponse.json({ leads: data || [] });
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

    const { data, error } = await adminClient
      .from(TABLE)
      .insert({
        ...body,
        created_by: userDetails
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ lead: data });
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

    const { lead_id, ...updates } = body;
    const userDetails = await getUserDetails(supabase, user);

    const { data, error } = await adminClient
      .from(TABLE)
      .update({
        ...updates,
        updated_by: userDetails
      })
      .eq("lead_id", lead_id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ lead: data });
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
