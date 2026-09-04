import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY
);

async function testFullFlow() {
  // Get an active employee
  const { data: emp } = await adminClient
    .from('hrm_employees')
    .select('id, name')
    .eq('name', 'Rosy Dahiya')
    .maybeSingle();

  if (!emp) {
    console.log('Rosy Dahiya not found, picking first employee');
  }

  const targetEmp = emp || (await adminClient.from('hrm_employees').select('id, name').limit(1).single()).data;
  console.log('Testing flow for employee:', targetEmp.name, targetEmp.id);

  // Call internal override logic by inserting an hr_override request then reversing it
  const { data: lopType } = await adminClient
    .from('hrm_leave_types')
    .select('id, name')
    .limit(1)
    .single();


  console.log('LOP Leave Type:', lopType);

  // 1. Create first hr_override leave request
  const { data: req1, error: err1 } = await adminClient
    .from('hrm_leave_requests')
    .insert({
      employee_id: targetEmp.id,
      leave_type_id: lopType.id,
      start_date: '2026-08-28',
      end_date: '2026-08-28',
      session: 'full_day',
      status: 'approved',
      duration_days: 1,
      approved_days: 1,
      paid_days: 0,
      lop_days: 1,
      request_source: 'hr_override',
    })
    .select('*')
    .single();

  console.log('Insert override 1:', req1?.id, err1?.message || 'SUCCESS');

  if (req1?.id) {
    // 2. Now reverse it by setting status to 'cancelled' (our fix)
    const { error: cancelErr } = await adminClient
      .from('hrm_leave_requests')
      .update({
        status: 'cancelled',
        review_note: 'Reversed by test',
      })
      .eq('id', req1.id);

    console.log('Reverse override 1 to cancelled:', cancelErr?.message || 'SUCCESS');

    // 3. Clean up
    await adminClient.from('hrm_leave_requests').delete().eq('id', req1.id);
  }
}

testFullFlow();
