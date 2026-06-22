const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://llfoaqnljjbneouiedbg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsZm9hcW5sampibmVvdWllZGJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQwMjQ4MSwiZXhwIjoyMDkwOTc4NDgxfQ.lEC14skWd0bxtuGVPEX7PZaC5DsKTQx5f7dooh3VDTg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('crm_leads').select('lead_id, full_name, lead_source, lead_status, lead_category, priority');
  if (error) {
    console.error(error);
  } else {
    console.log("Total leads:", data.length);
    const sources = Array.from(new Set(data.map(d => d.lead_source)));
    console.log("Sources in DB:", sources);
    console.log("Statuses in DB:", Array.from(new Set(data.map(d => d.lead_status))));
    console.log("Categories in DB:", Array.from(new Set(data.map(d => d.lead_category))));
    console.log("Priorities in DB:", Array.from(new Set(data.map(d => d.priority))));
  }
}
test();
