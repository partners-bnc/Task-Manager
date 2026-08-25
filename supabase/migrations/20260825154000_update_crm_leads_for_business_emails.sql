-- Migration: Add business details email and company image url columns to crm_leads, and make full_name nullable.

-- 1. Drop the constraint phone_or_email_required if it exists
ALTER TABLE public.crm_leads DROP CONSTRAINT IF EXISTS phone_or_email_required;

-- 2. Add columns
ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS primary_business_email VARCHAR(150),
  ADD COLUMN IF NOT EXISTS additional_emails JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS company_image_url TEXT,
  ADD COLUMN IF NOT EXISTS business_phone VARCHAR(50);

-- 3. Make full_name nullable
ALTER TABLE public.crm_leads ALTER COLUMN full_name DROP NOT NULL;

-- 4. Add index for primary_business_email performance
CREATE INDEX IF NOT EXISTS crm_leads_primary_business_email_idx ON public.crm_leads (primary_business_email);
