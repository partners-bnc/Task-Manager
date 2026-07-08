import { formatDateTime } from './task-assigned.ts';

export function render(payload: Record<string, unknown>, urls: { taskUrl: string }) {
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

  const { date: dueDate, time: dueTime } = formatDateTime(payload.due_date ? String(payload.due_date) : null);

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

The Task Manager Team`;

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
  
  <p style="margin-top: 24px;">Best regards,<br/><strong>The Task Manager Team</strong></p>
</div>`;

  return {
    subject: `Upcoming Deadline: ${taskName}`,
    text,
    html,
  };
}
