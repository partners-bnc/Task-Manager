import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

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
