-- Migration: Recreate crm_follow_ups table and drop tracking columns from crm_leads

-- 1. Recreate public.crm_follow_ups table
CREATE TABLE IF NOT EXISTS public.crm_follow_ups (
    followup_id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT NOT NULL REFERENCES public.crm_leads(lead_id) ON DELETE CASCADE,
    followup_type VARCHAR(50) NOT NULL,              -- 'Email', 'Call', 'WhatsApp', 'Meeting'
    direction VARCHAR(20) NOT NULL DEFAULT 'Outbound', -- 'Inbound', 'Outbound'
    status VARCHAR(30) NOT NULL DEFAULT 'Completed',  -- 'Scheduled', 'Completed', 'Overdue', 'Failed', 'Sent'
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    outcome TEXT,                                    -- Manual conclusion / Discussion notes
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

-- 2. Add followup_id back to campaign recipients if it does not exist
ALTER TABLE public.crm_campaign_recipients
  ADD COLUMN IF NOT EXISTS followup_id BIGINT REFERENCES public.crm_follow_ups(followup_id) ON DELETE SET NULL;

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_crm_follow_ups_lead_id ON public.crm_follow_ups(lead_id);

-- 4. Migrate existing data from crm_leads to crm_follow_ups (if columns exist)
DO $$
BEGIN
    -- Check if last_contacted and notes exist and migrate completed followups
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_leads' AND column_name='last_contacted') THEN
        INSERT INTO public.crm_follow_ups (lead_id, followup_type, direction, status, scheduled_at, completed_at, outcome, assigned_to, created_at, updated_at)
        SELECT 
            lead_id, 
            'Call' as followup_type, 
            'Outbound' as direction, 
            'Completed' as status, 
            COALESCE(last_contacted, NOW()) as scheduled_at, 
            last_contacted as completed_at, 
            notes as outcome, 
            assigned_to,
            created_at,
            updated_at
        FROM public.crm_leads
        WHERE last_contacted IS NOT NULL OR notes IS NOT NULL;
    END IF;

    -- Check if next_followup_date exists and migrate scheduled followups
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_leads' AND column_name='next_followup_date') THEN
        INSERT INTO public.crm_follow_ups (lead_id, followup_type, direction, status, scheduled_at, completed_at, outcome, assigned_to, created_at, updated_at)
        SELECT 
            lead_id, 
            'Call' as followup_type, 
            'Outbound' as direction, 
            'Scheduled' as status, 
            next_followup_date as scheduled_at, 
            NULL as completed_at, 
            'Scheduled next contact' as outcome, 
            assigned_to,
            created_at,
            updated_at
        FROM public.crm_leads
        WHERE next_followup_date IS NOT NULL;
    END IF;
END $$;

-- 5. Drop tracking columns from crm_leads if they exist
ALTER TABLE public.crm_leads
  DROP COLUMN IF EXISTS last_contacted CASCADE,
  DROP COLUMN IF EXISTS next_followup_date CASCADE,
  DROP COLUMN IF EXISTS notes CASCADE;
