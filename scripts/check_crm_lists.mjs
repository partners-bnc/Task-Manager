import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOrSetup() {
  console.log("Checking crm_lists table...");
  const { data, error } = await supabase.from('crm_lists').select('*').limit(1);
  if (error) {
    console.log("crm_lists table query result error:", error.message, error.code);
  } else {
    console.log("crm_lists table exists!", data);
  }
}

checkOrSetup();
