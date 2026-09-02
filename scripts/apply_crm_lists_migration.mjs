import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing supabase URL or service key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const sql = `
CREATE TABLE IF NOT EXISTS public.crm_lists (
  list_id          BIGSERIAL PRIMARY KEY,
  name             VARCHAR(150) NOT NULL,
  description      TEXT,
  selected_sources TEXT[] DEFAULT '{}',
  selected_tags    TEXT[] DEFAULT '{}',
  created_by       VARCHAR(100),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_lists_name_idx ON public.crm_lists (name);

ALTER TABLE public.crm_lists DISABLE ROW LEVEL SECURITY;
`;

async function applyMigration() {
  console.log("Applying crm_lists table migration via RPC execute_sql...");
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: sql
  });

  if (error) {
    console.error("Migration failed:", error.message);
    // If rpc fails, log details
  } else {
    console.log("Migration executed successfully:", data);
  }
}

applyMigration();
