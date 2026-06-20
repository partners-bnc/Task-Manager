import { NextResponse } from "next/server";
import { supabaseUrl } from "@/utils/supabase/config";

const MAX_LIMIT = 500;

function syncSecret() {
  return process.env.SYNC_SHARED_SECRET?.trim() || process.env.NEXT_SYNC_SHARED_SECRET?.trim();
}

function clampLimit(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 25;
  return Math.min(Math.max(Math.trunc(numeric), 1), MAX_LIMIT);
}

function clampOffset(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(Math.trunc(numeric), 0);
}

function normalizeTables(tables, fallback = []) {
  if (!Array.isArray(tables)) return fallback;
  return tables
    .map((table) => {
      if (typeof table === "string") return { name: table };
      if (!table || typeof table !== "object") return null;
      return {
        name: table.name,
        columns: Array.isArray(table.columns) ? table.columns.filter((column) => typeof column === "string") : undefined,
        limit: clampLimit(table.limit),
        offset: clampOffset(table.offset),
      };
    })
    .filter((table) => table?.name);
}

async function invokeSyncFunction(payload) {
  const secret = syncSecret();
  if (!secret) {
    return {
      response: NextResponse.json({ error: "SYNC_SHARED_SECRET is not configured" }, { status: 500 }),
    };
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/sync-followups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  return { response, result };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") === "preview" ? "preview" : "metadata";
    const tables = searchParams.get("tables")
      ? searchParams.get("tables").split(",").map((name) => ({
          name,
          limit: clampLimit(searchParams.get("limit")),
          offset: clampOffset(searchParams.get("offset")),
          columns: searchParams.get("columns")?.split(",").filter(Boolean),
        }))
      : undefined;

    const { response, result } = await invokeSyncFunction({
      mode,
      tables,
      limit: clampLimit(searchParams.get("limit")),
      offset: clampOffset(searchParams.get("offset")),
    });

    if (response instanceof NextResponse) return response;
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Import metadata failed" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const role = body?.currentUser?.role;

    if (role !== "admin") {
      return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
    }

    const mode = body.mode === "preview" ? "preview" : "import";
    const payload = {
      mode,
      source: "manual_import_page",
      tables: normalizeTables(body.tables),
      limit: clampLimit(body.limit),
      offset: clampOffset(body.offset),
    };

    const { response, result } = await invokeSyncFunction(payload);
    if (response instanceof NextResponse) return response;

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
