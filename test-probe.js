const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://llfoaqnljjbneouiedbg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsZm9hcW5sampibmVvdWllZGJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQwMjQ4MSwiZXhwIjoyMDkwOTc4NDgxfQ.lEC14skWd0bxtuGVPEX7PZaC5DsKTQx5f7dooh3VDTg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const tables = ['crm_leads', 'crm_email_templates', 'follow_ups', 'campaigns', 'campaign_recipients', 'email_templates', 'leads'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table ${table} does NOT exist or error:`, error.message);
    } else {
      console.log(`Table ${table} EXISTS, columns:`, Object.keys(data[0] || {}));
    }
  }
}

checkTables();
