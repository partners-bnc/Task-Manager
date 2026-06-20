import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const TABLE = "crm_tasks";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from(TABLE).select("*").order("due_date", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ tasks: data });
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
    return NextResponse.json({ task: data });
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
    return NextResponse.json({ task: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const supabase = await createClient();
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
