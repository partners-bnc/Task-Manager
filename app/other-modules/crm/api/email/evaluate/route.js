import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { event, lead, action } = await request.json();

    // Fetch active triggers
    const { data: triggers, error } = await supabase
      .from('crm_email_triggers')
      .select('*')
      .eq('status', 'Active');

    if (error) throw error;
    if (!triggers || triggers.length === 0) return NextResponse.json({ success: true, matched: 0 });

    let matched = 0;
    
    // Evaluate rules
    for (const trigger of triggers) {
      let isMatch = false;
      
      if (trigger.event === event) {
        // Evaluate condition
        // e.g. "Source = 'Website'"
        if (!trigger.condition_expression || trigger.condition_expression === 'None') {
          isMatch = true;
        } else {
          // Simple string matching based on the mock data formats
          if (trigger.condition_expression.includes("Source = 'Website'") && lead.source === 'Website') isMatch = true;
          if (trigger.condition_expression.includes("Source = 'Organic'") && lead.source === 'Organic') isMatch = true;
          if (trigger.condition_expression.includes("Priority = 'High'") && lead.priority === 'High') isMatch = true;
          if (trigger.condition_expression.includes("Value > $5,000")) {
             const numericVal = parseFloat((lead.value || "").replace(/[^0-9.-]+/g,""));
             if (numericVal > 5000) isMatch = true;
          }
        }
      }

      if (isMatch) {
         matched++;
         // Insert into email_outbox to be processed by email-dispatcher
         await supabase.from('email_outbox').insert({
            event_type: 'employee_created', // using existing allowed type for mock
            recipient_email: 'admin@tasksflow.com',
            payload: {
               employee_name: lead.contact,
               task_name: 'Trigger Demo: ' + trigger.name,
               due_date: 'N/A'
            }
         });
      }
    }

    return NextResponse.json({ success: true, matched });
  } catch (err) {
    console.error('Trigger evaluation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
