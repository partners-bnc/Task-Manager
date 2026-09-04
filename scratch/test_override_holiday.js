import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY
);

async function testOverride() {
  const { data: emp } = await adminClient
    .from('hrm_employees')
    .select('id, name')
    .limit(1)
    .single();

  const { data: leaveType } = await adminClient
    .from('hrm_leave_types')
    .select('id, name')
    .limit(1)
    .single();

  console.log('Testing with employee:', emp.name, 'and leaveType:', leaveType.name);

  // 1. Insert an approved hr_override leave request
  const { data: req, error: insertErr } = await adminClient
    .from('hrm_leave_requests')
    .insert({
      employee_id: emp.id,
      leave_type_id: leaveType.id,
      start_date: '2099-01-01',
      end_date: '2099-01-01',
      session: 'full_day',
      status: 'approved',
      duration_days: 1,
      request_source: 'hr_override',
    })
    .select('*')
    .single();

  console.log('Inserted dummy request:', req?.id, insertErr?.message);

  if (req?.id) {
    // 2. Try updating status to 'reversed' (what code currently does)
    const { error: reverseErr } = await adminClient
      .from('hrm_leave_requests')
      .update({ status: 'reversed' })
      .eq('id', req.id);
    console.log("Updating status to 'reversed' error:", reverseErr?.message);

    // 3. Try updating status to 'cancelled'
    const { error: cancelErr } = await adminClient
      .from('hrm_leave_requests')
      .update({ status: 'cancelled' })
      .eq('id', req.id);
    console.log("Updating status to 'cancelled' error:", cancelErr?.message || 'SUCCESS!');

    // Cleanup
    await adminClient.from('hrm_leave_requests').delete().eq('id', req.id);
  }
}

testOverride();

