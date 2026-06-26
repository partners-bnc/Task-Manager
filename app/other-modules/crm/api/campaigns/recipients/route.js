import { NextResponse } from "next/server";
import { adminClient } from "@/utils/supabase/admin";

const TABLE = "crm_campaign_recipients";

export async function PUT(request) {
  try {
    const supabase = adminClient;
    const body = await request.json();
    const { recipient_id, ...updates } = body;

    if (!recipient_id) {
      return NextResponse.json({ error: "recipient_id is required" }, { status: 400 });
    }

    const dbUpdates = { ...updates };
    if (updates.unsubscribed) {
      dbUpdates.unsubscribed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update(dbUpdates)
      .eq("recipient_id", recipient_id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ recipient: data });
  } catch (error) {
    console.error("PUT campaign_recipients error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
