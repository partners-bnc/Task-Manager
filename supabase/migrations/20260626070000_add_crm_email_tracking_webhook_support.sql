-- Add ZeptoMail tracking support for CRM campaign recipients.

ALTER TABLE public.crm_campaign_recipients
  ADD COLUMN IF NOT EXISTS followup_id BIGINT REFERENCES public.crm_follow_ups(followup_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS complained_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS open_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS click_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.crm_email_tracking_events (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'zeptomail',
  provider_event_id TEXT,
  event_fingerprint TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  campaign_id BIGINT REFERENCES public.crm_campaigns(campaign_id) ON DELETE SET NULL,
  recipient_id BIGINT REFERENCES public.crm_campaign_recipients(recipient_id) ON DELETE SET NULL,
  lead_id BIGINT REFERENCES public.crm_leads(lead_id) ON DELETE SET NULL,
  email TEXT,
  provider_message_id TEXT,
  url TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT crm_email_tracking_events_event_type_check CHECK (
    event_type = ANY (ARRAY[
      'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained',
      'unsubscribed', 'deferred', 'dropped', 'unknown'
    ])
  )
);

ALTER TABLE public.crm_email_tracking_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS crm_campaign_recipients_followup_id_idx
  ON public.crm_campaign_recipients(followup_id)
  WHERE followup_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS crm_campaign_recipients_provider_msg_idx
  ON public.crm_campaign_recipients(provider, provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS crm_campaign_recipients_campaign_email_idx
  ON public.crm_campaign_recipients(campaign_id, lower(email_sent_to));

CREATE INDEX IF NOT EXISTS crm_email_tracking_events_campaign_idx
  ON public.crm_email_tracking_events(campaign_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS crm_email_tracking_events_recipient_idx
  ON public.crm_email_tracking_events(recipient_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS crm_email_tracking_events_lead_idx
  ON public.crm_email_tracking_events(lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS crm_email_tracking_events_provider_msg_idx
  ON public.crm_email_tracking_events(provider, provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.recalculate_crm_campaign_email_metrics(p_campaign_id BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_campaign_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.crm_campaigns c
  SET
    sent_count = COALESCE((
      SELECT count(*)::INTEGER
      FROM public.crm_campaign_recipients r
      WHERE r.campaign_id = p_campaign_id
        AND (r.sent_at IS NOT NULL OR lower(COALESCE(r.delivery_status, '')) IN ('sent', 'delivered', 'opened', 'clicked'))
    ), 0),
    delivered_count = COALESCE((
      SELECT count(*)::INTEGER
      FROM public.crm_campaign_recipients r
      WHERE r.campaign_id = p_campaign_id
        AND (r.delivered_at IS NOT NULL OR lower(COALESCE(r.delivery_status, '')) IN ('delivered', 'opened', 'clicked'))
    ), 0),
    opened_count = COALESCE((
      SELECT count(*)::INTEGER
      FROM public.crm_campaign_recipients r
      WHERE r.campaign_id = p_campaign_id
        AND r.opened_at IS NOT NULL
    ), 0),
    clicked_count = COALESCE((
      SELECT count(*)::INTEGER
      FROM public.crm_campaign_recipients r
      WHERE r.campaign_id = p_campaign_id
        AND r.clicked_at IS NOT NULL
    ), 0),
    bounced_count = COALESCE((
      SELECT count(*)::INTEGER
      FROM public.crm_campaign_recipients r
      WHERE r.campaign_id = p_campaign_id
        AND (r.bounced_at IS NOT NULL OR lower(COALESCE(r.delivery_status, '')) = 'bounced')
    ), 0),
    updated_at = timezone('utc', now())
  WHERE c.campaign_id = p_campaign_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_crm_email_tracking_event(
  p_provider TEXT,
  p_event_fingerprint TEXT,
  p_event_type TEXT,
  p_email TEXT DEFAULT NULL,
  p_provider_message_id TEXT DEFAULT NULL,
  p_url TEXT DEFAULT NULL,
  p_occurred_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_campaign_id BIGINT DEFAULT NULL,
  p_recipient_id BIGINT DEFAULT NULL,
  p_lead_id BIGINT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient public.crm_campaign_recipients%ROWTYPE;
  v_event_id BIGINT;
  v_campaign_id BIGINT;
  v_lead_id BIGINT;
  v_status TEXT;
BEGIN
  IF p_event_fingerprint IS NULL OR btrim(p_event_fingerprint) = '' THEN
    RAISE EXCEPTION 'event fingerprint is required';
  END IF;

  IF p_event_type IS NULL OR btrim(p_event_type) = '' THEN
    RAISE EXCEPTION 'event type is required';
  END IF;

  IF p_recipient_id IS NOT NULL THEN
    SELECT * INTO v_recipient
    FROM public.crm_campaign_recipients
    WHERE recipient_id = p_recipient_id
    LIMIT 1;
  END IF;

  IF v_recipient.recipient_id IS NULL AND p_provider_message_id IS NOT NULL THEN
    SELECT * INTO v_recipient
    FROM public.crm_campaign_recipients
    WHERE provider = p_provider
      AND provider_message_id = p_provider_message_id
    ORDER BY created_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_recipient.recipient_id IS NULL AND p_campaign_id IS NOT NULL AND p_email IS NOT NULL THEN
    SELECT * INTO v_recipient
    FROM public.crm_campaign_recipients
    WHERE campaign_id = p_campaign_id
      AND lower(email_sent_to) = lower(p_email)
    ORDER BY created_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_recipient.recipient_id IS NULL AND p_email IS NOT NULL THEN
    SELECT * INTO v_recipient
    FROM public.crm_campaign_recipients
    WHERE lower(email_sent_to) = lower(p_email)
    ORDER BY created_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  v_campaign_id := COALESCE(p_campaign_id, v_recipient.campaign_id);
  v_lead_id := COALESCE(p_lead_id, v_recipient.lead_id);

  INSERT INTO public.crm_email_tracking_events (
    provider,
    provider_event_id,
    event_fingerprint,
    event_type,
    campaign_id,
    recipient_id,
    lead_id,
    email,
    provider_message_id,
    url,
    occurred_at,
    payload
  ) VALUES (
    COALESCE(NULLIF(btrim(p_provider), ''), 'zeptomail'),
    p_payload->>'event_id',
    p_event_fingerprint,
    p_event_type,
    v_campaign_id,
    v_recipient.recipient_id,
    v_lead_id,
    lower(NULLIF(btrim(p_email), '')),
    NULLIF(btrim(COALESCE(p_provider_message_id, '')), ''),
    NULLIF(btrim(COALESCE(p_url, '')), ''),
    COALESCE(p_occurred_at, timezone('utc', now())),
    COALESCE(p_payload, '{}'::jsonb)
  )
  ON CONFLICT (event_fingerprint) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    RETURN jsonb_build_object(
      'inserted', false,
      'duplicate', true,
      'campaign_id', v_campaign_id,
      'recipient_id', v_recipient.recipient_id,
      'lead_id', v_lead_id
    );
  END IF;

  IF v_recipient.recipient_id IS NOT NULL THEN
    v_status := CASE p_event_type
      WHEN 'sent' THEN 'Sent'
      WHEN 'delivered' THEN 'Delivered'
      WHEN 'opened' THEN 'Opened'
      WHEN 'clicked' THEN 'Clicked'
      WHEN 'bounced' THEN 'Bounced'
      WHEN 'complained' THEN 'Complained'
      WHEN 'unsubscribed' THEN 'Unsubscribed'
      WHEN 'deferred' THEN 'Deferred'
      WHEN 'dropped' THEN 'Dropped'
      ELSE v_recipient.delivery_status
    END;

    UPDATE public.crm_campaign_recipients
    SET
      provider = COALESCE(NULLIF(btrim(p_provider), ''), provider, 'zeptomail'),
      provider_message_id = COALESCE(NULLIF(btrim(COALESCE(p_provider_message_id, '')), ''), provider_message_id),
      delivery_status = CASE
        WHEN p_event_type = 'opened' AND delivery_status = 'Clicked' THEN delivery_status
        WHEN p_event_type = 'delivered' AND delivery_status IN ('Opened', 'Clicked') THEN delivery_status
        WHEN p_event_type = 'sent' AND delivery_status IN ('Delivered', 'Opened', 'Clicked') THEN delivery_status
        ELSE COALESCE(v_status, delivery_status)
      END,
      sent_at = CASE WHEN p_event_type = 'sent' THEN COALESCE(sent_at, p_occurred_at) ELSE sent_at END,
      delivered_at = CASE WHEN p_event_type IN ('delivered', 'opened', 'clicked') THEN COALESCE(delivered_at, p_occurred_at) ELSE delivered_at END,
      opened_at = CASE WHEN p_event_type IN ('opened', 'clicked') THEN COALESCE(opened_at, p_occurred_at) ELSE opened_at END,
      clicked_at = CASE WHEN p_event_type = 'clicked' THEN COALESCE(clicked_at, p_occurred_at) ELSE clicked_at END,
      bounced_at = CASE WHEN p_event_type = 'bounced' THEN COALESCE(bounced_at, p_occurred_at) ELSE bounced_at END,
      complained_at = CASE WHEN p_event_type = 'complained' THEN COALESCE(complained_at, p_occurred_at) ELSE complained_at END,
      unsubscribed = CASE WHEN p_event_type = 'unsubscribed' THEN true ELSE unsubscribed END,
      unsubscribed_at = CASE WHEN p_event_type = 'unsubscribed' THEN COALESCE(unsubscribed_at, p_occurred_at) ELSE unsubscribed_at END,
      open_count = CASE WHEN p_event_type = 'opened' THEN open_count + 1 ELSE open_count END,
      click_count = CASE WHEN p_event_type = 'clicked' THEN click_count + 1 ELSE click_count END,
      updated_at = timezone('utc', now())
    WHERE recipient_id = v_recipient.recipient_id;
  END IF;

  IF v_campaign_id IS NOT NULL THEN
    PERFORM public.recalculate_crm_campaign_email_metrics(v_campaign_id);
  END IF;

  RETURN jsonb_build_object(
    'inserted', true,
    'duplicate', false,
    'event_id', v_event_id,
    'campaign_id', v_campaign_id,
    'recipient_id', v_recipient.recipient_id,
    'lead_id', v_lead_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_crm_email_tracking_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, JSONB, BIGINT, BIGINT, BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalculate_crm_campaign_email_metrics(BIGINT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_crm_email_tracking_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, JSONB, BIGINT, BIGINT, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.recalculate_crm_campaign_email_metrics(BIGINT) TO service_role;
