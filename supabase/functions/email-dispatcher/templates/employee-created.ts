export function render(payload: Record<string, unknown>, urls: { loginUrl: string; settingsUrl: string }) {
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
