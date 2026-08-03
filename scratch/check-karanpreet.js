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
    console.log("=== Checking Karanpreet Kaur (E073) ===");

    // Find Karanpreet Kaur's UUID
    const { data: employee, error: empError } = await supabase
      .from('hrm_employees')
      .select('id, name, employee_id')
      .eq('employee_id', 'E073')
      .maybeSingle();

    if (empError || !employee) {
      console.error("Employee not found:", empError);
      return;
    }

    console.log("Found Employee:", employee);

    // Fetch attendance record for 2026-07-18
    const { data: att, error: attError } = await supabase
      .from('hrm_attendance')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('date', '2026-07-18')
      .maybeSingle();

    if (attError) {
      console.error("Error fetching attendance:", attError);
      return;
    }

    console.log("Attendance Record in DB:", JSON.stringify(att, null, 2));

  } catch (err) {
    console.error(err);
  }
}

run();
