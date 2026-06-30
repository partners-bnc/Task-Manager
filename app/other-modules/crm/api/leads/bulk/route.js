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

export async function PUT(request) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { lead_ids, updates } = await request.json();
    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return NextResponse.json({ error: "lead_ids is required and must be a non-empty array" }, { status: 400 });
    }

    const userDetails = await getUserDetails(supabase, user);

    const { data, error } = await adminClient
      .from(TABLE)
      .update({
        ...updates,
        updated_by: userDetails
      })
      .in("lead_id", lead_ids)
      .select("*");

    if (error) throw error;
    return NextResponse.json({ success: true, count: data.length });
  } catch (error) {
    console.error("PUT Bulk CRM Leads error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { lead_ids } = await request.json();
    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return NextResponse.json({ error: "lead_ids is required and must be a non-empty array" }, { status: 400 });
    }

    const { error } = await adminClient
      .from(TABLE)
      .delete()
      .in("lead_id", lead_ids);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Bulk CRM Leads error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
