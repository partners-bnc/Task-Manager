import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: att } = await supabase.from('hrm_attendance').select('*').limit(1);
  if (att && att.length > 0) {
    console.log("Columns in hrm_attendance:", Object.keys(att[0]));
  } else {
    console.log("No records in hrm_attendance");
  }

  const { data: swipes } = await supabase.from('hrm_attendance_swipes').select('*').limit(1);
  if (swipes && swipes.length > 0) {
    console.log("Columns in hrm_attendance_swipes:", Object.keys(swipes[0]));
  } else {
    console.log("No records in hrm_attendance_swipes");
  }
}

main().catch(console.error);
