import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { adminClient } from "@/utils/supabase/admin";
import fs from "fs";
import path from "path";
import { filterLeadsForList } from "../route";

const TABLE = "crm_lists";
const FALLBACK_FILE = path.join(process.cwd(), "app", "other-modules", "crm", "data", "lists.json");

function getFallbackLists() {
  try {
    if (!fs.existsSync(FALLBACK_FILE)) return [];
    const data = fs.readFileSync(FALLBACK_FILE, "utf-8");
    return JSON.parse(data || "[]");
  } catch (err) {
    return [];
  }
}

async function getAuthenticatedUser(supabase) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return null;
  }
  return user;
}

// GET /other-modules/crm/api/lists/[list_id] - Fetch single list with populated matching leads
export async function GET(request, { params }) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const list_id = resolvedParams?.list_id;

    if (!list_id) {
      return NextResponse.json({ error: "list_id is required" }, { status: 400 });
    }

    let list = null;

    // Try DB fetch
    const { data: dbData, error: dbError } = await adminClient
      .from(TABLE)
      .select("*")
      .eq("list_id", list_id)
      .maybeSingle();

    if (!dbError && dbData) {
      list = dbData;
    } else {
      const fallbackLists = getFallbackLists();
      list = fallbackLists.find(l => String(l.list_id) === String(list_id)) || null;
    }

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Fetch all leads from crm_leads using range pagination to bypass PostgREST default limit
    const { data: firstChunk, count, error: leadsErr } = await adminClient
      .from("crm_leads")
      .select("*", { count: "exact" })
      .range(0, 999);

    if (leadsErr) {
      console.error("Error fetching leads for single list:", leadsErr);
      return NextResponse.json({ list, leads: [] });
    }

    let allLeads = [...(firstChunk || [])];
    if (count && count > 1000) {
      const promises = [];
      for (let i = 1000; i < count; i += 1000) {
        promises.push(
          adminClient
            .from("crm_leads")
            .select("*")
            .range(i, i + 999)
        );
      }
      const results = await Promise.all(promises);
      results.forEach((res) => {
        if (res.data) allLeads.push(...res.data);
      });
    }

    const matchingLeads = filterLeadsForList(allLeads || [], list.selected_sources, list.selected_tags);

    return NextResponse.json({
      list: {
        ...list,
        matching_lead_count: matchingLeads.length
      },
      leads: matchingLeads
    });
  } catch (error) {
    console.error("GET single list error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
