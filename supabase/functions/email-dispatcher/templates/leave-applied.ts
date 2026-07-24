export function render(payload: Record<string, unknown>, urls: { leaveUrl: string }) {
  const recipientName = String(payload.recipient_name ?? 'Approver');
  const employeeName = String(payload.employee_name ?? 'Employee');
  const leaveType = String(payload.leave_type ?? 'Leave');
  const startDate = String(payload.start_date ?? '');
  const endDate = String(payload.end_date ?? '');
  const duration = String(payload.duration_days ?? '0');
  const reason = String(payload.reason ?? 'N/A').trim() || 'N/A';
  const role = String(payload.recipient_role ?? 'approver'); // 'reporting_manager' | 'hr_admin'

  let roleLabel = role === 'reporting_manager' ? 'Reporting Manager' : 'HR Admin';
  let emailSubject = `[Leave Request] ${employeeName} - ${leaveType}`;

  const text = `Dear ${recipientName},

A new leave request has been submitted by ${employeeName} and is pending your review as ${roleLabel}.

Leave Details:
----------------------------------------
Employee Name : ${employeeName}
Leave Type    : ${leaveType}
Start Date    : ${startDate}
End Date      : ${endDate}
Duration      : ${duration} Day(s)
Reason        : ${reason}
----------------------------------------

You can review, approve, or reject this request by logging into the HRM Dashboard:
${urls.leaveUrl}

Best regards,
The Universe One HRM Team`;

  const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0;">
  <p>Dear ${recipientName},</p>
  <p>A new leave request has been submitted by <strong>${employeeName}</strong> and is pending your review as <strong>${roleLabel}</strong>.</p>
  
  <p style="font-weight: 600; margin-bottom: 8px; color: #000000;">Leave Details:</p>
  <div style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 12px 0; margin-bottom: 20px;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding: 4px 0; width: 130px; font-weight: bold; color: #000000;">Employee Name:</td>
        <td style="padding: 4px 0; color: #475569;">${employeeName}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #000000;">Leave Type:</td>
        <td style="padding: 4px 0; color: #475569;">${leaveType}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #000000;">Start Date:</td>
        <td style="padding: 4px 0; color: #475569;">${startDate}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #000000;">End Date:</td>
        <td style="padding: 4px 0; color: #475569;">${endDate}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #000000;">Duration:</td>
        <td style="padding: 4px 0; color: #475569;">${duration} Day(s)</td>
      </tr>
      <tr>
        <td valign="top" style="padding: 8px 0 4px 0; font-weight: bold; color: #000000;">Reason:</td>
        <td style="padding: 8px 0 4px 0; color: #475569; white-space: pre-wrap;">${reason}</td>
      </tr>
    </table>
  </div>
  
  <p>You can review, approve, or reject this request by clicking the link below:</p>
  <p><a href="${urls.leaveUrl}" style="color: #2563eb; font-weight: 600; text-decoration: underline;">${urls.leaveUrl}</a></p>
  
  <p style="margin-top: 24px;">Best regards,<br/><strong>The Universe One HRM Team</strong></p>
</div>`;

  return {
    subject: emailSubject,
    text,
    html,
  };
}
