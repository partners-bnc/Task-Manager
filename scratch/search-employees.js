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
    console.log("=== Searching for Employees named Rohan/Dangi ===");

    const { data: employees, error: empError } = await supabase
      .from('hrm_employees')
      .select('id, name, employee_id, email')
      .or('name.ilike.%rohan%,name.ilike.%dangi%,employee_id.eq.E106');

    if (empError) throw empError;

    console.log(`Found ${employees.length} employees:`);
    console.log(JSON.stringify(employees, null, 2));

  } catch (err) {
    console.error(err);
  }
}

run();
