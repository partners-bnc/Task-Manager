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

const cronClient = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'cron' }
});

async function main() {
  console.log("=== pg_cron Scheduled Jobs ===");
  const { data: jobs, error: jobsError } = await cronClient
    .from('job')
    .select('*');

  if (jobsError) {
    console.error("Error fetching cron jobs:", jobsError);
  } else {
    console.log(JSON.stringify(jobs, null, 2));
  }

  console.log("\n=== pg_cron Job Run Details (recent 10) ===");
  const { data: runs, error: runsError } = await cronClient
    .from('job_run_details')
    .select('*')
    .order('runid', { ascending: false })
    .limit(10);

  if (runsError) {
    console.error("Error fetching cron job run details:", runsError);
  } else {
    console.log(JSON.stringify(runs, null, 2));
  }
}

main().catch(console.error);
