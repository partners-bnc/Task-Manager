-- Create advanced lead profiling database schema

-- 1. Add extended columns to public.crm_leads
ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS salutation VARCHAR(20),
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(50) DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(255),
  ADD COLUMN IF NOT EXISTS twitter_url VARCHAR(255),
  ADD COLUMN IF NOT EXISTS github_url VARCHAR(255),
  ADD COLUMN IF NOT EXISTS portfolio_url VARCHAR(255),
  ADD COLUMN IF NOT EXISTS email_consent_status VARCHAR(50) DEFAULT 'Subscribed',
  ADD COLUMN IF NOT EXISTS consent_source VARCHAR(150),
  ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(50) DEFAULT 'Email',
  ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skills VARCHAR(500),
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- 2. Create public.crm_lead_experiences table
CREATE TABLE IF NOT EXISTS public.crm_lead_experiences (
  experience_id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT NOT NULL REFERENCES public.crm_leads(lead_id) ON DELETE CASCADE,
  company_name VARCHAR(200) NOT NULL,
  job_title VARCHAR(150) NOT NULL,
  joining_date DATE,
  leave_date DATE,
  duration_years DECIMAL(4,2),
  company_industry VARCHAR(100),
  responsibilities TEXT,
  skills_used VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create public.crm_lead_educations table
CREATE TABLE IF NOT EXISTS public.crm_lead_educations (
  education_id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT NOT NULL REFERENCES public.crm_leads(lead_id) ON DELETE CASCADE,
  institution_name VARCHAR(200) NOT NULL,
  degree VARCHAR(150),
  field_of_study VARCHAR(150),
  start_date DATE,
  end_date DATE,
  grade VARCHAR(50),
  activities TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_crm_lead_exp_lead_id ON public.crm_lead_experiences(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_exp_company ON public.crm_lead_experiences(company_name);
CREATE INDEX IF NOT EXISTS idx_crm_lead_exp_industry ON public.crm_lead_experiences(company_industry);

CREATE INDEX IF NOT EXISTS idx_crm_lead_edu_lead_id ON public.crm_lead_educations(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_edu_institution ON public.crm_lead_educations(institution_name);
CREATE INDEX IF NOT EXISTS idx_crm_lead_edu_degree ON public.crm_lead_educations(degree);

-- 5. Trigger functions to auto-update updated_at on experience and education records
CREATE OR REPLACE FUNCTION update_experience_updated_at()
RETURNS TRIGGER AS $$
BEGIN 
  NEW.updated_at = NOW(); 
  RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crm_lead_experiences_updated_at ON public.crm_lead_experiences;
CREATE TRIGGER crm_lead_experiences_updated_at
BEFORE UPDATE ON public.crm_lead_experiences
FOR EACH ROW EXECUTE FUNCTION update_experience_updated_at();

CREATE OR REPLACE FUNCTION update_education_updated_at()
RETURNS TRIGGER AS $$
BEGIN 
  NEW.updated_at = NOW(); 
  RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS crm_lead_educations_updated_at ON public.crm_lead_educations;
CREATE TRIGGER crm_lead_educations_updated_at
BEFORE UPDATE ON public.crm_lead_educations
FOR EACH ROW EXECUTE FUNCTION update_education_updated_at();

-- Disable RLS on the new tables (matching crm_leads settings for direct API access)
ALTER TABLE public.crm_lead_experiences DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_educations DISABLE ROW LEVEL SECURITY;
