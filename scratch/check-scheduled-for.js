import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: outbox, error } = await supabase
    .from('email_outbox')
    .select('id, created_at, scheduled_for, status')
    .eq('event_type', 'daily_work_log_report')
    .order('created_at', { ascending: false })
    .limit(4);

  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(outbox, null, 2));
  }
}

main().catch(console.error);
