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
    console.log("Checking scheduled pg_cron jobs in the database...");
    
    // We can query cron.job by calling a raw query, but since we cannot execute arbitrary SQL easily,
    // let's check if there's any RPC we can use, or if we can run query on cron schema.
    // PostgREST doesn't expose other schemas by default unless specified in the search_path or config,
    // but sometimes the database has RPC helper functions or views.
    // Let's try to query 'cron.job' table via direct select if postgREST exposes it.
    const { data, error } = await supabase
      .from('cron_job') // Or try executing a query via postgres if we have a direct connection.
      .select('*');

    if (error) {
      console.log("Could not query 'cron_job' directly:", error.message);
      
      // Let's write a script to check if we can query pg_catalog or system settings.
      // Wait, is there any other way to check pg_cron jobs?
      // Yes, we can write a small script that connects to PostgreSQL using the pg client!
      // Let's check if pg is installed in package.json!
    } else {
      console.log("Cron Jobs:", JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error(err);
  }
}

run();
