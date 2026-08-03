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
    console.log("Checking database triggers on public.hrm_attendance...");
    const { data, error } = await supabase.rpc('get_triggers_for_table', { table_name: 'hrm_attendance' });
    
    if (error) {
      // If RPC doesn't exist, execute arbitrary query using SQL query route or pg_catalog query via direct select
      console.log("RPC get_triggers_for_table not found, trying query...");
      
      // Let's run a raw query using a trick if possible, or query some system tables via REST API
      // Since PostgreSQL system catalogs are not exposed directly in default PostgREST endpoints unless we make an RPC,
      // let's check if we can query pg_trigger or search for trigger code in our files.
      // But wait! Is there any schema.sql or roles.sql or other file where triggers might be defined?
    } else {
      console.log("Triggers:", JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error(err);
  }
}

run();
