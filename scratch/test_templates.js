import fs from 'fs';
import path from 'path';

// Helper to strip TypeScript types so we can run it in Node
function stripTypes(code) {
  return code
    .replace(/:\s*Record<string,\s*unknown>/g, '')
    .replace(/:\s*\{\s*taskUrl:\s*string\s*\}/g, '')
    .replace(/:\s*Intl\.DateTimeFormatOptions/g, '')
    .replace(/:\s*Record<string,\s*string>/g, '')
    .replace(/:\s*string\s*\|\s*null\s*\|\s*undefined/g, '')
    .replace(/\s+as\s+Array<[^>]+>/g, '') // strip TS type assertion
    .replace("import { formatDateTime } from './task-assigned.ts';", "import { formatDateTime } from './task-assigned.js';");
}

const templatesDir = path.resolve(process.cwd(), 'supabase/functions/email-dispatcher/templates');
const scratchDir = path.resolve(process.cwd(), 'scratch');

// 1. Copy and convert task-assigned.ts
let taskAssignedCode = fs.readFileSync(path.join(templatesDir, 'task-assigned.ts'), 'utf8');
fs.writeFileSync(path.join(scratchDir, 'task-assigned.js'), stripTypes(taskAssignedCode));

// 2. Copy and convert task-repeat-assigned.ts
let taskRepeatCode = fs.readFileSync(path.join(templatesDir, 'task-repeat-assigned.ts'), 'utf8');
fs.writeFileSync(path.join(scratchDir, 'task-repeat-assigned.js'), stripTypes(taskRepeatCode));

// 3. Copy and convert task-due.ts
let taskDueCode = fs.readFileSync(path.join(templatesDir, 'task-due.ts'), 'utf8');
fs.writeFileSync(path.join(scratchDir, 'task-due.js'), stripTypes(taskDueCode));

// 4. Copy and convert daily-work-log-report.ts
let dailyReportCode = fs.readFileSync(path.join(templatesDir, 'daily-work-log-report.ts'), 'utf8');
fs.writeFileSync(path.join(scratchDir, 'daily-work-log-report.js'), stripTypes(dailyReportCode));

// Run tests using ES import
const taskAssigned = await import('./task-assigned.js');
const taskRepeat = await import('./task-repeat-assigned.js');
const taskDue = await import('./task-due.js');
const dailyReport = await import('./daily-work-log-report.js');

const mockPayload = {
  employee_name: 'John Doe',
  task_name: 'Website Redesign - Build login page',
  creator_name: 'Jane Smith',
  task_description: 'Please build the login page with responsive CSS and clean code.',
  priority: 'high',
  due_date: '2026-07-15T18:30:00+05:30' // 6:30 PM IST
};

const urls = {
  taskUrl: 'https://tasks.bncglobal.in/Taskmanager/dashboard/tasks/test-task-123'
};

console.log("=========================================");
console.log("TESTING: Task Assigned Email");
console.log("=========================================");
const assignedResult = taskAssigned.render(mockPayload, urls);
console.log("SUBJECT:", assignedResult.subject);
console.log("\nBODY:\n", assignedResult.text);

console.log("\n=========================================");
console.log("TESTING: Task Repeat Assigned Email");
console.log("=========================================");
const repeatResult = taskRepeat.render(mockPayload, urls);
console.log("SUBJECT:", repeatResult.subject);
console.log("\nBODY:\n", repeatResult.text);

console.log("\n=========================================");
console.log("TESTING: Task Due Email");
console.log("=========================================");
const dueResult = taskDue.render(mockPayload, urls);
console.log("SUBJECT:", dueResult.subject);
console.log("\nBODY:\n", dueResult.text);

console.log("\n=========================================");
console.log("TESTING: Daily Work Log Report Email");
console.log("=========================================");
const mockDailyPayload = {
  recipient_name: 'Anshu Prasad',
  report_date: '08-07-2026',
  missing_employees: [
    { employee_id: 'e101', name: 'Sumit Sharma', email: 'sumit@bncglobal.in' },
    { employee_id: 'e102', name: 'Gurvinder Singh', email: 'gurvinder@bncglobal.in' },
    { employee_id: 'e105', name: 'Rohan Sharma', email: 'rohanbncglobal@gmail.com' }
  ]
};
const dailyResult = dailyReport.render(mockDailyPayload);
console.log("SUBJECT:", dailyResult.subject);
console.log("\nBODY (Plain Text):\n", dailyResult.text);
console.log("\nHTML BODY:\n", dailyResult.html);
console.log("=========================================");
