import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY
);



async function checkConstraint() {
  const { data: distinctStatuses } = await adminClient
    .from('hrm_leave_requests')
    .select('status');
  
  const statusSet = new Set(distinctStatuses?.map(d => d.status));
  console.log('Distinct statuses currently in DB:', Array.from(statusSet));

  // Let's test what values fail hrm_leave_requests_status_check
  const testStatuses = ['pending', 'approved', 'rejected', 'cancelled', 'Pending', 'Approved', 'Rejected', 'Reversed', 'reversed', 'on_leave', 'absent', 'lop'];
  for (const s of testStatuses) {
    const { error } = await adminClient.from('hrm_leave_requests').insert({
      employee_id: '00000000-0000-0000-0000-000000000000', // dummy
      leave_type_id: '00000000-0000-0000-0000-000000000000',
      start_date: '2026-08-28',
      end_date: '2026-08-28',
      duration_days: 1,
      session: 'full_day',
      status: s,

    });
    console.log(`Status '${s}' insert error:`, error?.message || 'NO ERROR (FK/other error)');
  }

}

checkConstraint();

