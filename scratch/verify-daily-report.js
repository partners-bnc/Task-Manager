import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== Daily Work Log Report Emails Status ===");
  const { data: outbox, error: outboxError } = await supabase
    .from('email_outbox')
    .select('id, status, created_at, sent_at, last_error, dedupe_key, payload')
    .eq('event_type', 'daily_work_log_report')
    .order('created_at', { ascending: false })
    .limit(20);

  if (outboxError) {
    console.error("Error fetching email_outbox:", outboxError);
    return;
  }

  outbox.forEach((row, i) => {
    const payload = row.payload || {};
    const reportDate = payload.report_date;
    const recipientName = payload.recipient_name;
    const missingCount = payload.missing_employees ? payload.missing_employees.length : 0;
    
    console.log(`[${i + 1}] ID: ${row.id}`);
    console.log(`    Dedupe Key: ${row.dedupe_key}`);
    console.log(`    Report Date: ${reportDate}`);
    console.log(`    Recipient: ${recipientName}`);
    console.log(`    Missing Employees Count: ${missingCount}`);
    console.log(`    Status: ${row.status}`);
    console.log(`    Created At: ${row.created_at}`);
    console.log(`    Sent At: ${row.sent_at}`);
    console.log(`    Last Error: ${row.last_error}`);
    console.log("-----------------------------------------");
  });

  console.log("\nChecking if there are any pending or failed emails in the entire outbox:");
  const { data: unsentCount, error: unsentError } = await supabase
    .from('email_outbox')
    .select('status', { count: 'exact', head: true })
    .neq('status', 'sent');

  if (unsentError) {
    console.error("Error fetching unsent emails:", unsentError);
  } else {
    console.log("Unsent emails total count:", unsentCount);
  }
}

main().catch(console.error);
