function normalizeRequestStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'approved' || normalized === 'rejected') {
    return normalized;
  }
  return 'pending';
}

function formatApprovalOutcome(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'full_day') {
    return 'Full Day';
  }
  if (normalized === 'half_day' || normalized === 'halfday') {
    return 'Half Day';
  }
  return '';
}

function formatAppliedOn(timestamp) {
  if (!timestamp) {
    return '-';
  }

  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatReviewedAt(timestamp) {
  if (!timestamp) {
    return '';
  }

  return new Date(timestamp).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatRequestTimeRange(request) {
  const start = request.requested_check_in || request.time_range_start || '';
  const end = request.requested_check_out || request.time_range_end || '';
  return start && end ? `${start} - ${end}` : '-';
}

function toTitleCase(value) {
  const input = String(value || '').trim();
  if (!input) {
    return '';
  }

  return input
    .split(/[\s_]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function buildRecipientSummary(recipients = []) {
  const selectedHr = recipients.find(
    (recipient) => recipient.recipient_type === 'approver' && recipient.recipient_role === 'hr_admin'
  );
  const reportingManager = recipients.find(
    (recipient) => recipient.recipient_type === 'approver' && recipient.recipient_role === 'reporting_manager'
  );

  return {
    sentToHr: selectedHr?.recipient_name || selectedHr?.recipient_email || '',
    reportingManager: reportingManager?.recipient_name || reportingManager?.recipient_email || '',
  };
}

export function mapRegularizationItem(request, options = {}) {
  const recipients = Array.isArray(request.recipients) ? request.recipients : [];
  const normalizedStatus = normalizeRequestStatus(request.status || request.request_status);
  const recipientSummary = buildRecipientSummary(recipients);
  const resolvedDecisionRecipient = recipients.find((recipient) =>
    ['approved', 'rejected'].includes(String(recipient.decision_status || '').toLowerCase())
  );
  const finalApproverName =
    request.final_approver?.name ||
    request.final_approver?.email ||
    request.reviewer?.name ||
    request.reviewer?.email ||
    resolvedDecisionRecipient?.recipient_name ||
    resolvedDecisionRecipient?.recipient_email ||
    '';

  return {
    id: request.id,
    date: request.attendance_date || request.date,
    status: toTitleCase(normalizedStatus) || 'Pending',
    requestType: request.request_type || request.permission_type || 'Regularization',
    timeRange: formatRequestTimeRange(request),
    reason: request.reason || 'Attendance regularization request',
    appliedOn: formatAppliedOn(request.created_at || request.applied_on),
    currentStatusLabel: options.currentStatusLabel || '',
    sentToHr: recipientSummary.sentToHr,
    reportingManager: recipientSummary.reportingManager,
    approvalOutcome: formatApprovalOutcome(request.approval_outcome),
    reviewedBy: finalApproverName,
    reviewedAt: formatReviewedAt(request.approved_at || request.rejected_at || request.reviewed_at),
    canReview: Boolean(options.canReview),
  };
}

export function isApproverRecipient(recipient, authContext) {
  if (!recipient || recipient.recipient_type !== 'approver') {
    return false;
  }

  if (recipient.recipient_role === 'hr_admin' && recipient.recipient_auth_user_id) {
    return recipient.recipient_auth_user_id === authContext.userId;
  }

  if (recipient.recipient_role === 'reporting_manager' && recipient.recipient_employee_id) {
    return recipient.recipient_employee_id === authContext.employee?.id;
  }

  if (recipient.recipient_role === 'reporting_manager' && recipient.recipient_auth_user_id) {
    return recipient.recipient_auth_user_id === authContext.userId;
  }

  return false;
}

export function hasPendingApproverRecipient(recipients, authContext) {
  return (recipients || []).some(
    (recipient) => isApproverRecipient(recipient, authContext) && recipient.decision_status === 'pending'
  );
}

export function buildFinalApproverRole(recipient) {
  if (!recipient) {
    return null;
  }

  return recipient.recipient_role === 'reporting_manager' ? 'reporting_manager' : 'hr_admin';
}
