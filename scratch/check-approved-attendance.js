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
    console.log("=== Checking Approved Regularization Attendance ===");

    // Fetch regularization requests for 2026-06-30
    const { data: requests, error: reqError } = await supabase
      .from('hrm_regularization_requests')
      .select('id, employee_id, date, status, request_type')
      .eq('date', '2026-06-30')
      .eq('status', 'approved');

    if (reqError) throw reqError;

    console.log(`Found ${requests.length} approved requests on 2026-06-30:`);

    for (const r of requests) {
      const { data: emp } = await supabase.from('hrm_employees').select('name').eq('id', r.employee_id).single();
      const { data: att } = await supabase.from('hrm_attendance').select('*').eq('employee_id', r.employee_id).eq('date', '2026-06-30').maybeSingle();

      console.log(`\nEmployee: ${emp?.name || r.employee_id}`);
      console.log(`Request Status: ${r.status}`);
      console.log(`Attendance Row:`, JSON.stringify(att, null, 2));
    }

  } catch (err) {
    console.error(err);
  }
}

run();
