// Compiled with custom deploy-helper

// --- onboarding-invite.ts ---
function renderOnboarding(payload: Record<string, unknown>) {
  const candidateName = String(payload.candidate_name ?? 'Candidate');
  const onboardingLink = String(payload.onboarding_link ?? '');
  const expiresAt = String(payload.expires_at ?? '');
  const expiryCopy = expiresAt ? new Date(expiresAt).toLocaleString('en-IN') : '';

  return {
    subject: 'Complete your onboarding form',
    text: `Hi ${candidateName},\n\nPlease complete your onboarding form using this secure link:\n${onboardingLink}\n\n${
      expiryCopy ? `This link expires on ${expiryCopy}.\n` : ''
    }You can submit the form only once.`,
    html: `<p>Hi ${candidateName},</p>
<p>Please complete your onboarding form using this secure link:</p>
<p><a href="${onboardingLink}">${onboardingLink}</a></p>
<p>${expiryCopy ? `This link expires on <strong>${expiryCopy}</strong>. ` : ''}You can submit the form only once.</p>`,
  };
}


// --- employee-created.ts ---
function renderEmployeeCreated(payload: Record<string, unknown>, urls: { loginUrl: string; settingsUrl: string }) {
  const employeeName = String(payload.employee_name ?? 'Employee');
  const username = String(payload.username ?? '');
  const tempPassword = String(payload.temp_password ?? '');

  return {
    subject: 'Your Universe One account credentials',
    text: `Hi ${employeeName},\n\nyour account is ready.\nUsername: ${username}\nTemporary password: ${tempPassword}\nLogin: ${urls.loginUrl}\n\nAfter signing in, you can change your password from Settings by entering your current temporary password and your new password.\nDashboard: ${urls.settingsUrl}`,
    html: `<p>Hi ${employeeName},</p>
<p>Your account is ready.</p>
<p><strong>Username:</strong> ${username}<br/><strong>Temporary password:</strong> ${tempPassword}</p>
<p>Login: <a href="${urls.loginUrl}">${urls.loginUrl}</a></p>
<p>After signing in, you can change your password from Settings by entering your current temporary password and your new password.</p>
<p>Dashboard: <a href="${urls.settingsUrl}">${urls.settingsUrl}</a></p>`,
  };
}


// --- task-assigned.ts ---
export function formatTaskAssignedDateTime(dueStr: string | null | undefined) {
  if (!dueStr) return { date: 'Not set', time: 'Not set' };
  try {
    const d = new Date(dueStr);
    if (isNaN(d.getTime())) return { date: String(dueStr), time: 'Not set' };

    // Format Date using Intl in Asia/Kolkata timezone
    const dateOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    };
    const formatterDate = new Intl.DateTimeFormat('en-IN', dateOptions);
    const dateFormatted = formatterDate.format(d).replace(/\//g, '-');

    // Format Time using Intl in Asia/Kolkata timezone
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    };
    const formatterTime = new Intl.DateTimeFormat('en-IN', timeOptions);
    const timeFormatted = formatterTime.format(d).toUpperCase();

    return { date: dateFormatted, time: timeFormatted };
  } catch {
    return { date: String(dueStr), time: 'Not set' };
  }
}

function renderTaskAssigned(payload: Record<string, unknown>, urls: { taskUrl: string }) {
  const employeeName = String(payload.employee_name ?? 'Employee');
  const taskName = String(payload.task_name ?? 'Task');
  const assignerName = String(payload.creator_name ?? 'System / Admin');
  const taskDescription = String(payload.task_description ?? 'N/A').trim() || 'N/A';
  const rawPriority = String(payload.priority ?? 'medium').toLowerCase();
  
  const priorityMap: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent'
  };
  const priority = priorityMap[rawPriority] || 'Medium';

  const { date: dueDate, time: dueTime } = formatTaskAssignedDateTime(payload.due_date ? String(payload.due_date) : null);

  const text = `Dear ${employeeName},

A new task has been created and assigned to you within Universe One. Please review the details below and begin your work accordingly.

Task Details:
----------------------------------------
Task Title:  ${taskName}
Assigned By: ${assignerName}
Priority:    ${priority}
Due Date:    ${dueDate}
Due Time:    ${dueTime}
Description: ${taskDescription}
----------------------------------------

You can view the full task details, manage subtasks, and upload any necessary files by clicking the link below:

${urls.taskUrl}

Best regards,

The Universe One Team`;

  const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0;">
  <p>Dear ${employeeName},</p>
  <p>A new task has been created and assigned to you within Universe One. Please review the details below and begin your work accordingly.</p>
  
  <p style="font-weight: 600; margin-bottom: 8px; color: #000000;">Task Details:</p>
  <div style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 12px 0; margin-bottom: 20px;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding: 4px 0; width: 120px; font-weight: bold; color: #000000;">Task Title:</td>
        <td style="padding: 4px 0; color: #475569;">${taskName}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #000000;">Assigned By:</td>
        <td style="padding: 4px 0; color: #475569;">${assignerName}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #000000;">Priority:</td>
        <td style="padding: 4px 0; color: #475569;">${priority}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #000000;">Due Date:</td>
        <td style="padding: 4px 0; color: #475569;">${dueDate}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #000000;">Due Time:</td>
        <td style="padding: 4px 0; color: #475569;">${dueTime}</td>
      </tr>
      <tr>
        <td valign="top" style="padding: 8px 0 4px 0; font-weight: bold; color: #000000;">Description:</td>
        <td style="padding: 8px 0 4px 0; color: #475569; white-space: pre-wrap;">${taskDescription}</td>
      </tr>
    </table>
  </div>
  
  <p>You can view the full task details, manage subtasks, and upload any necessary files by clicking the link below:</p>
  <p><a href="${urls.taskUrl}" style="color: #2563eb; font-weight: 600; text-decoration: underline;">${urls.taskUrl}</a></p>
  
  <p style="margin-top: 24px;">Best regards,<br/><strong>The Universe One Team</strong></p>
</div>`;

  return {
    subject: `New Task Assigned: ${taskName}`,
    text,
    html,
  };
}


// --- task-repeat-assigned.ts ---


function renderTaskRepeatAssigned(payload: Record<string, unknown>, urls: { taskUrl: string }) {
  const employeeName = String(payload.employee_name ?? 'Employee');
  const taskName = String(payload.task_name ?? 'Task');
  const assignerName = String(payload.creator_name ?? 'System / Admin');
  const taskDescription = String(payload.task_description ?? 'N/A').trim() || 'N/A';
  const rawPriority = String(payload.priority ?? 'medium').toLowerCase();
  
  const priorityMap: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent'
  };
  const priority = priorityMap[rawPriority] || 'Medium';

  const { date: dueDate, time: dueTime } = formatTaskAssignedDateTime(payload.due_date ? String(payload.due_date) : null);

  const text = `Dear ${employeeName},

A repeating task cycle has started and a new instance has been assigned to you within Universe One. Please review the details below and begin your work accordingly.

Task Details:
----------------------------------------
Task Title:  ${taskName}
Assigned By: ${assignerName}
Priority:    ${priority}
Due Date:    ${dueDate}
Due Time:    ${dueTime}
Description: ${taskDescription}
----------------------------------------

You can view the full task details, manage subtasks, and upload any necessary files by clicking the link below:

${urls.taskUrl}

Best regards,

The Universe One Team`;

  const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0;">
  <p>Dear ${employeeName},</p>
  <p>A repeating task cycle has started and a new instance has been assigned to you within Universe One. Please review the details below and begin your work accordingly.</p>
  
  <p style="font-weight: 600; margin-bottom: 8px; color: #000000;">Task Details:</p>
  <div style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 12px 0; margin-bottom: 20px;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding: 4px 0; width: 120px; font-weight: bold; color: #000000;">Task Title:</td>
        <td style="padding: 4px 0; color: #475569;">${taskName}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #000000;">Assigned By:</td>
        <td style="padding: 4px 0; color: #475569;">${assignerName}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #000000;">Priority:</td>
        <td style="padding: 4px 0; color: #475569;">${priority}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #000000;">Due Date:</td>
        <td style="padding: 4px 0; color: #475569;">${dueDate}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #000000;">Due Time:</td>
        <td style="padding: 4px 0; color: #475569;">${dueTime}</td>
      </tr>
      <tr>
        <td valign="top" style="padding: 8px 0 4px 0; font-weight: bold; color: #000000;">Description:</td>
        <td style="padding: 8px 0 4px 0; color: #475569; white-space: pre-wrap;">${taskDescription}</td>
      </tr>
    </table>
  </div>
  
  <p>You can view the full task details, manage subtasks, and upload any necessary files by clicking the link below:</p>
  <p><a href="${urls.taskUrl}" style="color: #2563eb; font-weight: 600; text-decoration: underline;">${urls.taskUrl}</a></p>
  
  <p style="margin-top: 24px;">Best regards,<br/><strong>The Universe One Team</strong></p>
</div>`;

  return {
    subject: `New Task Assigned (Repeating): ${taskName}`,
    text,
    html,
  };
}


// --- task-due.ts ---


function renderTaskDue(payload: Record<string, unknown>, urls: { taskUrl: string }) {
  const employeeName = String(payload.employee_name ?? 'Employee');
  const taskName = String(payload.task_name ?? 'Task');
  const assignerName = String(payload.creator_name ?? 'System / Admin');
  const rawPriority = String(payload.priority ?? 'medium').toLowerCase();
  
  const priorityMap: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent'
  };
  const priority = priorityMap[rawPriority] || 'Medium';

  const { date: dueDate, time: dueTime } = formatTaskAssignedDateTime(payload.due_date ? String(payload.due_date) : null);

  const text = `Dear ${employeeName},

This is a friendly reminder that the task "${taskName}" is due soon. Please ensure that all components of the task are completed by the specified deadline.

Deadline Information:
----------------------------------------
Task:        ${taskName}
Assigned By: ${assignerName}
Priority:    ${priority}
Due Date:    ${dueDate}
Due Time:    ${dueTime}
----------------------------------------

If you have already completed this task, please ensure the status has been updated in the portal. You can access the task here:

${urls.taskUrl}

If you require any assistance or need to discuss an extension, please contact the task creator, ${assignerName}, as soon as possible.

Best regards,

The Universe One Team`;

  const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0;">
  <p>Dear ${employeeName},</p>
  <p>This is a friendly reminder that the task "${taskName}" is due soon. Please ensure that all components of the task are completed by the specified deadline.</p>
  
  <p style="font-weight: 600; margin-bottom: 8px; color: #000000;">Deadline Information:</p>
  <div style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 12px 0; margin-bottom: 20px;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding: 4px 0; width: 120px; font-weight: bold; color: #000000;">Task:</td>
        <td style="padding: 4px 0; color: #475569;">${taskName}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #000000;">Assigned By:</td>
        <td style="padding: 4px 0; color: #475569;">${assignerName}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #000000;">Due Date:</td>
        <td style="padding: 4px 0; color: #475569;">${dueDate}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #000000;">Due Time:</td>
        <td style="padding: 4px 0; color: #475569;">${dueTime}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #000000;">Priority:</td>
        <td style="padding: 4px 0; color: #475569;">${priority}</td>
      </tr>
    </table>
  </div>
  
  <p>If you have already completed this task, please ensure the status has been updated in the portal. You can access the task here:</p>
  <p><a href="${urls.taskUrl}" style="color: #2563eb; font-weight: 600; text-decoration: underline;">${urls.taskUrl}</a></p>
  
  <p style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #475569; font-size: 14px;">
    If you require any assistance or need to discuss an extension, please contact the task creator, <strong>${assignerName}</strong>, as soon as possible.
  </p>
  
  <p style="margin-top: 24px;">Best regards,<br/><strong>The Universe One Team</strong></p>
</div>`;

  return {
    subject: `Upcoming Deadline: ${taskName}`,
    text,
    html,
  };
}


// --- daily-work-log-report.ts ---
function renderDailyReport(payload: Record<string, unknown>) {
  const recipientName = String(payload.recipient_name ?? 'Administrator');
  const reportDate = String(payload.report_date ?? '');
  const missingEmployees = (payload.missing_employees ?? []) as Array<{
    employee_id: string;
    name: string;
    email: string;
    status?: string;
  }>;

  // 1. Render Plain Text body
  let employeeRowsText = '';
  if (missingEmployees.length === 0) {
    employeeRowsText = 'All active employees submitted their daily work logs today.';
  } else {
    employeeRowsText = `Employee ID   | Name                 | Status               | Email\n`;
    employeeRowsText += `----------------------------------------------------------------------------------------\n`;
    missingEmployees.forEach((emp) => {
      const empId = String(emp.employee_id || '').padEnd(13, ' ');
      const empName = String(emp.name || '').padEnd(20, ' ');
      const empStatus = String(emp.status || 'Missing Log').padEnd(20, ' ');
      const empEmail = String(emp.email || '');
      employeeRowsText += `${empId} | ${empName} | ${empStatus} | ${empEmail}\n`;
    });
  }

  const text = `Dear ${recipientName},

This is the daily work log report for ${reportDate}.

Below is the list of active employees and their status:

----------------------------------------------------------------------------------------
${employeeRowsText}
----------------------------------------------------------------------------------------

Please follow up with them accordingly.

Best regards,

The Universe One Team`;

  // 2. Render HTML body
  let employeeRowsHtml = '';
  if (missingEmployees.length === 0) {
    employeeRowsHtml = `<tr><td colspan="4" style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; color: #64748b;">All active employees submitted their daily work logs today.</td></tr>`;
  } else {
    missingEmployees.forEach((emp) => {
      let statusColor = '#e11d48'; // rose-600 for missing
      if (emp.status === 'On Leave (Approved)') {
        statusColor = '#16a34a'; // green-600
      } else if (emp.status === 'On Leave (Pending)') {
        statusColor = '#d97706'; // amber-600
      }
      employeeRowsHtml += `<tr>
        <td style="border: 1px solid #e2e8f0; padding: 10px; color: #475569;">${emp.employee_id || 'N/A'}</td>
        <td style="border: 1px solid #e2e8f0; padding: 10px; color: #000000; font-weight: bold;">${emp.name || 'N/A'}</td>
        <td style="border: 1px solid #e2e8f0; padding: 10px; color: ${statusColor}; font-weight: 600;">${emp.status || 'Missing Log'}</td>
        <td style="border: 1px solid #e2e8f0; padding: 10px; color: #475569;">${emp.email || 'N/A'}</td>
      </tr>`;
    });
  }

  const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b; max-width: 650px; margin: 0;">
  <p>Dear ${recipientName},</p>
  <p>This is the daily work log report for <strong>${reportDate}</strong>.</p>
  <p>Below is the list of active employees and their status:</p>
  
  <p style="font-weight: 600; margin-bottom: 8px; color: #000000;">Missing Daily Logs / Leave Status:</p>
  <div style="margin-bottom: 20px; overflow-x: auto;">
    <table role="presentation" border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; border-color: #e2e8f0; width: 100%; min-width: 500px;">
      <thead>
        <tr style="background-color: #f8fafc; border: 1px solid #e2e8f0;">
          <th align="left" style="color: #000000; font-weight: bold; border: 1px solid #e2e8f0; padding: 10px; width: 120px;">Employee ID</th>
          <th align="left" style="color: #000000; font-weight: bold; border: 1px solid #e2e8f0; padding: 10px;">Name</th>
          <th align="left" style="color: #000000; font-weight: bold; border: 1px solid #e2e8f0; padding: 10px;">Status</th>
          <th align="left" style="color: #000000; font-weight: bold; border: 1px solid #e2e8f0; padding: 10px;">Email</th>
        </tr>
      </thead>
      <tbody>
        ${employeeRowsHtml}
      </tbody>
    </table>
  </div>
  
  <p>Please follow up with them accordingly.</p>
  
  <p style="margin-top: 24px;">Best regards,<br/><strong>The Universe One Team</strong></p>
</div>`;

  return {
    subject: `Daily Work Log Report: ${reportDate}`,
    text,
    html,
  };
}


// --- ticket-assigned.ts ---
function renderTicketAssigned(payload: Record<string, unknown>, urls: { ticketUrl: string }) {
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


// --- missing-attendance.ts ---
function renderMissingAttendance(payload: Record<string, unknown>) {
  const recipientName = String(payload.recipient_name ?? 'Admin');
  const reportDateStr = String(payload.report_date ?? '');
  const employees = Array.isArray(payload.missing_employees) ? payload.missing_employees : [];

  let reportDateFormatted = reportDateStr;
  if (reportDateStr) {
    try {
      const d = new Date(reportDateStr);
      if (!isNaN(d.getTime())) {
        const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
        reportDateFormatted = new Intl.DateTimeFormat('en-IN', options).format(d).replace(/\//g, '-');
      }
    } catch {
      reportDateFormatted = reportDateStr;
    }
  }

  // Modern clean plain text version
  const employeeLines = employees.length > 0
    ? employees.map((emp: any) => `  - [${emp.employee_id || 'N/A'}] ${emp.name} | ${emp.status || 'Missing Check-in'} (${emp.email})`).join('\n')
    : '  All active employees have checked in successfully today!';

  const text = `Dear ${recipientName},

This is the daily automated report of active employees who have not checked in (missing check-in) as of 12:00 PM IST on ${reportDateFormatted}.

Employees Missing Check-in / Leave Status:
-------------------------------------------------------------
${employeeLines}
-------------------------------------------------------------

You can manage and view complete daily attendance reports by logging into your HRM dashboard.

Best regards,
The Universe One HRM Team`;

  // HTML format matching the exact structure of task-assigned.ts
  const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0;">
  <p>Dear ${recipientName},</p>
  <p>This is the daily automated report of active employees who have not checked in (missing check-in) as of 12:00 PM IST on ${reportDateFormatted}.</p>
  
  <p style="font-weight: 600; margin-bottom: 8px; color: #000000;">Employees Missing Check-in / Leave Status:</p>
  
  ${employees.length > 0 ? `
  <div style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 12px 0; margin-bottom: 20px;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <thead>
        <tr>
          <th align="left" style="padding: 6px 0; font-weight: bold; color: #000000; border-bottom: 1px solid #f1f5f9; width: 130px;">Employee ID</th>
          <th align="left" style="padding: 6px 0; font-weight: bold; color: #000000; border-bottom: 1px solid #f1f5f9;">Name</th>
          <th align="left" style="padding: 6px 0; font-weight: bold; color: #000000; border-bottom: 1px solid #f1f5f9; width: 160px;">Status</th>
          <th align="left" style="padding: 6px 0; font-weight: bold; color: #000000; border-bottom: 1px solid #f1f5f9;">Email</th>
        </tr>
      </thead>
      <tbody>
        ${employees.map((emp: any) => {
          let statusColor = '#e11d48'; // rose-600 for missing
          if (emp.status === 'On Leave (Approved)') {
            statusColor = '#16a34a'; // green-600
          } else if (emp.status === 'On Leave (Pending)') {
            statusColor = '#d97706'; // amber-600
          }
          return `
          <tr>
            <td style="padding: 6px 0; color: #475569;">${emp.employee_id || '-'}</td>
            <td style="padding: 6px 0; color: #000000; font-weight: bold;">${emp.name}</td>
            <td style="padding: 6px 0; color: ${statusColor}; font-weight: 600;">${emp.status || 'Missing Check-in'}</td>
            <td style="padding: 6px 0; color: #475569;">${emp.email}</td>
          </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>
  ` : `
  <p style="color: #475569; font-style: italic; margin-bottom: 20px;">All active employees have checked in successfully today!</p>
  `}
  
  <p>You can manage and view complete daily attendance reports by logging into your HRM dashboard.</p>
  
  <p style="margin-top: 24px;">Best regards,<br/><strong>The Universe One HRM Team</strong></p>
</div>`;

  return {
    subject: `[Missing Check-In Report] ${reportDateFormatted}`,
    text,
    html,
  };
}


// --- leave-applied.ts ---
function renderLeaveApplied(payload: Record<string, unknown>, urls: { leaveUrl: string }) {
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


// --- regularization-applied.ts ---
function renderRegularizationApplied(payload: Record<string, unknown>, urls: { regularizationUrl: string }) {
  const recipientName = String(payload.recipient_name ?? 'Approver');
  const employeeName = String(payload.employee_name ?? 'Employee');
  const date = String(payload.date ?? '');
  const requestType = String(payload.request_type ?? 'Regularization');
  const checkIn = String(payload.requested_check_in ?? 'N/A');
  const checkOut = String(payload.requested_check_out ?? 'N/A');
  const reason = String(payload.reason ?? 'N/A').trim() || 'N/A';
  const role = String(payload.recipient_role ?? 'approver'); // 'reporting_manager' | 'hr_admin'

  let roleLabel = role === 'reporting_manager' ? 'Reporting Manager' : 'HR Admin';
  let emailSubject = `[Regularization Request] ${employeeName} - ${date}`;

  const text = `Dear ${recipientName},

A new attendance regularization request has been submitted by ${employeeName} and is pending your review as ${roleLabel}.

Regularization Details:
----------------------------------------
Employee Name      : ${employeeName}
Date               : ${date}
Request Type       : ${requestType}
Requested Check-In : ${checkIn}
Requested Check-Out: ${checkOut}
Reason             : ${reason}
----------------------------------------

You can review, approve, or reject this request by logging into the HRM Dashboard:
${urls.regularizationUrl}

Best regards,
The Universe One HRM Team`;

  const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0;">
  <p>Dear ${recipientName},</p>
  <p>A new attendance regularization request has been submitted by <strong>${employeeName}</strong> and is pending your review as <strong>${roleLabel}</strong>.</p>
  
  <p style="font-weight: 600; margin-bottom: 8px; color: #000000;">Regularization Details:</p>
  <div style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 12px 0; margin-bottom: 20px;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="padding: 4px 0; width: 150px; font-weight: bold; color: #000000;">Employee Name:</td>
        <td style="padding: 4px 0; color: #475569;">${employeeName}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #000000;">Date:</td>
        <td style="padding: 4px 0; color: #475569;">${date}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #000000;">Request Type:</td>
        <td style="padding: 4px 0; color: #475569;">${requestType}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #000000;">Requested Check-In:</td>
        <td style="padding: 4px 0; color: #475569;">${checkIn}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-weight: bold; color: #000000;">Requested Check-Out:</td>
        <td style="padding: 4px 0; color: #475569;">${checkOut}</td>
      </tr>
      <tr>
        <td valign="top" style="padding: 8px 0 4px 0; font-weight: bold; color: #000000;">Reason:</td>
        <td style="padding: 8px 0 4px 0; color: #475569; white-space: pre-wrap;">${reason}</td>
      </tr>
    </table>
  </div>
  
  <p>You can review, approve, or reject this request by clicking the link below:</p>
  <p><a href="${urls.regularizationUrl}" style="color: #2563eb; font-weight: 600; text-decoration: underline;">${urls.regularizationUrl}</a></p>
  
  <p style="margin-top: 24px;">Best regards,<br/><strong>The Universe One HRM Team</strong></p>
</div>`;

  return {
    subject: emailSubject,
    text,
    html,
  };
}


// --- weekly-summary.ts ---
function renderWeeklySummary(payload: Record<string, unknown>) {
  const recipientName = String(payload.recipient_name ?? 'Admin');
  const weekStartDateStr = String(payload.week_start_date ?? '');
  const weekEndDateStr = String(payload.week_end_date ?? '');

  const formatShortDate = (dStr: string) => {
    try {
      const d = new Date(dStr);
      if (!isNaN(d.getTime())) {
        const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
        return new Intl.DateTimeFormat('en-IN', options).format(d);
      }
    } catch {}
    return dStr;
  };

  const formatFullDate = (dStr: string) => {
    try {
      const d = new Date(dStr);
      if (!isNaN(d.getTime())) {
        const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
        return new Intl.DateTimeFormat('en-IN', options).format(d).replace(/\//g, '-');
      }
    } catch {}
    return dStr;
  };

  const weekStartFormatted = formatFullDate(weekStartDateStr);
  const weekEndFormatted = formatFullDate(weekEndDateStr);

  const leavesApplied = (payload.leaves_applied ?? []) as Array<{
    employee_id: string;
    name: string;
    leave_type: string;
    status: string;
    start_date: string;
    end_date: string;
    duration_days: number;
  }>;

  const missingAttendance = (payload.missing_attendance ?? []) as Array<{
    employee_id: string;
    name: string;
    email: string;
    dates: Array<{ date: string; status: string }>;
  }>;

  const missingWorkLogs = (payload.missing_work_logs ?? []) as Array<{
    employee_id: string;
    name: string;
    email: string;
    dates: Array<{ date: string; status: string }>;
  }>;

  // --- PLAIN TEXT GENERATION ---
  let leavesText = 'No leaves applied during this week.';
  if (leavesApplied.length > 0) {
    leavesText = leavesApplied.map(l => 
      `  - [${l.employee_id}] ${l.name}: ${formatFullDate(l.start_date)} to ${formatFullDate(l.end_date)} (${l.leave_type} - ${l.status})`
    ).join('\n');
  }

  let attendanceText = 'No missing check-ins during this week!';
  if (missingAttendance.length > 0) {
    attendanceText = missingAttendance.map(emp => {
      const datesList = emp.dates.map(d => `${formatShortDate(d.date)} (${d.status})`).join(', ');
      return `  - [${emp.employee_id}] ${emp.name} (${emp.email})\n    Dates: ${datesList}`;
    }).join('\n\n');
  }

  let logsText = 'All active employees submitted their daily work logs successfully this week!';
  if (missingWorkLogs.length > 0) {
    logsText = missingWorkLogs.map(emp => {
      const datesList = emp.dates.map(d => `${formatShortDate(d.date)} (${d.status})`).join(', ');
      return `  - [${emp.employee_id}] ${emp.name} (${emp.email})\n    Dates: ${datesList}`;
    }).join('\n\n');
  }

  const text = `Dear ${recipientName},

This is the weekly automated consolidated report for the week starting ${weekStartFormatted} to ${weekEndFormatted}.

1. Leaves Applied (Approved & Pending):
-------------------------------------------------------------
${leavesText}
-------------------------------------------------------------

2. Employees Missing Check-in:
-------------------------------------------------------------
${attendanceText}
-------------------------------------------------------------

3. Employees Missing Daily Work Logs:
-------------------------------------------------------------
${logsText}
-------------------------------------------------------------

You can manage all records by logging into your HRM dashboard.

Best regards,
The Universe One Team`;

  // --- HTML GENERATION ---
  // A. Leaves Applied Rows
  let leavesHtml = '';
  if (leavesApplied.length === 0) {
    leavesHtml = `<tr><td colspan="4" style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; color: #64748b; font-style: italic;">No leaves applied this week.</td></tr>`;
  } else {
    leavesApplied.forEach(l => {
      const statusColor = l.status === 'approved' ? '#16a34a' : '#d97706';
      leavesHtml += `<tr>
        <td style="border: 1px solid #e2e8f0; padding: 10px; color: #475569;">${l.employee_id || '-'}</td>
        <td style="border: 1px solid #e2e8f0; padding: 10px; color: #000000; font-weight: bold;">${l.name}</td>
        <td style="border: 1px solid #e2e8f0; padding: 10px; color: #475569;">${formatFullDate(l.start_date)} to ${formatFullDate(l.end_date)} (${l.duration_days} days)</td>
        <td style="border: 1px solid #e2e8f0; padding: 10px; color: ${statusColor}; font-weight: 600;">${l.leave_type} - ${l.status.toUpperCase()}</td>
      </tr>`;
    });
  }

  // B. Missing Attendance Rows
  let attendanceHtml = '';
  if (missingAttendance.length === 0) {
    attendanceHtml = `<tr><td colspan="4" style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; color: #64748b; font-style: italic;">No missing check-ins this week!</td></tr>`;
  } else {
    missingAttendance.forEach(emp => {
      const datesHtml = emp.dates.map(d => {
        let color = '#e11d48'; // red for missing
        if (d.status.includes('Approved')) color = '#16a34a';
        else if (d.status.includes('Pending')) color = '#d97706';
        return `• <span style="font-weight: 600; color: ${color};">${formatShortDate(d.date)}</span> (${d.status})`;
      }).join('<br/>');

      attendanceHtml += `<tr>
        <td style="border: 1px solid #e2e8f0; padding: 10px; color: #475569;">${emp.employee_id || '-'}</td>
        <td style="border: 1px solid #e2e8f0; padding: 10px; color: #000000; font-weight: bold;">${emp.name}</td>
        <td style="border: 1px solid #e2e8f0; padding: 10px; color: #475569; font-size: 14px; line-height: 1.5;">${datesHtml}</td>
        <td style="border: 1px solid #e2e8f0; padding: 10px; color: #475569;">${emp.email}</td>
      </tr>`;
    });
  }

  // C. Missing Work Logs Rows
  let logsHtml = '';
  if (missingWorkLogs.length === 0) {
    logsHtml = `<tr><td colspan="4" style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; color: #64748b; font-style: italic;">All work logs submitted this week!</td></tr>`;
  } else {
    missingWorkLogs.forEach(emp => {
      const datesHtml = emp.dates.map(d => {
        let color = '#e11d48'; // red
        if (d.status.includes('Approved')) color = '#16a34a';
        else if (d.status.includes('Pending')) color = '#d97706';
        return `• <span style="font-weight: 600; color: ${color};">${formatShortDate(d.date)}</span> (${d.status})`;
      }).join('<br/>');

      logsHtml += `<tr>
        <td style="border: 1px solid #e2e8f0; padding: 10px; color: #475569;">${emp.employee_id || '-'}</td>
        <td style="border: 1px solid #e2e8f0; padding: 10px; color: #000000; font-weight: bold;">${emp.name}</td>
        <td style="border: 1px solid #e2e8f0; padding: 10px; color: #475569; font-size: 14px; line-height: 1.5;">${datesHtml}</td>
        <td style="border: 1px solid #e2e8f0; padding: 10px; color: #475569;">${emp.email}</td>
      </tr>`;
    });
  }

  const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b; max-width: 700px; margin: 0;">
  <p>Dear ${recipientName},</p>
  <p>This is the weekly automated consolidated report for the period <strong>${weekStartFormatted}</strong> to <strong>${weekEndFormatted}</strong>.</p>
  
  <!-- 1. Leaves Section -->
  <h3 style="color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px;">1. Leaves Applied (Approved & Pending)</h3>
  <div style="margin-bottom: 20px; overflow-x: auto;">
    <table role="presentation" border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; border-color: #e2e8f0; width: 100%;">
      <thead>
        <tr style="background-color: #f8fafc; border: 1px solid #e2e8f0;">
          <th align="left" style="color: #000000; font-weight: bold; border: 1px solid #e2e8f0; padding: 10px; width: 100px;">ID</th>
          <th align="left" style="color: #000000; font-weight: bold; border: 1px solid #e2e8f0; padding: 10px; width: 140px;">Name</th>
          <th align="left" style="color: #000000; font-weight: bold; border: 1px solid #e2e8f0; padding: 10px;">Dates</th>
          <th align="left" style="color: #000000; font-weight: bold; border: 1px solid #e2e8f0; padding: 10px; width: 140px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${leavesHtml}
      </tbody>
    </table>
  </div>
  
  <!-- 2. Attendance Section -->
  <h3 style="color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 30px;">2. Employees Missing Check-in</h3>
  <div style="margin-bottom: 20px; overflow-x: auto;">
    <table role="presentation" border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; border-color: #e2e8f0; width: 100%;">
      <thead>
        <tr style="background-color: #f8fafc; border: 1px solid #e2e8f0;">
          <th align="left" style="color: #000000; font-weight: bold; border: 1px solid #e2e8f0; padding: 10px; width: 100px;">ID</th>
          <th align="left" style="color: #000000; font-weight: bold; border: 1px solid #e2e8f0; padding: 10px; width: 140px;">Name</th>
          <th align="left" style="color: #000000; font-weight: bold; border: 1px solid #e2e8f0; padding: 10px;">Missing Dates</th>
          <th align="left" style="color: #000000; font-weight: bold; border: 1px solid #e2e8f0; padding: 10px;">Email</th>
        </tr>
      </thead>
      <tbody>
        ${attendanceHtml}
      </tbody>
    </table>
  </div>
  
  <!-- 3. Work Logs Section -->
  <h3 style="color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 30px;">3. Employees Missing Daily Work Logs</h3>
  <div style="margin-bottom: 20px; overflow-x: auto;">
    <table role="presentation" border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; border-color: #e2e8f0; width: 100%;">
      <thead>
        <tr style="background-color: #f8fafc; border: 1px solid #e2e8f0;">
          <th align="left" style="color: #000000; font-weight: bold; border: 1px solid #e2e8f0; padding: 10px; width: 100px;">ID</th>
          <th align="left" style="color: #000000; font-weight: bold; border: 1px solid #e2e8f0; padding: 10px; width: 140px;">Name</th>
          <th align="left" style="color: #000000; font-weight: bold; border: 1px solid #e2e8f0; padding: 10px;">Missing Dates</th>
          <th align="left" style="color: #000000; font-weight: bold; border: 1px solid #e2e8f0; padding: 10px;">Email</th>
        </tr>
      </thead>
      <tbody>
        ${logsHtml}
      </tbody>
    </table>
  </div>
  
  <p style="margin-top: 24px;">You can manage all records by logging into your HRM dashboard.</p>
  
  <p style="margin-top: 24px;">Best regards,<br/><strong>The Universe One Team</strong></p>
</div>`;

  return {
    subject: `Weekly Attendance & Work Log Report: ${weekStartFormatted} to ${weekEndFormatted}`,
    text,
    html,
  };
}


// --- templates/index.ts ---












type OutboxRow = {
  id: string;
  event_type: 'employee_created' | 'task_assigned' | 'task_due' | 'task_repeat_assigned' | 'onboarding_invite' | 'daily_work_log_report';
  recipient_email: string;
  payload: Record<string, unknown>;
};

type RenderUrls = {
  loginUrl: string;
  settingsUrl: string;
  taskUrl: string;
};

export function renderEmail(row: OutboxRow, urls: RenderUrls) {
  switch (row.event_type) {
    case 'onboarding_invite':
      return renderOnboarding(row.payload);
    case 'employee_created':
      return renderEmployeeCreated(row.payload, {
        loginUrl: urls.loginUrl,
        settingsUrl: urls.settingsUrl,
      });
    case 'task_assigned':
      if (row.payload?.is_ticket === true) {
        const baseAppUrl = urls.loginUrl.replace(/\/login$/, '');
        const sourceModule = String(row.payload.source_module ?? 'hrm');
        const ticketUrl = sourceModule === 'task_manager'
          ? `${baseAppUrl}/Taskmanager/dashboard`
          : `${baseAppUrl}/HRM/hrm`;
        return renderTicketAssigned(row.payload, { ticketUrl });
      }
      if (row.payload?.is_leave === true) {
        const baseAppUrl = urls.loginUrl.replace(/\/login$/, '');
        const leaveUrl = `${baseAppUrl}/HRM/hrm`;
        return renderLeaveApplied(row.payload, { leaveUrl });
      }
      if (row.payload?.is_regularization === true) {
        const baseAppUrl = urls.loginUrl.replace(/\/login$/, '');
        const regularizationUrl = `${baseAppUrl}/HRM/hrm`;
        return renderRegularizationApplied(row.payload, { regularizationUrl });
      }
      return renderTaskAssigned(row.payload, { taskUrl: urls.taskUrl });
    case 'task_repeat_assigned':
      return renderTaskRepeatAssigned(row.payload, { taskUrl: urls.taskUrl });
    case 'daily_work_log_report':
      if (row.payload?.report_type === 'missing_attendance') {
        return renderMissingAttendance(row.payload);
      }
      if (row.payload?.report_type === 'weekly_summary') {
        return renderWeeklySummary(row.payload);
      }
      return renderDailyReport(row.payload);
    case 'task_due':
    default:
      return renderTaskDue(row.payload, { taskUrl: urls.taskUrl });
  }
}



import { createClient } from 'npm:@supabase/supabase-js@2';


const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const DISPATCHER_SHARED_SECRET = Deno.env.get('DISPATCHER_SHARED_SECRET') ?? '';
const DEFAULT_APP_BASE_URL = 'https://universeone.bncglobal.in/login';
let APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? DEFAULT_APP_BASE_URL;
const EMAIL_NOTIFICATIONS_ENABLED = (Deno.env.get('EMAIL_NOTIFICATIONS_ENABLED') ?? 'true').trim().toLowerCase() === 'true';

type OutboxRow = {
  id: string;
  event_type: 'employee_created' | 'task_assigned' | 'task_due' | 'task_repeat_assigned' | 'onboarding_invite' | 'daily_work_log_report';
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
  return `${appRootUrl}/Taskmanager/dashboard/tasks/${taskId}`;
}

function renderEmailTemplate(row: OutboxRow) {
  const loginUrl = getLoginUrl();
  const settingsUrl = `${getAppRootUrl()}/dashboard`;
  const taskId = row.payload?.task_id ? String(row.payload.task_id) : null;
  const taskUrl = buildTaskUrl(taskId);

  return renderEmail(row, {
    loginUrl,
    settingsUrl,
    taskUrl,
  });
}

async function sendWithBrevo(row: OutboxRow) {
  const brevoApiKey = String(row.payload?.brevo_api_key ?? '').trim();
  const brevoFromEmail = String(row.payload?.brevo_from_email ?? '').trim();
  const brevoFromName = String(row.payload?.brevo_from_name ?? 'Universe One').trim();
  const { subject, text, html } = renderEmailTemplate(row);

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': brevoApiKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: brevoFromName || 'Universe One',
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

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const authHeader = req.headers.get('Authorization') ?? '';
  const expected = `Bearer ${DISPATCHER_SHARED_SECRET.trim()}`;
  if (!DISPATCHER_SHARED_SECRET.trim() || authHeader !== expected) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  const requestBody = await req.json().catch(() => ({}));
  const requestEnabledFlag = String(requestBody?.email_notifications_enabled ?? '').trim().toLowerCase();
  const notificationsEnabled =
    requestEnabledFlag === 'true' ? true : requestEnabledFlag === 'false' ? false : EMAIL_NOTIFICATIONS_ENABLED;
  const brevoApiKey = String(requestBody?.brevo_api_key ?? '').trim();
  const brevoFromEmail = String(requestBody?.brevo_from_email ?? '').trim();
  const brevoFromName = String(requestBody?.brevo_from_name ?? 'Universe One').trim();
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
