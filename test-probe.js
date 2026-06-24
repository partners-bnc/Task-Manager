const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://llfoaqnljjbneouiedbg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsZm9hcW5sampibmVvdWllZGJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQwMjQ4MSwiZXhwIjoyMDkwOTc4NDgxfQ.lEC14skWd0bxtuGVPEX7PZaC5DsKTQx5f7dooh3VDTg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const { data, error } = await supabase
    .from('hrm_certificates')
    .select('*')
    .limit(1);

  if (error) {
    console.log('Error querying hrm_certificates:', error.message);
  } else {
    console.log('hrm_certificates table exists. Let\'s check columns via RPC or dummy select...');
  }

  // Let's run a select on information_schema.columns to see actual columns
  let cols = null;
  let colError = null;
  try {
    const res = await supabase.rpc('exec_sql', { sql: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'hrm_certificates'" });
    cols = res.data;
    colError = res.error;
  } catch (err) {
    colError = err;
  }

  if (colError || !cols) {
    // If exec_sql RPC doesn't exist, let's try reading the columns by selecting specific fields
    console.log('exec_sql RPC not available or failed. Trying to select specific fields to verify schema structure...');
    
    const { data: fieldData, error: fieldError } = await supabase
      .from('hrm_certificates')
      .select('id, certificate_id, recipient_name, recipient_employee_id, designation, start_date, end_date')
      .limit(1);

    if (fieldError) {
      console.log('Fields verification FAILED:', fieldError.message);
    } else {
      console.log('Fields verification PASSED. Columns are present.');
    }
  } else {
    console.log('Table columns:', cols);
  }
}

checkTables();
