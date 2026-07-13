export function render(payload: Record<string, unknown>, urls: { ticketUrl: string }) {
  const recipientName = String(payload.recipient_name ?? 'User');
  const ticketNo = String(payload.ticket_no ?? 'TKT-0000');
  const subject = String(payload.subject ?? 'No Subject');
  const description = String(payload.description ?? 'N/A').trim() || 'N/A';
  const category = String(payload.category ?? 'other');
  const rawPriority = String(payload.priority ?? 'medium').toLowerCase();
  const emailRole = String(payload.email_role ?? 'handler').toLowerCase(); // 'support' | 'handler' | 'cc'
  const action = String(payload.action ?? 'reassigned').toLowerCase(); // 'created' | 'reassigned'
  const actorName = String(payload.actor_name ?? 'System / Admin');

  const priorityMap: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent'
  };
  const priority = priorityMap[rawPriority] || 'Medium';

  const categoryFormatted = category
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  let roleTitle = 'Ticket Assigned';
  let introText = '';
  let emailSubject = '';

  if (action === 'created') {
    emailSubject = `[New Ticket Raised] ${ticketNo}: ${subject}`;
    roleTitle = 'Ticket Details';
    introText = `A new support ticket has been raised by ${actorName} and initially routed to the Support team. Please review the details below and assign a main handler.`;
  } else if (emailRole === 'handler') {
    emailSubject = `[Ticket Assigned] ${ticketNo}: ${subject}`;
    roleTitle = 'Ticket Details';
    introText = `You have been assigned as the main handler for this ticket by ${actorName}. Please review the details and start working to resolve it.`;
  } else if (emailRole === 'cc') {
    emailSubject = `[Ticket Observer CC] ${ticketNo}: ${subject}`;
    roleTitle = 'Ticket Details';
    introText = `You have been CC'd as an observer on this ticket by ${actorName}. You will receive updates as the ticket is processed.`;
  } else {
    emailSubject = `[Ticket Update] ${ticketNo}: ${subject}`;
    roleTitle = 'Ticket Details';
    introText = `A ticket update has occurred. Please see the details below.`;
  }

  // Modern clean plain text version
  const text = `Dear ${recipientName},

${introText}

${roleTitle}:
----------------------------------------
Ticket No:   ${ticketNo}
Subject:     ${subject}
Category:    ${categoryFormatted}
Priority:    ${priority}
Description: ${description}
----------------------------------------

You can view the full ticket details and conversation by clicking the link below:

${urls.ticketUrl}

Best regards,

The Ticketing Team`;

  // HTML format matching the exact structure of task-assigned.ts
  const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0;">
  <p>Dear ${recipientName},</p>
  <p>${introText}</p>
  
  <p style="font-weight: 600; margin-bottom: 8px; color: #000000;">${roleTitle}:</p>
  <div style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 12px 0; margin-bottom: 20px;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding: 4px 0; width: 120px; font-weight: bold; color: #000000;">Ticket No:</td>
        <td style="padding: 4px 0; color: #475569;">${ticketNo}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #000000;">Subject:</td>
        <td style="padding: 4px 0; color: #475569;">${subject}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #000000;">Category:</td>
        <td style="padding: 4px 0; color: #475569;">${categoryFormatted}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #000000;">Priority:</td>
        <td style="padding: 4px 0; color: #475569;">${priority}</td>
      </tr>
      <tr>
        <td valign="top" style="padding: 8px 0 4px 0; font-weight: bold; color: #000000;">Description:</td>
        <td style="padding: 8px 0 4px 0; color: #475569; white-space: pre-wrap;">${description}</td>
      </tr>
    </table>
  </div>
  
  <p>You can view the full ticket details and conversation by clicking the link below:</p>
  <p><a href="${urls.ticketUrl}" style="color: #2563eb; font-weight: 600; text-decoration: underline;">${urls.ticketUrl}</a></p>
  
  <p style="margin-top: 24px;">Best regards,<br/><strong>The Ticketing Team</strong></p>
</div>`;

  return {
    subject: emailSubject,
    text,
    html,
  };
}
