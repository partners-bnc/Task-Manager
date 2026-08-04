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
    console.log("=== Checking Rohan Rajashekhar Dangi (E106) ===");

    // Fetch Rohan's UUID
    const { data: employee, error: empError } = await supabase
      .from('hrm_employees')
      .select('id, name, employee_id')
      .eq('employee_id', 'E106')
      .maybeSingle();

    if (empError || !employee) {
      console.error("Employee not found:", empError);
      return;
    }

    console.log("Found Employee:", employee);

    // Fetch any regularization requests for Rohan in June 2026
    const { data: requests, error: reqError } = await supabase
      .from('hrm_regularization_requests')
      .select('*')
      .eq('employee_id', employee.id)
      .gte('date', '2026-06-01')
      .lte('date', '2026-06-30');

    if (reqError) {
      throw reqError;
    }

    console.log(`Found ${requests.length} regularization requests for Rohan in June 2026:`);
    console.log(JSON.stringify(requests, null, 2));

    // Fetch Rohan's attendance for those dates: June 23, 25, 30
    const { data: attendance, error: attError } = await supabase
      .from('hrm_attendance')
      .select('*')
      .eq('employee_id', employee.id)
      .in('date', ['2026-06-23', '2026-06-25', '2026-06-30']);

    if (attError) {
      throw attError;
    }

    console.log(`Rohan's attendance for June 23, 25, 30:`);
    console.log(JSON.stringify(attendance, null, 2));

  } catch (err) {
    console.error(err);
  }
}

run();
