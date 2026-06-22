-- Create crm_leads table
CREATE TABLE IF NOT EXISTS crm_leads (
  -- PRIMARY KEY
  lead_id        BIGSERIAL PRIMARY KEY,

  -- PERSONAL DETAILS
  full_name      VARCHAR(150)  NOT NULL,
  phone          VARCHAR(20),                  -- primary phone with country code
  phone_alt      VARCHAR(20),                  -- alternate phone
  whatsapp       VARCHAR(20),                  -- whatsapp number
  email          VARCHAR(150),                 -- primary email
  email_alt      VARCHAR(150),                 -- alternate email
  country        VARCHAR(80),
  city           VARCHAR(80),
  state          VARCHAR(80),

  -- BUSINESS DETAILS
  company_name   VARCHAR(150),
  designation    VARCHAR(100),                 -- job title e.g. Director, Owner
  industry       VARCHAR(100),                 -- e.g. Real Estate, IT, Finance
  website        VARCHAR(200),
  company_size   VARCHAR(30),                  -- 1-10 / 11-50 / 51-200 / 200+
  business_country VARCHAR(80),
  business_city  VARCHAR(80),

  -- LEAD CLASSIFICATION
  lead_source    VARCHAR(80),                  -- Website / CA Data / Saudi Data / Client Data / Referral / Cold List
  lead_category  VARCHAR(80),                  -- Hot / Warm / Cold
  lead_type      VARCHAR(50),                  -- B2B / B2C / New / Existing
  lead_status    VARCHAR(50) DEFAULT 'New',    -- New / Contacted / Follow-up / Qualified / Converted / Lost
  priority       VARCHAR(10),                  -- High / Medium / Low
  tags           VARCHAR(300),                 -- comma-separated e.g. "VIP, Callback"

  -- SYSTEM & TRACKING
  assigned_to         VARCHAR(100),
  source_batch        VARCHAR(150),            -- import file name
  notes               TEXT,
  next_followup_date  DATE,
  last_contacted      DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  -- CONSTRAINT: at least phone or email must be filled
  CONSTRAINT phone_or_email_required CHECK (
    phone IS NOT NULL OR email IS NOT NULL
  )
);

-- INDEXES for fast filtering
CREATE INDEX IF NOT EXISTS crm_leads_phone_idx ON crm_leads (phone);
CREATE INDEX IF NOT EXISTS crm_leads_email_idx ON crm_leads (email);
CREATE INDEX IF NOT EXISTS crm_leads_lead_status_idx ON crm_leads (lead_status);
CREATE INDEX IF NOT EXISTS crm_leads_lead_source_idx ON crm_leads (lead_source);

-- AUTO-UPDATE updated_at on every row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN 
  NEW.updated_at = NOW(); 
  RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

-- Trigger to execute update_updated_at function
DROP TRIGGER IF EXISTS crm_leads_updated_at ON crm_leads;
CREATE TRIGGER crm_leads_updated_at
BEFORE UPDATE ON crm_leads
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Disable RLS or Enable public access for simple integration
ALTER TABLE crm_leads DISABLE ROW LEVEL SECURITY;
