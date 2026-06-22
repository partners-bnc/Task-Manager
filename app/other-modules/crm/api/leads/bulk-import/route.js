import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { adminClient } from "@/utils/supabase/admin";
import { resolveAuthenticatedUserContext } from "@/utils/auth/context";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let resolvedUserDetails = 'System';
    try {
      const authContext = await resolveAuthenticatedUserContext(supabase, user);
      const displayName = authContext?.user?.name || user.user_metadata?.full_name || user.email || 'User';
      const email = authContext?.user?.email || user.email || '';
      resolvedUserDetails = `${displayName} (${email})`;
    } catch (err) {
      console.error("Error resolving user context in bulk import:", err);
      resolvedUserDetails = user.email ? `${user.user_metadata?.full_name || user.email} (${user.email})` : 'System';
    }

    const { leads, strategy } = await request.json();

    if (!leads || !Array.isArray(leads)) {
      return NextResponse.json({ error: "Invalid leads data provided." }, { status: 400 });
    }

    const leadsToInsert = [];
    const leadsToUpdate = [];
    let skippedCount = 0;

    // 1. Extract phone and email addresses to check for duplicates in the DB
    const phonesToCheck = leads.map(l => l.phone).filter(Boolean);
    const emailsToCheck = leads.map(l => l.email).filter(Boolean);

    let existingInDb = [];

    if (phonesToCheck.length > 0 || emailsToCheck.length > 0) {
      let queryParts = [];
      if (phonesToCheck.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < phonesToCheck.length; i += batchSize) {
          const chunk = phonesToCheck.slice(i, i + batchSize);
          queryParts.push(`phone.in.(${chunk.map(p => `"${p}"`).join(',')})`);
        }
      }
      if (emailsToCheck.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < emailsToCheck.length; i += batchSize) {
          const chunk = emailsToCheck.slice(i, i + batchSize);
          queryParts.push(`email.in.(${chunk.map(e => `"${e}"`).join(',')})`);
        }
      }

      // Check duplicates using adminClient to bypass RLS policies
      const { data, error } = await adminClient
        .from('crm_leads')
        .select('lead_id, full_name, phone, email')
        .or(queryParts.join(','));

      if (error) throw error;
      existingInDb = data || [];
    }

    // 2. Classify leads into insert, update, or skip
    leads.forEach(lead => {
      const duplicateMatch = existingInDb.find(dbItem => 
        (lead.phone && dbItem.phone === lead.phone) || 
        (lead.email && dbItem.email === lead.email)
      );

      if (duplicateMatch) {
        if (strategy === 'overwrite') {
          leadsToUpdate.push({
            lead_id: duplicateMatch.lead_id,
            ...lead,
            updated_by: resolvedUserDetails
          });
        } else if (strategy === 'anyway') {
          leadsToInsert.push({
            ...lead,
            created_by: resolvedUserDetails
          });
        } else {
          skippedCount++;
        }
      } else {
        leadsToInsert.push({
          ...lead,
          created_by: resolvedUserDetails
        });
      }
    });

    let insertedCount = 0;
    let updatedCount = 0;

    // 3. Batch insert using adminClient
    if (leadsToInsert.length > 0) {
      const chunkSize = 100;
      for (let i = 0; i < leadsToInsert.length; i += chunkSize) {
        const chunk = leadsToInsert.slice(i, i + chunkSize);
        const { error } = await adminClient.from('crm_leads').insert(chunk);
        if (error) throw error;
      }
      insertedCount = leadsToInsert.length;
    }

    // 4. Update individually using adminClient
    if (leadsToUpdate.length > 0) {
      for (let lead of leadsToUpdate) {
        const { lead_id, ...updates } = lead;
        const { error } = await adminClient.from('crm_leads').update(updates).eq('lead_id', lead_id);
        if (error) throw error;
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      inserted: insertedCount,
      updated: updatedCount,
      skipped: skippedCount
    });
  } catch (error) {
    console.error("Bulk import server error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
