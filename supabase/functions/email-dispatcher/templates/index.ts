import { render as renderOnboarding } from './onboarding-invite.ts';
import { render as renderEmployeeCreated } from './employee-created.ts';
import { render as renderTaskAssigned } from './task-assigned.ts';
import { render as renderTaskRepeatAssigned } from './task-repeat-assigned.ts';
import { render as renderTaskDue } from './task-due.ts';
import { render as renderDailyReport } from './daily-work-log-report.ts';
import { render as renderTicketAssigned } from './ticket-assigned.ts';
import { render as renderMissingAttendance } from './missing-attendance.ts';
import { render as renderLeaveApplied } from './leave-applied.ts';
import { render as renderRegularizationApplied } from './regularization-applied.ts';
import { render as renderWeeklySummary } from './weekly-summary.ts';

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

