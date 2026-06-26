-- CRM Calendar Events Table
-- Run this migration in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS crm_calendar_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'call', 'task', 'reminder', 'other')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  location TEXT,
  color TEXT DEFAULT '#3b82f6',
  lead_id UUID REFERENCES crm_leads(lead_id) ON DELETE SET NULL,
  assigned_to TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_crm_calendar_events_start ON crm_calendar_events(start_time);
CREATE INDEX idx_crm_calendar_events_end ON crm_calendar_events(end_time);
CREATE INDEX idx_crm_calendar_events_lead ON crm_calendar_events(lead_id);
CREATE INDEX idx_crm_calendar_events_status ON crm_calendar_events(status);

-- Enable RLS
ALTER TABLE crm_calendar_events ENABLE ROW LEVEL SECURITY;

-- Permissive policy for authenticated users
CREATE POLICY "Allow all for authenticated users" ON crm_calendar_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_crm_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_crm_calendar_events_updated_at
  BEFORE UPDATE ON crm_calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_calendar_events_updated_at();
