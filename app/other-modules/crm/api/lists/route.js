import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { adminClient } from "@/utils/supabase/admin";
import fs from "fs";
import path from "path";

const TABLE = "crm_lists";
const FALLBACK_FILE = path.join(process.cwd(), "app", "other-modules", "crm", "data", "lists.json");

// Helper to ensure fallback directory & file exists
function getFallbackLists() {
  try {
    const dir = path.dirname(FALLBACK_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(FALLBACK_FILE)) {
      const defaultLists = [
        {
          list_id: "list-1",
          name: "5th Seminar",
          description: "Leads tagged for tomorrow's 5th seminar from CPA farms and event campaigns",
          selected_sources: ["CPA farms", "Event"],
          selected_tags: ["Hot", "Seminar"],
          created_by: "System",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      fs.writeFileSync(FALLBACK_FILE, JSON.stringify(defaultLists, null, 2), "utf-8");
      return defaultLists;
    }
    const data = fs.readFileSync(FALLBACK_FILE, "utf-8");
    return JSON.parse(data || "[]");
  } catch (err) {
    console.error("Fallback file read error:", err);
    return [];
  }
}

function saveFallbackLists(lists) {
  try {
    const dir = path.dirname(FALLBACK_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(lists, null, 2), "utf-8");
  } catch (err) {
    console.error("Fallback file write error:", err);
  }
}

async function getAuthenticatedUser(supabase) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return null;
  }
  return user;
}

// Fetch all CRM leads to compute matching leads count per list across PostgREST 1000-row limit
async function getAllLeads() {
  try {
    const { data: firstChunk, count, error } = await adminClient
      .from("crm_leads")
      .select("lead_id, full_name, email, phone, lead_source, tags, lead_status, lead_category, company_name, created_at", { count: "exact" })
      .range(0, 999);

    if (error) {
      console.error("Error fetching leads for list calculation:", error);
      return [];
    }

    let leads = [...(firstChunk || [])];
    if (count && count > 1000) {
      const promises = [];
      for (let i = 1000; i < count; i += 1000) {
        promises.push(
          adminClient
            .from("crm_leads")
            .select("lead_id, full_name, email, phone, lead_source, tags, lead_status, lead_category, company_name, created_at")
            .range(i, i + 999)
        );
      }
      const results = await Promise.all(promises);
      results.forEach(res => {
        if (res.data) leads.push(...res.data);
      });
    }
    return leads;
  } catch (err) {
    console.error("getAllLeads error:", err);
    return [];
  }
}

// Helper to filter leads based on list criteria (Sources & Tags)
export function filterLeadsForList(leads, selectedSources = [], selectedTags = []) {
  if ((!selectedSources || selectedSources.length === 0) && (!selectedTags || selectedTags.length === 0)) {
    return [];
  }

  const normalizedSources = (selectedSources || []).map(s => s.toLowerCase().trim()).filter(Boolean);
  const normalizedTags = (selectedTags || []).map(t => t.toLowerCase().trim()).filter(Boolean);

  return leads.filter(lead => {
    // Check Source Match
    let sourceMatched = normalizedSources.length === 0; // If no sources selected, source condition passes
    if (normalizedSources.length > 0 && lead.lead_source) {
      const leadSources = lead.lead_source.split(',').map(s => s.toLowerCase().trim());
      sourceMatched = normalizedSources.some(ns => leadSources.includes(ns));
    }

    // Check Tag Match
    let tagMatched = normalizedTags.length === 0; // If no tags selected, tag condition passes
    if (normalizedTags.length > 0 && lead.tags) {
      const leadTags = lead.tags.split(',').map(t => t.toLowerCase().trim());
      tagMatched = normalizedTags.some(nt => leadTags.includes(nt));
    }

    // Must match both selected source criteria and selected tag criteria (if configured)
    return sourceMatched && tagMatched;
  });
}

// GET /other-modules/crm/api/lists
export async function GET(request) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let lists = [];
    let isDb = true;

    // Try fetching from Supabase database
    const { data: dbLists, error: dbError } = await adminClient
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    if (dbError) {
      console.warn("Supabase crm_lists fetch warning, using file fallback:", dbError.message);
      isDb = false;
      lists = getFallbackLists();
    } else {
      lists = dbLists || [];
    }

    // Fetch leads to calculate unique dynamic matching leads per list
    const leads = await getAllLeads();

    // Extract all unique existing sources and tags from leads
    const allSourcesSet = new Set();
    const allTagsSet = new Set();

    leads.forEach(l => {
      if (l.lead_source) {
        l.lead_source.split(',').forEach(s => {
          const trimmed = s.trim();
          if (trimmed) allSourcesSet.add(trimmed);
        });
      }
      if (l.tags) {
        l.tags.split(',').forEach(t => {
          const trimmed = t.trim();
          if (trimmed) allTagsSet.add(trimmed);
        });
      }
    });

    // Populate matching lead count for each list
    const enrichedLists = lists.map(list => {
      const matchingLeads = filterLeadsForList(leads, list.selected_sources, list.selected_tags);
      return {
        ...list,
        matching_lead_count: matchingLeads.length
      };
    });

    return NextResponse.json({
      lists: enrichedLists,
      available_sources: Array.from(allSourcesSet).sort(),
      available_tags: Array.from(allTagsSet).sort(),
      total_leads: leads.length
    });
  } catch (error) {
    console.error("GET CRM Lists error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /other-modules/crm/api/lists - Create a new list
export async function POST(request) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, selected_sources, selected_tags } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "List name is required" }, { status: 400 });
    }

    const created_by = user.email || "User";
    const sourcesArr = Array.isArray(selected_sources) ? selected_sources : [];
    const tagsArr = Array.isArray(selected_tags) ? selected_tags : [];

    // Try inserting into Supabase DB
    const { data: dbData, error: dbError } = await adminClient
      .from(TABLE)
      .insert([
        {
          name: name.trim(),
          description: description?.trim() || "",
          selected_sources: sourcesArr,
          selected_tags: tagsArr,
          created_by
        }
      ])
      .select("*");

    if (!dbError && dbData && dbData.length > 0) {
      return NextResponse.json({ list: dbData[0] });
    }

    // Fallback file storage if DB table not yet created
    console.warn("DB insert error for crm_lists, using file fallback:", dbError?.message);
    const lists = getFallbackLists();
    const newList = {
      list_id: `list-${Date.now()}`,
      name: name.trim(),
      description: description?.trim() || "",
      selected_sources: sourcesArr,
      selected_tags: tagsArr,
      created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    lists.unshift(newList);
    saveFallbackLists(lists);

    return NextResponse.json({ list: newList });
  } catch (error) {
    console.error("POST CRM List error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /other-modules/crm/api/lists - Update an existing list
export async function PUT(request) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { list_id, name, description, selected_sources, selected_tags } = body;

    if (!list_id) {
      return NextResponse.json({ error: "list_id is required" }, { status: 400 });
    }

    const sourcesArr = Array.isArray(selected_sources) ? selected_sources : [];
    const tagsArr = Array.isArray(selected_tags) ? selected_tags : [];

    // Try DB update
    const { data: dbData, error: dbError } = await adminClient
      .from(TABLE)
      .update({
        name: name?.trim(),
        description: description?.trim() || "",
        selected_sources: sourcesArr,
        selected_tags: tagsArr,
        updated_at: new Date().toISOString()
      })
      .eq("list_id", list_id)
      .select("*");

    if (!dbError && dbData && dbData.length > 0) {
      return NextResponse.json({ list: dbData[0] });
    }

    // Fallback file update
    const lists = getFallbackLists();
    const idx = lists.findIndex(l => String(l.list_id) === String(list_id));
    if (idx !== -1) {
      lists[idx] = {
        ...lists[idx],
        name: name ? name.trim() : lists[idx].name,
        description: description !== undefined ? description.trim() : lists[idx].description,
        selected_sources: sourcesArr,
        selected_tags: tagsArr,
        updated_at: new Date().toISOString()
      };
      saveFallbackLists(lists);
      return NextResponse.json({ list: lists[idx] });
    }

    return NextResponse.json({ error: "List not found" }, { status: 404 });
  } catch (error) {
    console.error("PUT CRM List error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /other-modules/crm/api/lists - Delete a list
export async function DELETE(request) {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const list_id = searchParams.get("list_id");

    if (!list_id) {
      return NextResponse.json({ error: "list_id parameter is required" }, { status: 400 });
    }

    // Try DB delete
    const { error: dbError } = await adminClient
      .from(TABLE)
      .delete()
      .eq("list_id", list_id);

    if (!dbError) {
      return NextResponse.json({ success: true });
    }

    // Fallback file delete
    let lists = getFallbackLists();
    lists = lists.filter(l => String(l.list_id) !== String(list_id));
    saveFallbackLists(lists);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE CRM List error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
