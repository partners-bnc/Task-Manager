import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking Anshu Prasad records in hrm_employees:");
  const { data: employees, error } = await supabase
    .from('hrm_employees')
    .select('id, employee_id, name, email, auth_user_id, reporting_manager_id')
    .ilike('name', '%anshu%');

  if (error) {
    console.error(error);
    return;
  }

  console.log(employees);

  console.log("\nChecking who reports to each of these records:");
  for (const emp of employees) {
    const { data: reports } = await supabase
      .from('hrm_employees')
      .select('id, name, email, employee_id')
      .eq('reporting_manager_id', emp.id);

    console.log(`Employee record ${emp.id} (${emp.name}, Code: ${emp.employee_id}) has reports:`, reports || []);
  }

  console.log("\nChecking hrm_profiles for Anshu:");
  const { data: profiles } = await supabase
    .from('hrm_profiles')
    .select('*')
    .ilike('full_name', '%anshu%');
  console.log(profiles);
}

main().catch(console.error);
