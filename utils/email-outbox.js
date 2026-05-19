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

export async function enqueueOnboardingInviteEmail({
  onboardingRequestId,
  recipientEmail,
  candidateName,
  onboardingLink,
  expiresAt,
}) {
  if (!EMAIL_NOTIFICATIONS_ENABLED) return;

  const normalizedEmail = String(recipientEmail || '').trim().toLowerCase();
  if (!normalizedEmail) return;

  const dedupeKey = `onboarding_invite:${onboardingRequestId}:${Date.now()}`;

  const { error } = await adminClient
    .from('email_outbox')
    .insert({
      event_type: 'onboarding_invite',
      recipient_email: normalizedEmail,
      payload: {
        onboarding_request_id: onboardingRequestId,
        candidate_name: candidateName,
        onboarding_link: onboardingLink,
        expires_at: expiresAt,
      },
      dedupe_key: dedupeKey,
    });

  if (error) {
    throw new Error(error.message || 'Failed to enqueue onboarding invite email');
  }
}
