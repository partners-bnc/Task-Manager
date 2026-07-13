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

export async function enqueueTicketEmail({
  recipientEmail,
  ticket,
  recipientName,
  role,
  action,
  actorName,
}) {
  if (!EMAIL_NOTIFICATIONS_ENABLED) return;

  const normalizedEmail = String(recipientEmail || '').trim().toLowerCase();
  if (!normalizedEmail) return;

  const dedupeKey = `ticket_email:${ticket.id}:${role}:${action}:${Date.now()}:${Math.random()}`;

  const { error } = await adminClient
    .from('email_outbox')
    .insert({
      event_type: 'task_assigned',
      recipient_email: normalizedEmail,
      payload: {
        is_ticket: true,
        ticket_id: ticket.id,
        ticket_no: ticket.ticket_no,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        recipient_name: recipientName,
        email_role: role,
        action: action,
        actor_name: actorName,
        source_module: ticket.source_module || 'hrm',
      },
      dedupe_key: dedupeKey,
    });

  if (error) {
    throw new Error(error.message || 'Failed to enqueue ticket email');
  }
}

export async function enqueueLeaveRequestEmail({
  recipientEmail,
  recipientName,
  employeeName,
  leaveType,
  startDate,
  endDate,
  durationDays,
  reason,
  role,
}) {
  if (!EMAIL_NOTIFICATIONS_ENABLED) return;

  const normalizedEmail = String(recipientEmail || '').trim().toLowerCase();
  if (!normalizedEmail) return;

  const dedupeKey = `leave_email:${employeeName}:${startDate}:${normalizedEmail}:${Date.now()}:${Math.random()}`;

  const { error } = await adminClient
    .from('email_outbox')
    .insert({
      event_type: 'task_assigned',
      recipient_email: normalizedEmail,
      payload: {
        is_leave: true,
        recipient_name: recipientName,
        employee_name: employeeName,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        duration_days: durationDays,
        reason: reason,
        recipient_role: role,
      },
      dedupe_key: dedupeKey,
    });

  if (error) {
    throw new Error(error.message || 'Failed to enqueue leave request email');
  }
}

export async function enqueueRegularizationRequestEmail({
  recipientEmail,
  recipientName,
  employeeName,
  date,
  requestType,
  requestedCheckIn,
  requestedCheckOut,
  reason,
  role,
}) {
  if (!EMAIL_NOTIFICATIONS_ENABLED) return;

  const normalizedEmail = String(recipientEmail || '').trim().toLowerCase();
  if (!normalizedEmail) return;

  const dedupeKey = `regularization_email:${employeeName}:${date}:${normalizedEmail}:${Date.now()}:${Math.random()}`;

  const { error } = await adminClient
    .from('email_outbox')
    .insert({
      event_type: 'task_assigned',
      recipient_email: normalizedEmail,
      payload: {
        is_regularization: true,
        recipient_name: recipientName,
        employee_name: employeeName,
        date: date,
        request_type: requestType,
        requested_check_in: requestedCheckIn,
        requested_check_out: requestedCheckOut,
        reason: reason,
        recipient_role: role,
      },
      dedupe_key: dedupeKey,
    });

  if (error) {
    throw new Error(error.message || 'Failed to enqueue regularization request email');
  }
}

