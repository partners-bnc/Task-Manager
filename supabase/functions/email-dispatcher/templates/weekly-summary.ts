export function render(payload: Record<string, unknown>) {
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
