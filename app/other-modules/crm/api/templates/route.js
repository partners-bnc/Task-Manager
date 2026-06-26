import { NextResponse } from "next/server";
import { adminClient } from "@/utils/supabase/admin";
import {
  normalizeVariables,
  sanitizeEmailHtml,
  STARTER_EMAIL_TEMPLATES,
  TEMPLATE_CATEGORIES,
  TEMPLATE_STATUSES,
} from "../../utils/emailTemplates";

const TABLE = "crm_email_templates";

export async function GET() {
  try {
    const supabase = adminClient;
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({
        templates: withStarterIds(),
        fallback: true,
        error: error.message,
      });
    }

    return NextResponse.json({
      templates: Array.isArray(data) ? data : [],
      fallback: false,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = adminClient;
    const payload = normalizeTemplatePayload(await request.json());

    const { data, error } = await supabase.from(TABLE).insert(payload).select("*").single();
    if (error) throw error;

    return NextResponse.json({ template: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(request) {
  try {
    const supabase = adminClient;
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "Template id is required." }, { status: 400 });
    }

    const payload = normalizeTemplatePayload(body);
    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq("id", body.id)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ template: data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Template id is required." }, { status: 400 });
    }

    const supabase = adminClient;
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

function normalizeTemplatePayload(body) {
  const name = String(body.name || "").trim();
  const subject = String(body.subject || "").trim();
  const htmlBody = sanitizeEmailHtml(body.html_body || body.html || "");

  if (!name) throw new Error("Template name is required.");
  if (!subject) throw new Error("Subject is required.");
  if (!htmlBody) throw new Error("HTML body is required.");

  const category = TEMPLATE_CATEGORIES.includes(body.category) ? body.category : "General";
  const status = TEMPLATE_STATUSES.includes(body.status) ? body.status : "Draft";
  const source = ["Manual", "AI", "Seed"].includes(body.source) ? body.source : "Manual";

  return {
    name,
    category,
    subject,
    preheader: String(body.preheader || "").trim(),
    html_body: htmlBody,
    plain_text_body: String(body.plain_text_body || body.plainText || "").trim(),
    variables: normalizeVariables(body.variables),
    status,
    source,
  };
}

function withStarterIds() {
  return STARTER_EMAIL_TEMPLATES.map((template, index) => ({
    ...template,
    id: `starter-${index + 1}`,
    created_at: new Date(2026, 4, 24 - index).toISOString(),
    updated_at: new Date(2026, 4, 24 - index).toISOString(),
  }));
}
