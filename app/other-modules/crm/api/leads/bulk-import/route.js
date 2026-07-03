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

      const { notes, next_followup_date, last_contacted, ...leadData } = lead;

      if (duplicateMatch) {
        if (strategy === 'overwrite') {
          leadsToUpdate.push({
            lead_id: duplicateMatch.lead_id,
            ...leadData,
            notes_original: notes,
            next_followup_date_original: next_followup_date,
            last_contacted_original: last_contacted,
            updated_by: resolvedUserDetails
          });
        } else if (strategy === 'anyway') {
          leadsToInsert.push({
            ...leadData,
            notes_original: notes,
            next_followup_date_original: next_followup_date,
            last_contacted_original: last_contacted,
            created_by: resolvedUserDetails
          });
        } else {
          skippedCount++;
        }
      } else {
        leadsToInsert.push({
          ...leadData,
          notes_original: notes,
          next_followup_date_original: next_followup_date,
          last_contacted_original: last_contacted,
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
        
        // Strip out the custom tracking fields before database insert
        const dbChunk = chunk.map(({ notes_original, next_followup_date_original, last_contacted_original, ...rest }) => rest);
        
        const { data: insertedRows, error } = await adminClient
          .from('crm_leads')
          .insert(dbChunk)
          .select('lead_id, phone, email, full_name');
          
        if (error) throw error;

        // Save followups for each successfully inserted lead
        if (insertedRows && insertedRows.length > 0) {
          const followupsToInsert = [];
          
          insertedRows.forEach(row => {
            const originalItem = chunk.find(item => 
              (item.phone && item.phone === row.phone) || 
              (item.email && item.email === row.email) ||
              (item.full_name === row.full_name)
            );
            
            if (originalItem) {
              const notes = originalItem.notes_original;
              const last_contacted = originalItem.last_contacted_original;
              const next_followup_date = originalItem.next_followup_date_original;
              
              if (notes) {
                followupsToInsert.push({
                  lead_id: row.lead_id,
                  followup_type: "Call",
                  direction: "Outbound",
                  status: "Completed",
                  scheduled_at: last_contacted ? new Date(last_contacted).toISOString() : new Date().toISOString(),
                  completed_at: last_contacted ? new Date(last_contacted).toISOString() : new Date().toISOString(),
                  outcome: notes,
                  assigned_to: resolvedUserDetails
                });
              } else if (last_contacted) {
                followupsToInsert.push({
                  lead_id: row.lead_id,
                  followup_type: "Call",
                  direction: "Outbound",
                  status: "Completed",
                  scheduled_at: new Date(last_contacted).toISOString(),
                  completed_at: new Date(last_contacted).toISOString(),
                  outcome: "Contacted lead",
                  assigned_to: resolvedUserDetails
                });
              }
              
              if (next_followup_date) {
                followupsToInsert.push({
                  lead_id: row.lead_id,
                  followup_type: "Call",
                  direction: "Outbound",
                  status: "Scheduled",
                  scheduled_at: new Date(next_followup_date).toISOString(),
                  completed_at: null,
                  outcome: "Scheduled next contact",
                  next_followup_date,
                  assigned_to: resolvedUserDetails
                });
              }
            }
          });
          
          if (followupsToInsert.length > 0) {
            const { error: fErr } = await adminClient.from('crm_follow_ups').insert(followupsToInsert);
            if (fErr) console.error("Error inserting followups for bulk imported leads:", fErr);
          }
        }
      }
      insertedCount = leadsToInsert.length;
    }

    // 4. Update individually using adminClient
    if (leadsToUpdate.length > 0) {
      for (let lead of leadsToUpdate) {
        const { 
          lead_id, 
          notes_original, 
          next_followup_date_original, 
          last_contacted_original, 
          ...updates 
        } = lead;
        
        const { error } = await adminClient.from('crm_leads').update(updates).eq('lead_id', lead_id);
        if (error) throw error;
        
        // Handle notes / last contacted followup update
        if (notes_original) {
          await adminClient.from('crm_follow_ups').insert({
            lead_id,
            followup_type: "Call",
            direction: "Outbound",
            status: "Completed",
            scheduled_at: last_contacted_original ? new Date(last_contacted_original).toISOString() : new Date().toISOString(),
            completed_at: last_contacted_original ? new Date(last_contacted_original).toISOString() : new Date().toISOString(),
            outcome: notes_original,
            assigned_to: resolvedUserDetails
          });
        } else if (last_contacted_original) {
          await adminClient.from('crm_follow_ups').insert({
            lead_id,
            followup_type: "Call",
            direction: "Outbound",
            status: "Completed",
            scheduled_at: new Date(last_contacted_original).toISOString(),
            completed_at: new Date(last_contacted_original).toISOString(),
            outcome: "Contacted lead",
            assigned_to: resolvedUserDetails
          });
        }
        
        // Handle next followup date update
        if (next_followup_date_original) {
          await adminClient.from('crm_follow_ups').delete().eq('lead_id', lead_id).eq('status', 'Scheduled');
          
          await adminClient.from('crm_follow_ups').insert({
            lead_id,
            followup_type: "Call",
            direction: "Outbound",
            status: "Scheduled",
            scheduled_at: new Date(next_followup_date_original).toISOString(),
            completed_at: null,
            outcome: "Scheduled next contact",
            next_followup_date: next_followup_date_original,
            assigned_to: resolvedUserDetails
          });
        }
        
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
