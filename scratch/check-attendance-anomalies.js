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

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log("Analyzing attendance anomalies (Missing check-out with 'present' status)...");
    
    // Fetch all attendance records where check_in is present, check_out is NULL, and status is 'present'
    const { data, error } = await supabase
      .from('hrm_attendance')
      .select('id, employee_id, date, status, check_in, check_out, source, created_at, updated_at, hrm_employees(name, employee_id)')
      .is('check_out', null)
      .not('check_in', 'is', null)
      .eq('status', 'present')
      .order('date', { ascending: false });

    if (error) {
      console.error("Database query failed:", error);
      return;
    }

    console.log(`Found ${data.length} records matching the anomaly.`);
    const employeesMap = {};
    
    data.forEach(row => {
      const emp = row.hrm_employees || { name: 'Unknown', employee_id: 'Unknown' };
      const key = `${emp.name} (${emp.employee_id})`;
      if (!employeesMap[key]) {
        employeesMap[key] = [];
      }
      employeesMap[key].push({
        date: row.date,
        check_in: row.check_in,
        source: row.source,
        created_at: row.created_at,
        updated_at: row.updated_at
      });
    });

    for (const [employee, records] of Object.entries(employeesMap)) {
      console.log(`\nEmployee: ${employee} (${records.length} anomalies)`);
      records.slice(0, 10).forEach(r => {
        console.log(`  - Date: ${r.date}, Check-in: ${r.check_in}, Source: ${r.source}, Created: ${r.created_at}`);
      });
      if (records.length > 10) {
        console.log(`  ... and ${records.length - 10} more`);
      }
    }
  } catch (err) {
    console.error("Execution failed:", err);
  }
}

run();
