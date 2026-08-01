const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing supabase URL or service key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function test() {
  console.log("Testing RPC connection...");
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: 'SELECT 1 as test_val'
  });
  if (error) {
    console.error("execute_sql RPC failed:", error.message);
  } else {
    console.log("execute_sql RPC succeeded:", data);
  }
}

test();
