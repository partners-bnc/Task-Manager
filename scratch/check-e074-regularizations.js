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
    console.log("=== Checking Regularization for E074 (April to June 2026) ===");

    // Fetch E074 UUID
    const { data: employee } = await supabase
      .from('hrm_employees')
      .select('id, name, employee_id')
      .eq('employee_id', 'E074')
      .maybeSingle();

    if (!employee) {
      console.log("Employee E074 not found.");
      return;
    }

    console.log("Found Employee:", employee);

    // Fetch regularization requests
    const { data: requests, error } = await supabase
      .from('hrm_regularization_requests')
      .select('*')
      .eq('employee_id', employee.id)
      .gte('date', '2026-04-01')
      .lte('date', '2026-06-30')
      .order('date', { ascending: true });

    if (error) throw error;

    console.log(`Found ${requests.length} requests for E074:`);
    console.log(JSON.stringify(requests, null, 2));

  } catch (err) {
    console.error(err);
  }
}

run();
