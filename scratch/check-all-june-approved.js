const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually from .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log("=== Checking All Approved Regularizations for June 2026 ===");

    // Fetch all approved requests in June 2026
    const { data: requests, error: reqError } = await supabase
      .from('hrm_regularization_requests')
      .select('id, employee_id, date, status, approval_outcome')
      .gte('date', '2026-06-01')
      .lte('date', '2026-06-30')
      .eq('status', 'approved')
      .order('date', { ascending: true });

    if (reqError) throw reqError;

    console.log(`Found ${requests.length} approved regularization requests in June 2026.`);

    let countNotPresent = 0;
    for (const r of requests) {
      const { data: att } = await supabase
        .from('hrm_attendance')
        .select('*')
        .eq('employee_id', r.employee_id)
        .eq('date', r.date)
        .maybeSingle();

      const name = r.employee_id; // Just placeholder or we can resolve it

      if (!att || (att.status !== 'present' && att.status !== 'halfday' && att.status !== 'on_leave')) {
        console.log(`\nAnomaly found for Request ID ${r.id} on ${r.date}:`);
        console.log(`Employee UUID: ${r.employee_id}`);
        console.log(`Attendance Row:`, JSON.stringify(att, null, 2));
        countNotPresent++;
      } else if (att.status === 'halfday') {
        console.log(`\nApproved as Halfday/Present check for ${r.date}:`);
        console.log(`Employee UUID: ${r.employee_id}`);
        console.log(`Attendance Row:`, JSON.stringify(att, null, 2));
      }
    }

    console.log(`Check complete. Found ${countNotPresent} records with missing/incorrect attendance statuses.`);

  } catch (err) {
    console.error(err);
  }
}

run();
