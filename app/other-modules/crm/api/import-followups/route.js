import { NextResponse } from "next/server";
import { supabaseUrl } from "@/utils/supabase/config";

const ALLOWED_TABLES = new Set(["service_enquiries", "voice_requirements"]);
const DEFAULT_TABLES = ["service_enquiries", "voice_requirements"];
const ALLOWED_LIMITS = new Set([25, 50, 100, 500]);
const MAX_LIMIT = 500;

function normalizeTables(tables) {
  if (!Array.isArray(tables)) return DEFAULT_TABLES;
  const selectedTables = tables.filter((table) => ALLOWED_TABLES.has(table));
  return selectedTables.length ? selectedTables : DEFAULT_TABLES;
}

function normalizeLimit(limit) {
  const numericLimit = Number(limit);
  if (!Number.isFinite(numericLimit)) return 50;
  const clampedLimit = Math.min(Math.max(Math.trunc(numericLimit), 1), MAX_LIMIT);
  return ALLOWED_LIMITS.has(clampedLimit) ? clampedLimit : Math.min(clampedLimit, MAX_LIMIT);
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const role = body?.currentUser?.role;

    if (role !== "admin") {
      return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
    }

    const syncSecret = process.env.SYNC_SHARED_SECRET?.trim() || process.env.NEXT_SYNC_SHARED_SECRET?.trim();
    if (!syncSecret) {
      return NextResponse.json({ error: "SYNC_SHARED_SECRET is not configured" }, { status: 500 });
    }

    const payload = {
      source: "manual_import",
      tables: normalizeTables(body.tables),
      limit: normalizeLimit(body.limit),
    };

    const response = await fetch(`${supabaseUrl}/functions/v1/sync-followups`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${syncSecret}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: result.error || "Import failed", details: result },
        { status: response.status }
      );
    }

    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Import failed" }, { status: 500 });
  }
}
