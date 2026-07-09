import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const brevoApiKey = process.env.BREVO_API_KEY;

async function main() {
  const url = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/email-dispatcher`;
  console.log(`Triggering edge function at ${url}...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      source: 'manual_trigger',
      timestamp: new Date().toISOString(),
      email_notifications_enabled: true,
      brevo_api_key: brevoApiKey,
      brevo_from_email: 'noreply@bncglobal.in', // let's see if this is correct or we can check what they used in pg_cron. The cron uses vault secrets, but we can send the BREVO_API_KEY and other details from .env.
      brevo_from_name: 'Task Manager',
      app_base_url: 'https://tasks.bncglobal.in'
    }),
  });

  console.log("Response status:", response.status);
  const json = await response.json().catch(() => ({}));
  console.log("Response body:", JSON.stringify(json, null, 2));
}

main().catch(console.error);
