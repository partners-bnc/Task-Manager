const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("Checking hrm_employees...");
  const { data: emps, error: err1 } = await supabase
    .from('hrm_employees')
    .select('id, employee_id, name, email, auth_user_id, role');
  if (err1) console.error("Error hrm_employees:", err1);
  else console.log("hrm_employees rows count:", emps.length, emps.filter(e => e.employee_id.includes('SA') || e.email.includes('bncglobal.in')));

  console.log("Checking privileged_accounts...");
  const { data: privs, error: err2 } = await supabase
    .from('privileged_accounts')
    .select('id, email, name, role, auth_user_id');
  if (err2) console.error("Error privileged_accounts:", err2);
  else console.log("privileged_accounts rows count:", privs.length, privs.filter(e => e.email.includes('bncglobal.in')));
}

run();
