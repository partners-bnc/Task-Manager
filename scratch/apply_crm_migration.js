const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing supabase URL or service key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const sql = `
-- 1. Drop old constraint
ALTER TABLE public.crm_leads DROP CONSTRAINT IF EXISTS phone_or_email_required;

-- 2. Add new columns
ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS primary_business_email VARCHAR(150),
  ADD COLUMN IF NOT EXISTS additional_emails JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS company_image_url TEXT,
  ADD COLUMN IF NOT EXISTS business_phone VARCHAR(50);

-- 3. Make full_name nullable
ALTER TABLE public.crm_leads ALTER COLUMN full_name DROP NOT NULL;

-- 4. Add index
CREATE INDEX IF NOT EXISTS crm_leads_primary_business_email_idx ON public.crm_leads (primary_business_email);
`;

async function applyMigration() {
  console.log("Applying CRM leads migration via RPC execute_sql...");
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: sql
  });

  if (error) {
    console.error("Migration failed:", error.message);
    process.exit(1);
  } else {
    console.log("Migration executed successfully:", data);
  }
}

applyMigration();
