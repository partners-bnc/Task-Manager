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
    const employeeId = '4404d98d-67cb-405b-bcc9-0e7a37f51f44'; // Rohan (E106)
    console.log("Checking leave requests for Rohan in July 2026...");
    
    const { data: leaves, error } = await supabase
      .from('hrm_leave_requests')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('start_date', '2026-07-01')
      .lte('end_date', '2026-07-31');

    if (error) {
      console.error(error);
      return;
    }

    console.log("Leaves found:", JSON.stringify(leaves, null, 2));
  } catch (err) {
    console.error(err);
  }
}

run();
