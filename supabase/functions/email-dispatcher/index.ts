import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const DEFAULT_APP_BASE_URL = 'https://tasks.bncglobal.in/login';
let APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? DEFAULT_APP_BASE_URL;
const EMAIL_NOTIFICATIONS_ENABLED = (Deno.env.get('EMAIL_NOTIFICATIONS_ENABLED') ?? 'true').trim().toLowerCase() === 'true';

type OutboxRow = {
  id: string;
  event_type: 'employee_created' | 'task_assigned' | 'task_due';
  recipient_email: string;
  payload: Record<string, unknown>;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getAppRootUrl(): string {
  const normalized = APP_BASE_URL.replace(/\/$/, '');
  return normalized.endsWith('/login') ? normalized.slice(0, -'/login'.length) : normalized;
}

function getLoginUrl(): string {
  const normalized = APP_BASE_URL.replace(/\/$/, '');
  if (!normalized) return '';
  return normalized.endsWith('/login') ? normalized : `${normalized}/login`;
}

function buildTaskUrl(taskId: string | null): string {
  const appRootUrl = getAppRootUrl();
  if (!taskId) return appRootUrl;
  if (!appRootUrl) return '';
  return `${appRootUrl}/dashboard/tasks/${taskId}`;
}

function renderEmail(row: OutboxRow) {
  if (row.event_type === 'employee_created') {
    const employeeName = String(row.payload?.employee_name ?? 'Employee');
    const username = String(row.payload?.username ?? '');
    const tempPassword = String(row.payload?.temp_password ?? '');
    const loginUrl = getLoginUrl();
    return {
      subject: 'Your TaskFlow account credentials',
      text: `Hi ${employeeName}, your account is ready.\nUsername: ${username}\nTemporary password: ${tempPassword}\nLogin: ${loginUrl}`,
      html: `<p>Hi ${employeeName},</p><p>Your account is ready.</p><p><strong>Username:</strong> ${username}<br/><strong>Temporary password:</strong> ${tempPassword}</p><p>Login: <a href="${loginUrl}">${loginUrl}</a></p>`,
    };
  }

  const employeeName = String(row.payload?.employee_name ?? 'Employee');
  const taskId = row.payload?.task_id ? String(row.payload.task_id) : null;
  const taskName = String(row.payload?.task_name ?? 'Task');
  const dueDate = row.payload?.due_date ? String(row.payload.due_date) : '';
  const priority = String(row.payload?.priority ?? 'medium');
  const taskUrl = buildTaskUrl(taskId);

  if (row.event_type === 'task_assigned') {
    return {
      subject: `New task assigned: ${taskName}`,
      text: `Hi ${employeeName}, a new task was assigned.\nTask: ${taskName}\nPriority: ${priority}\nDue: ${dueDate || 'Not set'}\n${taskUrl}`,
      html: `<p>Hi ${employeeName},</p><p>A new task was assigned to you.</p><p><strong>Task:</strong> ${taskName}<br/><strong>Priority:</strong> ${priority}<br/><strong>Due:</strong> ${dueDate || 'Not set'}</p><p><a href="${taskUrl}">Open task</a></p>`,
    };
  }

  return {
    subject: `Task due now: ${taskName}`,
    text: `Hi ${employeeName}, this task is now due.\nTask: ${taskName}\nDue: ${dueDate || 'Now'}\n${taskUrl}`,
    html: `<p>Hi ${employeeName},</p><p>This task is now due.</p><p><strong>Task:</strong> ${taskName}<br/><strong>Due:</strong> ${dueDate || 'Now'}</p><p><a href="${taskUrl}">Open task</a></p>`,
  };
}

async function sendWithBrevo(row: OutboxRow) {
  const brevoApiKey = String(row.payload?.brevo_api_key ?? '').trim();
  const brevoFromEmail = String(row.payload?.brevo_from_email ?? '').trim();
  const brevoFromName = String(row.payload?.brevo_from_name ?? 'TaskFlow').trim();
  const { subject, text, html } = renderEmail(row);

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': brevoApiKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: brevoFromName || 'TaskFlow',
        email: brevoFromEmail,
      },
      to: [{ email: row.recipient_email }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = String(payload?.message || payload?.code || `Brevo failed with status ${response.status}`);
    throw new Error(message);
  }

  return String(payload?.messageId || payload?.message_id || '');
}

Deno.serve(async (req) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { error: 'Missing Supabase service configuration' });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const expected = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
  if (authHeader !== expected) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const requestBody = await req.json().catch(() => ({}));
  const requestEnabledFlag = String(requestBody?.email_notifications_enabled ?? '').trim().toLowerCase();
  const notificationsEnabled =
    requestEnabledFlag === 'true' ? true : requestEnabledFlag === 'false' ? false : EMAIL_NOTIFICATIONS_ENABLED;
  const brevoApiKey = String(requestBody?.brevo_api_key ?? '').trim();
  const brevoFromEmail = String(requestBody?.brevo_from_email ?? '').trim();
  const brevoFromName = String(requestBody?.brevo_from_name ?? 'TaskFlow').trim();
  const requestAppBaseUrl = String(requestBody?.app_base_url ?? '').trim();
  APP_BASE_URL = requestAppBaseUrl || APP_BASE_URL || DEFAULT_APP_BASE_URL;

  if (!notificationsEnabled) {
    return jsonResponse(200, {
      success: true,
      paused: true,
      claimed: 0,
      sent: 0,
      failed: 0,
    });
  }

  if (!brevoApiKey) {
    return jsonResponse(500, { error: 'Missing brevo_api_key in request payload' });
  }

  if (!brevoFromEmail) {
    return jsonResponse(500, { error: 'Missing brevo_from_email in request payload' });
  }

  const { error: dueSeedError } = await supabase.rpc('enqueue_due_task_emails');
  if (dueSeedError) {
    console.error('enqueue_due_task_emails failed', dueSeedError);
  }

  const { data: claimed, error: claimError } = await supabase.rpc('claim_email_outbox_jobs', { p_limit: 25 });
  if (claimError) {
    return jsonResponse(500, { error: claimError.message || 'Failed to claim outbox jobs' });
  }

  const jobs = (claimed || []) as OutboxRow[];
  let sent = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      const providerId = await sendWithBrevo({
        ...job,
        payload: {
          ...(job.payload || {}),
          brevo_api_key: brevoApiKey,
          brevo_from_email: brevoFromEmail,
          brevo_from_name: brevoFromName,
        },
      });
      await supabase.rpc('mark_email_outbox_success', {
        p_id: job.id,
        p_provider_message_id: providerId,
      });
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown email send error';
      await supabase.rpc('mark_email_outbox_failure', {
        p_id: job.id,
        p_error: message,
      });
      failed += 1;
    }
  }

  return jsonResponse(200, {
    success: true,
    claimed: jobs.length,
    sent,
    failed,
  });
});
