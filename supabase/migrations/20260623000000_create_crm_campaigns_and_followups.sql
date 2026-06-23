-- Migration: Create CRM campaigns, email templates, and followups tables
-- Target database: Supabase PostgreSQL

-- 1. Create crm_email_templates table
CREATE TABLE IF NOT EXISTS public.crm_email_templates (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    subject VARCHAR(250) NOT NULL,
    preheader VARCHAR(250),
    plain_text_body TEXT,
    html_body TEXT,
    category VARCHAR(100) NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'Draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create crm_campaigns table
CREATE TABLE IF NOT EXISTS public.crm_campaigns (
    campaign_id BIGSERIAL PRIMARY KEY,
    campaign_name VARCHAR(150) NOT NULL,
    campaign_type VARCHAR(50) NOT NULL DEFAULT 'Email',
    template_id BIGINT REFERENCES public.crm_email_templates(id) ON DELETE RESTRICT,
    target_filter JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'Draft',
    scheduled_at TIMESTAMPTZ,
    launched_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create crm_follow_ups table
CREATE TABLE IF NOT EXISTS public.crm_follow_ups (
    followup_id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT NOT NULL REFERENCES public.crm_leads(lead_id) ON DELETE CASCADE,
    followup_type VARCHAR(50) NOT NULL,
    direction VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Scheduled',
    scheduled_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    outcome TEXT,
    next_followup_date DATE,
    next_followup_type VARCHAR(55),
    template_id BIGINT REFERENCES public.crm_email_templates(id) ON DELETE SET NULL,
    campaign_id BIGINT REFERENCES public.crm_campaigns(campaign_id) ON DELETE SET NULL,
    email_sent_to VARCHAR(150),
    email_subject_sent VARCHAR(250),
    email_body_snapshot TEXT,
    email_delivery_status VARCHAR(50),
    call_recording_url TEXT,
    ai_call_transcript TEXT,
    assigned_to VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create crm_campaign_recipients table
CREATE TABLE IF NOT EXISTS public.crm_campaign_recipients (
    recipient_id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES public.crm_campaigns(campaign_id) ON DELETE CASCADE,
    lead_id BIGINT NOT NULL REFERENCES public.crm_leads(lead_id) ON DELETE CASCADE,
    email_sent_to VARCHAR(150) NOT NULL,
    delivery_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    unsubscribed BOOLEAN DEFAULT FALSE,
    unsubscribed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_follow_ups_lead_id ON public.crm_follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_recipients_campaign_id ON public.crm_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_recipients_lead_id ON public.crm_campaign_recipients(lead_id);

-- Seed Starter Email Templates
INSERT INTO public.crm_email_templates (name, subject, preheader, plain_text_body, html_body, category, variables, status)
VALUES 
('Initial Outreach Offer', 'Hi {{ContactName}}, checking in from BnC!', 'We have some exciting news for you', 'Hi {{ContactName}},\n\nI wanted to reach out regarding {{CompanyName}}...', '<p>Hi <strong>{{ContactName}}</strong>,</p><p>I wanted to reach out regarding {{CompanyName}}...</p>', 'Outreach', '["ContactName", "CompanyName", "AgentName"]', 'Active'),
('Follow-up check-in', 'Re: Our discussion with {{ContactName}}', 'Just wanted to see if you had any questions', 'Hi {{ContactName}},\n\nJust following up on our previous call...', '<p>Hi <strong>{{ContactName}}</strong>,</p><p>Just following up on our previous call...</p>', 'Follow-up', '["ContactName", "AgentName"]', 'Active'),
('Enterprise SLA Package', 'SLA package details for {{CompanyName}}', 'Here are the details we promised', 'Hi {{ContactName}},\n\nAttached is the SLA information...', '<p>Hi <strong>{{ContactName}}</strong>,</p><p>Attached is the SLA information...</p>', 'Proposal', '["ContactName", "CompanyName", "AgentName"]', 'Active');
