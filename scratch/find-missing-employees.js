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

  // Find active employees
  const { data: employees, error: empError } = await supabase
    .from('hrm_employees')
    .select('id, employee_id, name, email')
    .eq('employment_lifecycle_status', 'active');

  if (empError) {
    console.error("Error fetching employees:", empError);
    return;
  }

  // Find logs for July 8
  const { data: logs, error: logsError } = await supabase
    .from('hrm_daily_work_logs')
    .select('employee_id')
    .eq('log_date', reportDate);

  if (logsError) {
    console.error("Error fetching logs:", logsError);
    return;
  }

  const submittedEmployeeIds = new Set(logs.map(l => l.employee_id));
  const missingEmployees = employees.filter(e => !submittedEmployeeIds.has(e.id));

  console.log(`=== Missing Employees for ${reportDate} ===`);
  console.log(`Total active: ${employees.length}`);
  console.log(`Total submitted: ${submittedEmployeeIds.size}`);
  console.log(`Total missing: ${missingEmployees.length}`);
  console.log(JSON.stringify(missingEmployees, null, 2));
}

main().catch(console.error);
