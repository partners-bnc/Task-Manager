export function render(payload: Record<string, unknown>) {
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
