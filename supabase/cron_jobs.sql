-- ============================================================
-- Cron Jobs Restore Script
-- Generated from: jhcofiavruoctvaouagu (old project)
-- Run this on your NEW Supabase project via SQL Editor
-- ============================================================
-- IMPORTANT: Make sure pg_cron and pg_net extensions are enabled
--            before running this script.
-- ============================================================

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- Job 1: Cleanup expired employee sessions (every 15 minutes)
-- ============================================================
SELECT cron.schedule(
  'cleanup-expired-sessions',
  '*/15 * * * *',
  $$select public.cleanup_expired_employee_sessions();$$
);

-- ============================================================
-- Job 2: Email dispatcher via Edge Function (every minute)
-- NOTE: Update vault secrets on the new project first!
--       Required secrets: project_url, dispatcher_shared_secret,
--       brevo_api_key, brevo_from_email, brevo_from_name, app_base_url
-- ============================================================
SELECT cron.schedule(
  'email-dispatcher',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/email-dispatcher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'dispatcher_shared_secret')
    ),
    body := jsonb_build_object(
      'source', 'pg_cron',
      'timestamp', timezone('utc'::text, now()),
      'email_notifications_enabled', true,
      'brevo_api_key', (select decrypted_secret from vault.decrypted_secrets where name = 'brevo_api_key'),
      'brevo_from_email', (select decrypted_secret from vault.decrypted_secrets where name = 'brevo_from_email'),
      'brevo_from_name', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'brevo_from_name'), 'Universe One'),
      'app_base_url', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'app_base_url'), '')
    ),
    timeout_milliseconds := 10000
  );
  $$
);

-- ============================================================
-- Job 3: Process repeating tasks (every hour)
-- ============================================================
SELECT cron.schedule(
  'process-repeating-tasks',
  '0 * * * *',
  $$ select public.process_repeating_tasks(); $$
);
