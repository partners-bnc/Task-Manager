export function formatDateTime(dueStr) {
  if (!dueStr) return { date: 'Not set', time: 'Not set' };
  try {
    const d = new Date(dueStr);
    if (isNaN(d.getTime())) return { date: String(dueStr), time: 'Not set' };

    // Format Date using Intl in Asia/Kolkata timezone
    const dateOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    };
    const formatterDate = new Intl.DateTimeFormat('en-IN', dateOptions);
    const dateFormatted = formatterDate.format(d).replace(/\//g, '-');

    // Format Time using Intl in Asia/Kolkata timezone
    const timeOptions = {
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

export function render(payload, urls) {
  const employeeName = String(payload.employee_name ?? 'Employee');
  const taskName = String(payload.task_name ?? 'Task');
  const assignerName = String(payload.creator_name ?? 'System / Admin');
  const taskDescription = String(payload.task_description ?? 'N/A').trim() || 'N/A';
  const rawPriority = String(payload.priority ?? 'medium').toLowerCase();
  
  const priorityMap = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent'
  };
  const priority = priorityMap[rawPriority] || 'Medium';

  const { date: dueDate, time: dueTime } = formatDateTime(payload.due_date ? String(payload.due_date) : null);

  const text = `Dear ${employeeName},

A new task has been created and assigned to you within the Task Manager. Please review the details below and begin your work accordingly.

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

The Task Manager Team`;

  const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0;">
  <p>Dear ${employeeName},</p>
  <p>A new task has been created and assigned to you within the Task Manager. Please review the details below and begin your work accordingly.</p>
  
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
  
  <p style="margin-top: 24px;">Best regards,<br/><strong>The Task Manager Team</strong></p>
</div>`;

  return {
    subject: `New Task Assigned: ${taskName}`,
    text,
    html,
  };
}
