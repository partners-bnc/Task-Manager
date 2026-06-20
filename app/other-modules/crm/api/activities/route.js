import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const TABLE = "crm_activities";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from(TABLE).select("*").order("date", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ activities: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { data, error } = await supabase.from(TABLE).insert(body).select("*").single();
    if (error) throw error;
    return NextResponse.json({ activity: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
