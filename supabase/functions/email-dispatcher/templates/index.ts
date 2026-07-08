import { render as renderOnboarding } from './onboarding-invite.ts';
import { render as renderEmployeeCreated } from './employee-created.ts';
import { render as renderTaskAssigned } from './task-assigned.ts';
import { render as renderTaskRepeatAssigned } from './task-repeat-assigned.ts';
import { render as renderTaskDue } from './task-due.ts';
import { render as renderDailyReport } from './daily-work-log-report.ts';

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
      return renderTaskAssigned(row.payload, { taskUrl: urls.taskUrl });
    case 'task_repeat_assigned':
      return renderTaskRepeatAssigned(row.payload, { taskUrl: urls.taskUrl });
    case 'daily_work_log_report':
      return renderDailyReport(row.payload);
    case 'task_due':
    default:
      return renderTaskDue(row.payload, { taskUrl: urls.taskUrl });
  }
}
