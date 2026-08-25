-- Migration: Add business_phone column and add contact info check constraint to crm_leads

-- 1. Add business_phone column
ALTER TABLE public.crm_leads 
  ADD COLUMN IF NOT EXISTS business_phone VARCHAR(50);

-- 2. Drop old constraints if they exist
ALTER TABLE public.crm_leads DROP CONSTRAINT IF EXISTS phone_or_email_required;
ALTER TABLE public.crm_leads DROP CONSTRAINT IF EXISTS crm_leads_contact_info_required;

-- 3. Add new check constraint to require at least one populated email, phone, or whatsapp number across personal & business fields
ALTER TABLE public.crm_leads ADD CONSTRAINT crm_leads_contact_info_required CHECK (
  (email IS NOT NULL AND trim(email) <> '') OR 
  (email_alt IS NOT NULL AND trim(email_alt) <> '') OR 
  (primary_business_email IS NOT NULL AND trim(primary_business_email) <> '') OR 
  (phone IS NOT NULL AND trim(phone) <> '') OR 
  (phone_alt IS NOT NULL AND trim(phone_alt) <> '') OR 
  (whatsapp IS NOT NULL AND trim(whatsapp) <> '') OR 
  (business_phone IS NOT NULL AND trim(business_phone) <> '')
);
