import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { adminClient } from "@/utils/supabase/admin";
import { resolveAuthenticatedUserContext } from "@/utils/auth/context";

const DB_LIMITS = {
  full_name: 150,
  phone: 20,
  phone_alt: 20,
  whatsapp: 20,
  email: 150,
  email_alt: 150,
  country: 80,
  city: 80,
  state: 80,
  company_name: 150,
  designation: 100,
  industry: 100,
  website: 200,
  company_size: 30,
  business_country: 80,
  business_city: 80,
  lead_source: 80,
  lead_category: 80,
  lead_type: 50,
  lead_status: 50,
  priority: 10,
  tags: 300,
  assigned_to: 100,
  source_batch: 150,
  salutation: 20,
  gender: 20,
  timezone: 50,
  preferred_language: 50,
  linkedin_url: 255,
  twitter_url: 255,
  github_url: 255,
  portfolio_url: 255,
  email_consent_status: 50,
  consent_source: 150,
  preferred_contact_method: 50,
  skills: 500
};

const EXP_LIMITS = {
  company_name: 200,
  job_title: 150,
  company_industry: 100,
  skills_used: 500
};

const EDU_LIMITS = {
  institution_name: 200,
  degree: 150,
  field_of_study: 150,
  grade: 50
};

function sanitizeLead(lead) {
  const sanitized = {};
  for (const key in lead) {
    const val = lead[key];
    if (typeof val === 'string') {
      const limit = DB_LIMITS[key];
      sanitized[key] = limit ? val.substring(0, limit) : val;
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

function sanitizeExperience(exp) {
  const sanitized = {};
  for (const key in exp) {
    const val = exp[key];
    if (typeof val === 'string') {
      const limit = EXP_LIMITS[key];
      sanitized[key] = limit ? val.substring(0, limit) : val;
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

function sanitizeEducation(edu) {
  const sanitized = {};
  for (const key in edu) {
    const val = edu[key];
    if (typeof val === 'string') {
      const limit = EDU_LIMITS[key];
      sanitized[key] = limit ? val.substring(0, limit) : val;
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

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

      const { notes, next_followup_date, last_contacted, experiences, educations, ...leadData } = lead;
      const sanitizedLeadData = sanitizeLead(leadData);
      const sanitizedExperiences = Array.isArray(experiences) ? experiences.map(sanitizeExperience) : [];
      const sanitizedEducations = Array.isArray(educations) ? educations.map(sanitizeEducation) : [];

      if (duplicateMatch) {
        if (strategy === 'overwrite') {
          leadsToUpdate.push({
            lead_id: duplicateMatch.lead_id,
            ...sanitizedLeadData,
            notes_original: notes,
            next_followup_date_original: next_followup_date,
            last_contacted_original: last_contacted,
            experiences_original: sanitizedExperiences,
            educations_original: sanitizedEducations,
            updated_by: resolvedUserDetails
          });
        } else if (strategy === 'anyway') {
          leadsToInsert.push({
            ...sanitizedLeadData,
            notes_original: notes,
            next_followup_date_original: next_followup_date,
            last_contacted_original: last_contacted,
            experiences_original: sanitizedExperiences,
            educations_original: sanitizedEducations,
            created_by: resolvedUserDetails
          });
        } else {
          skippedCount++;
        }
      } else {
        leadsToInsert.push({
          ...sanitizedLeadData,
          notes_original: notes,
          next_followup_date_original: next_followup_date,
          last_contacted_original: last_contacted,
          experiences_original: sanitizedExperiences,
          educations_original: sanitizedEducations,
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
        const dbChunk = chunk.map(({ 
          notes_original, 
          next_followup_date_original, 
          last_contacted_original, 
          experiences_original, 
          educations_original, 
          ...rest 
        }) => rest);
        
        let insertedRows = [];
        const { data: batchData, error } = await adminClient
          .from('crm_leads')
          .insert(dbChunk)
          .select('lead_id, phone, email, full_name');
          
        if (error) {
          console.warn("Batch insert failed, falling back to individual insertion:", error.message);
          // Fall back to individual inserts for this chunk
          for (const leadItem of dbChunk) {
            const { data: singleData, error: singleError } = await adminClient
              .from('crm_leads')
              .insert(leadItem)
              .select('lead_id, phone, email, full_name')
              .maybeSingle();
              
            if (singleError) {
              console.error("Skipping lead due to insertion error:", singleError.message, leadItem);
              skippedCount++;
            } else if (singleData) {
              insertedRows.push(singleData);
              insertedCount++;
            }
          }
        } else {
          insertedRows = batchData || [];
          insertedCount += insertedRows.length;
        }

        // Save followups, experiences, and educations for each successfully inserted lead
        if (insertedRows && insertedRows.length > 0) {
          const followupsToInsert = [];
          const experiencesToInsert = [];
          const educationsToInsert = [];
          
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
              const experiences = originalItem.experiences_original;
              const educations = originalItem.educations_original;
              
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

              if (experiences && Array.isArray(experiences)) {
                experiences.forEach(exp => {
                  if (exp.company_name || exp.job_title) {
                    experiencesToInsert.push({
                      lead_id: row.lead_id,
                      company_name: exp.company_name,
                      job_title: exp.job_title,
                      joining_date: exp.joining_date || null,
                      leave_date: exp.leave_date || null,
                      duration_years: exp.duration_years || null,
                      company_industry: exp.company_industry || null,
                      responsibilities: exp.responsibilities || null,
                      skills_used: exp.skills_used || null
                    });
                  }
                });
              }

              if (educations && Array.isArray(educations)) {
                educations.forEach(edu => {
                  if (edu.institution_name) {
                    educationsToInsert.push({
                      lead_id: row.lead_id,
                      institution_name: edu.institution_name,
                      degree: edu.degree || null,
                      field_of_study: edu.field_of_study || null,
                      start_date: edu.start_date || null,
                      end_date: edu.end_date || null,
                      grade: edu.grade || null,
                      activities: edu.activities || null
                    });
                  }
                });
              }
            }
          });
          
          if (followupsToInsert.length > 0) {
            try {
              await adminClient.from('crm_follow_ups').insert(followupsToInsert);
            } catch (fErr) {
              console.error("Error inserting followups for bulk imported leads:", fErr.message);
            }
          }
          if (experiencesToInsert.length > 0) {
            try {
              await adminClient.from('crm_lead_experiences').insert(experiencesToInsert);
            } catch (expErr) {
              console.error("Error inserting experiences for bulk imported leads:", expErr.message);
            }
          }
          if (educationsToInsert.length > 0) {
            try {
              await adminClient.from('crm_lead_educations').insert(educationsToInsert);
            } catch (eduErr) {
              console.error("Error inserting educations for bulk imported leads:", eduErr.message);
            }
          }
        }
      }
    }

    // 4. Update individually using adminClient
    if (leadsToUpdate.length > 0) {
      for (let lead of leadsToUpdate) {
        try {
          const { 
            lead_id, 
            notes_original, 
            next_followup_date_original, 
            last_contacted_original, 
            experiences_original,
            educations_original,
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

          // Handle experiences update
          if (experiences_original && Array.isArray(experiences_original)) {
            await adminClient.from("crm_lead_experiences").delete().eq("lead_id", lead_id);
            if (experiences_original.length > 0) {
              const formattedExp = experiences_original.map(exp => ({
                lead_id: lead_id,
                company_name: exp.company_name || 'Unknown Company',
                job_title: exp.job_title || 'Unknown Position',
                joining_date: exp.joining_date || null,
                leave_date: exp.leave_date || null,
                duration_years: exp.duration_years || null,
                company_industry: exp.company_industry || null,
                responsibilities: exp.responsibilities || null,
                skills_used: exp.skills_used || null
              }));
              await adminClient.from("crm_lead_experiences").insert(formattedExp);
            }
          }

          // Handle educations update
          if (educations_original && Array.isArray(educations_original)) {
            await adminClient.from("crm_lead_educations").delete().eq("lead_id", lead_id);
            if (educations_original.length > 0) {
              const formattedEdu = educations_original.map(edu => ({
                lead_id: lead_id,
                institution_name: edu.institution_name,
                degree: edu.degree || null,
                field_of_study: edu.field_of_study || null,
                start_date: edu.start_date || null,
                end_date: edu.end_date || null,
                grade: edu.grade || null,
                activities: edu.activities || null
              }));
              await adminClient.from("crm_lead_educations").insert(formattedEdu);
            }
          }
          
          updatedCount++;
        } catch (updateErr) {
          console.error(`Skipping duplicate update for lead ${lead.lead_id} due to error:`, updateErr.message);
          skippedCount++;
        }
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
