const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

const ids = [
  '41321331-1dad-46fb-b6c9-3c623397e3ec', // Gurvinder
  'faa843e2-84bc-4b8e-9119-fec8df358b66'  // Summit
];

async function run() {
  // Let's query table columns that have foreign keys or might reference hrm_employees
  // Since we don't have list of FKs, let's fetch all tables/columns or run a query on pg_catalog
  const { data: fks, error: fkError } = await supabase.rpc('execute_sql', {
    // Wait, execute_sql is not a standard RPC, but we can execute raw SQL if we have a function or we can just query the tables.
    // Let's check if there is an RPC. If not, we can query information_schema or similar.
  });
  
  // Wait, let's query typical tables that reference hrm_employees:
  // - hrm_attendance (employee_id)
  // - hrm_leaves (employee_id or raised_for or approved_by)
  // - hrm_regularizations
  // - hrm_payroll
  // - tasks (creator_id, etc.)
  // - task_assignees
  
  const tablesToCheck = [
    { table: 'hrm_attendance', col: 'employee_id' },
    { table: 'hrm_leaves', col: 'employee_id' },
    { table: 'hrm_payroll', col: 'employee_id' },
    { table: 'hrm_employee_documents', col: 'employee_id' },
    { table: 'hrm_employee_emergency_contacts', col: 'employee_id' },
    { table: 'hrm_employee_salary', col: 'employee_id' },
    { table: 'hrm_onboarding_tasks', col: 'assigned_employee_id' }
  ];

  for (const item of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(item.table)
        .select('*')
        .in(item.col, ids);
      if (error) {
        console.log(`Table ${item.table} error:`, error.message);
      } else if (data && data.length > 0) {
        console.log(`Table ${item.table} has ${data.length} rows referencing Super Admins!`);
      } else {
        console.log(`Table ${item.table} is clean.`);
      }
    } catch (e) {
      console.log(`Failed for ${item.table}:`, e.message);
    }
  }

  // Let's try to do a test delete inside a transaction, or just try to delete and see if it fails (and print the error).
  // This is completely safe if we do it in a way that catches the error.
  console.log("\nAttempting dry-run delete for Gurvinder...");
  const { data: delVal1, error: delErr1 } = await supabase
    .from('hrm_employees')
    .delete()
    .eq('id', '41321331-1dad-46fb-b6c9-3c623397e3ec');
  if (delErr1) {
    console.log("Delete Gurvinder failed:", delErr1.message);
  } else {
    console.log("Delete Gurvinder succeeded!");
  }

  console.log("\nAttempting dry-run delete for Summit...");
  const { data: delVal2, error: delErr2 } = await supabase
    .from('hrm_employees')
    .delete()
    .eq('id', 'faa843e2-84bc-4b8e-9119-fec8df358b66');
  if (delErr2) {
    console.log("Delete Summit failed:", delErr2.message);
  } else {
    console.log("Delete Summit succeeded!");
  }
}

run();
