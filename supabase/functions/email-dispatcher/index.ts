import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
let APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? '';
const EMAIL_NOTIFICATIONS_ENABLED = (Deno.env.get('EMAIL_NOTIFICATIONS_ENABLED') ?? 'false').trim().toLowerCase() === 'true';

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

function buildTaskUrl(taskId: string | null): string {
  if (!taskId) return APP_BASE_URL || '';
  if (!APP_BASE_URL) return '';
  return `${APP_BASE_URL.replace(/\/$/, '')}/dashboard/tasks/${taskId}`;
}

function renderEmail(row: OutboxRow) {
  if (row.event_type === 'employee_created') {
    const employeeName = String(row.payload?.employee_name ?? 'Employee');
    const username = String(row.payload?.username ?? '');
    const tempPassword = String(row.payload?.temp_password ?? '');
    const loginUrl = APP_BASE_URL ? `${APP_BASE_URL.replace(/\/$/, '')}/login` : '';
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

async function sendWithResend(row: OutboxRow) {
  const resendApiKey = String(row.payload?.resend_api_key ?? '');
  const resendFromEmail = String(row.payload?.resend_from_email ?? 'onboarding@resend.dev');
  const { subject, text, html } = renderEmail(row);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: resendFromEmail,
      to: [row.recipient_email],
      subject,
      text,
      html,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = String(payload?.message || payload?.error || `Resend failed with status ${response.status}`);
    throw new Error(message);
  }

  return String(payload?.id || '');
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
  const resendApiKey = String(requestBody?.resend_api_key ?? '').trim();
  const resendFromEmail = String(requestBody?.resend_from_email ?? 'onboarding@resend.dev').trim();
  APP_BASE_URL = String(requestBody?.app_base_url ?? APP_BASE_URL).trim();

  if (!notificationsEnabled) {
    return jsonResponse(200, {
      success: true,
      paused: true,
      claimed: 0,
      sent: 0,
      failed: 0,
    });
  }

  if (!resendApiKey) {
    return jsonResponse(500, { error: 'Missing resend_api_key in request payload' });
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
      const providerId = await sendWithResend({
        ...job,
        payload: {
          ...(job.payload || {}),
          resend_api_key: resendApiKey,
          resend_from_email: resendFromEmail,
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
