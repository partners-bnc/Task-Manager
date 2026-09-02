import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const TABLE = "crm_enrollments";

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaign_id");

    let query = supabase.from(TABLE).select("*").order("enrolled_at", { ascending: false });
    if (campaignId) query = query.eq("campaign_id", campaignId);

    const { data, error } = await query;
    if (error) {
      console.warn("GET enrollments notice:", error.message);
      return NextResponse.json({ enrollments: [] });
    }
    return NextResponse.json({ enrollments: data || [] });
  } catch (error) {
    console.error("GET enrollments error:", error);
    return NextResponse.json({ enrollments: [] });
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { data, error } = await supabase.from(TABLE).insert(body).select("*").single();
    if (error) throw error;
    return NextResponse.json({ enrollment: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const { id, ...updates } = body;
    const { data, error } = await supabase.from(TABLE).update(updates).eq("id", id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ enrollment: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
