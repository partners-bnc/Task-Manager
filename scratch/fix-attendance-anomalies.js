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
    console.log("=== Correcting Attendance Anomalies ===");

    // Fetch records to see what we are updating
    const { data: anomalies, error: fetchError } = await supabase
      .from('hrm_attendance')
      .select('id, employee_id, date, status, check_in, check_out')
      .is('check_out', null)
      .not('check_in', 'is', null)
      .neq('status', 'halfday');

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${anomalies.length} records with check-in but no check-out that do not have 'halfday' status.`);

    if (anomalies.length === 0) {
      console.log("No anomalies to correct.");
      return;
    }

    // Print out a few of them
    console.log("Sample anomalies:", JSON.stringify(anomalies.slice(0, 5), null, 2));

    // Update them
    console.log("Updating statuses to 'halfday'...");
    const { data: updated, error: updateError } = await supabase
      .from('hrm_attendance')
      .update({ status: 'halfday' })
      .is('check_out', null)
      .not('check_in', 'is', null)
      .neq('status', 'halfday')
      .select('id, employee_id, date, status');

    if (updateError) {
      throw updateError;
    }

    console.log(`Successfully updated ${updated.length} records to 'halfday'.`);

  } catch (err) {
    console.error("Error correcting anomalies:", err.message);
  }
}

run();
