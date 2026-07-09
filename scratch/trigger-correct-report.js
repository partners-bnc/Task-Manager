import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const reportDate = '2026-07-08';
  console.log(`1. Deleting premature test emails in email_outbox for ${reportDate}...`);
  
  const { data: deleted, error: deleteError } = await supabase
    .from('email_outbox')
    .delete()
    .eq('event_type', 'daily_work_log_report')
    .like('dedupe_key', `%:${reportDate}`);

  if (deleteError) {
    console.error("Error deleting from email_outbox:", deleteError);
    return;
  }
  console.log("Successfully deleted existing entries.");

  console.log(`2. Triggering generate_daily_work_log_report for ${reportDate}...`);
  const { data: count, error: rpcError } = await supabase
    .rpc('generate_daily_work_log_report', { p_date: reportDate });

  if (rpcError) {
    console.error("Error calling generate_daily_work_log_report RPC:", rpcError);
    return;
  }
  console.log(`Successfully generated report. Queued emails count: ${count}`);

  console.log("Waiting 5 seconds to let the dispatch cron job pick up and send the emails...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log("3. Fetching updated outbox statuses:");
  const { data: outbox, error: outboxError } = await supabase
    .from('email_outbox')
    .select('id, status, sent_at, last_error, dedupe_key, payload')
    .eq('event_type', 'daily_work_log_report')
    .like('dedupe_key', `%:${reportDate}`)
    .order('created_at', { ascending: false });

  if (outboxError) {
    console.error("Error fetching updated outbox:", outboxError);
  } else {
    outbox.forEach((row, i) => {
      const payload = row.payload || {};
      const missingCount = payload.missing_employees ? payload.missing_employees.length : 0;
      console.log(`[${i + 1}] ID: ${row.id}`);
      console.log(`    Recipient: ${payload.recipient_name} (${row.dedupe_key})`);
      console.log(`    Status: ${row.status}`);
      console.log(`    Missing Employees: ${missingCount}`);
      console.log(`    Sent At: ${row.sent_at}`);
      console.log(`    Last Error: ${row.last_error}`);
      console.log("-----------------------------------------");
    });
  }
}

main().catch(console.error);
