export function render(payload: Record<string, unknown>) {
  const recipientName = String(payload.recipient_name ?? 'Administrator');
  const reportDate = String(payload.report_date ?? '');
  const missingEmployees = (payload.missing_employees ?? []) as Array<{
    employee_id: string;
    name: string;
    email: string;
  }>;

  // 1. Render Plain Text body
  let employeeRowsText = '';
  if (missingEmployees.length === 0) {
    employeeRowsText = 'All active employees submitted their daily work logs today.';
  } else {
    employeeRowsText = `Employee ID   | Name                 | Email\n`;
    employeeRowsText += `------------------------------------------------------------\n`;
    missingEmployees.forEach((emp) => {
      const empId = String(emp.employee_id || '').padEnd(13, ' ');
      const empName = String(emp.name || '').padEnd(20, ' ');
      const empEmail = String(emp.email || '');
      employeeRowsText += `${empId} | ${empName} | ${empEmail}\n`;
    });
  }

  const text = `Dear ${recipientName},

This is the daily work log report for ${reportDate}.

Below is the list of active employees who did not submit their daily work logs:

------------------------------------------------------------
${employeeRowsText}
------------------------------------------------------------

Please follow up with them accordingly.

Best regards,

The Universe One Team`;

  // 2. Render HTML body
  let employeeRowsHtml = '';
  if (missingEmployees.length === 0) {
    employeeRowsHtml = `<tr><td colspan="3" style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; color: #64748b;">All active employees submitted their daily work logs today.</td></tr>`;
  } else {
    missingEmployees.forEach((emp) => {
      employeeRowsHtml += `<tr>
        <td style="border: 1px solid #e2e8f0; padding: 10px; color: #475569;">${emp.employee_id || 'N/A'}</td>
        <td style="border: 1px solid #e2e8f0; padding: 10px; color: #000000; font-weight: bold;">${emp.name || 'N/A'}</td>
        <td style="border: 1px solid #e2e8f0; padding: 10px; color: #475569;">${emp.email || 'N/A'}</td>
      </tr>`;
    });
  }

  const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b; max-width: 650px; margin: 0;">
  <p>Dear ${recipientName},</p>
  <p>This is the daily work log report for <strong>${reportDate}</strong>.</p>
  <p>Below is the list of active employees who did not submit their daily work logs:</p>
  
  <p style="font-weight: 600; margin-bottom: 8px; color: #000000;">Missing Daily Logs:</p>
  <div style="margin-bottom: 20px; overflow-x: auto;">
    <table role="presentation" border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; border-color: #e2e8f0; width: 100%; min-width: 500px;">
      <thead>
        <tr style="background-color: #f8fafc; border: 1px solid #e2e8f0;">
          <th align="left" style="color: #000000; font-weight: bold; border: 1px solid #e2e8f0; padding: 10px; width: 120px;">Employee ID</th>
          <th align="left" style="color: #000000; font-weight: bold; border: 1px solid #e2e8f0; padding: 10px;">Name</th>
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
