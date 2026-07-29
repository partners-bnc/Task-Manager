import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: accounts, error } = await supabase
    .from('privileged_accounts')
    .select('*');

  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log("=== Privileged Accounts ===");
  console.log(accounts);
}

main();
