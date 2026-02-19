import { adminClient } from '@/utils/supabase/admin';

const EMAIL_NOTIFICATIONS_ENABLED = process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true';

export async function enqueueEmployeeCreatedEmail({
  employeeId,
  recipientEmail,
  employeeName,
  username,
  tempPassword,
}) {
  if (!EMAIL_NOTIFICATIONS_ENABLED) return;

  const normalizedEmail = String(recipientEmail || '').trim().toLowerCase();
  if (!normalizedEmail) return;

  const dedupeKey = `employee_created:${employeeId}:${Date.now()}`;

  const { error } = await adminClient
    .from('email_outbox')
    .insert({
      event_type: 'employee_created',
      recipient_email: normalizedEmail,
      payload: {
        employee_id: employeeId,
        employee_name: employeeName,
        username,
        temp_password: tempPassword,
      },
      dedupe_key: dedupeKey,
    });

  if (error) {
    throw new Error(error.message || 'Failed to enqueue onboarding email');
  }
}
