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
    console.log("Checking hrm_attendance column definitions...");
    
    const { data: cols, error: colError } = await supabase
      .from('hrm_attendance')
      .select('*')
      .limit(1);

    if (colError) {
      console.error(colError);
      return;
    }
    
    console.log("Column keys found in one row:", Object.keys(cols[0] || {}));

    // Query information_schema via RPC or check if postgREST lets us query information_schema.columns
    // PostgREST only exposes exposed schemas, not information_schema.
    // So we can query via catalog if we create a temporary view or function, or query public schema.
    // Let's print the structure of the row we got.
    console.log("Sample Row:", JSON.stringify(cols[0], null, 2));

  } catch (err) {
    console.error(err);
  }
}

run();
