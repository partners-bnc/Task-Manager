-- Create crm_lists table for dynamic CRM lead buckets
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

-- Index for fast queries
CREATE INDEX IF NOT EXISTS crm_lists_name_idx ON public.crm_lists (name);

-- Auto-update updated_at trigger
DROP TRIGGER IF EXISTS crm_lists_updated_at ON public.crm_lists;
CREATE TRIGGER crm_lists_updated_at
BEFORE UPDATE ON public.crm_lists
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Disable RLS or set public access for internal module
ALTER TABLE public.crm_lists DISABLE ROW LEVEL SECURITY;
