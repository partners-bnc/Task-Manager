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
    console.log("=== Checking All Rohan's Regularization Requests ===");

    // Fetch Rohan's UUID
    const { data: employee } = await supabase
      .from('hrm_employees')
      .select('id, name, employee_id')
      .eq('employee_id', 'E106')
      .single();

    // Fetch all regularization requests for Rohan
    const { data: requests, error: reqError } = await supabase
      .from('hrm_regularization_requests')
      .select('*')
      .eq('employee_id', employee.id)
      .order('date', { ascending: false });

    if (reqError) throw reqError;

    console.log(`Found ${requests.length} regularization requests for Rohan across all time:`);
    console.log(JSON.stringify(requests.map(r => ({ id: r.id, date: r.date, status: r.status })), null, 2));

  } catch (err) {
    console.error(err);
  }
}

run();
