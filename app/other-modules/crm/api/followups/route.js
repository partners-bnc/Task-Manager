import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const TABLE = "crm_followups";

function toClient(row) {
  if (!row) return row;
  return {
    ...row,
    leadId: row.lead_id ?? row.leadId,
    dueDate: row.due_date ?? row.dueDate,
    dueTime: row.due_time ?? row.dueTime,
    assigneeId: row.assignee_id ?? row.assigneeId,
    created: row.created_at ?? row.created,
  };
}

function hasOwn(payload, key) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function toDatabase(payload, { partial = false } = {}) {
  const {
    leadId,
    dueDate,
    dueTime,
    assigneeId,
    created,
    lead_id,
    due_date,
    due_time,
    assignee_id,
    created_at,
    ...rest
  } = payload;

  const dbPayload = { ...rest };

  if (!partial || hasOwn(payload, "lead_id") || hasOwn(payload, "leadId")) {
    dbPayload.lead_id = (lead_id ?? leadId) || null;
  }
  if (!partial || hasOwn(payload, "due_date") || hasOwn(payload, "dueDate")) {
    dbPayload.due_date = (due_date ?? dueDate) || null;
  }
  if (!partial || hasOwn(payload, "due_time") || hasOwn(payload, "dueTime")) {
    dbPayload.due_time = (due_time ?? dueTime) || "-";
  }
  if (!partial || hasOwn(payload, "assignee_id") || hasOwn(payload, "assigneeId")) {
    dbPayload.assignee_id = (assignee_id ?? assigneeId) || null;
  }
  if (created_at) {
    dbPayload.created_at = created_at;
  }

  return dbPayload;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from(TABLE).select("*").order("due_date", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ followups: (data || []).map(toClient) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { data, error } = await supabase.from(TABLE).insert(toDatabase(body)).select("*").single();
    if (error) throw error;
    return NextResponse.json({ followup: toClient(data) });
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
    const { data, error } = await supabase.from(TABLE).update(toDatabase(updates, { partial: true })).eq("id", id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ followup: toClient(data) });
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
