-- Migration: Add created_by and updated_by columns to crm_leads table
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS created_by VARCHAR(250);
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS updated_by VARCHAR(250);
