-- Migration: Drop CRM follow-ups table and view, and restore tracking columns
DROP VIEW IF EXISTS public.crm_leads_with_followup CASCADE;
DROP TABLE IF EXISTS public.crm_follow_ups CASCADE;

-- Remove followup_id column from crm_campaign_recipients if exists
ALTER TABLE public.crm_campaign_recipients
  DROP COLUMN IF EXISTS followup_id CASCADE;

-- Ensure tracking columns exist on crm_leads
ALTER TABLE public.crm_leads 
  ADD COLUMN IF NOT EXISTS last_contacted DATE,
  ADD COLUMN IF NOT EXISTS next_followup_date DATE;
