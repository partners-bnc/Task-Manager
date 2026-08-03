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
    console.log("=== Updating Existing Employee Shift Timings ===");

    // Fetch employee records with the old shift
    const { data: employees, error: fetchError } = await supabase
      .from('hrm_employees')
      .select('id, name, working_hours_start, working_hours_end')
      .eq('working_hours_start', '10:00:00')
      .eq('working_hours_end', '19:00:00');

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${employees.length} employees with the old 10:00 AM - 7:00 PM shift.`);

    if (employees.length === 0) {
      console.log("No employees to update.");
      return;
    }

    // Update them
    console.log("Updating shift timings to 09:00:00 - 17:30:00...");
    const { data: updated, error: updateError } = await supabase
      .from('hrm_employees')
      .update({
        working_hours_start: '09:00:00',
        working_hours_end: '17:30:00'
      })
      .eq('working_hours_start', '10:00:00')
      .eq('working_hours_end', '19:00:00')
      .select('id, name');

    if (updateError) {
      throw updateError;
    }

    console.log(`Successfully updated ${updated.length} employees' shift timings.`);

  } catch (err) {
    console.error("Error updating shifts:", err.message);
  }
}

run();
