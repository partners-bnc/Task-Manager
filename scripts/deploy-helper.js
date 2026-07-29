const fs = require('fs');
const path = require('path');

const token = process.argv[2];
if (!token) {
  console.error("Error: Please provide your Supabase Access Token.");
  console.error("Usage: node scripts/deploy-helper.js <access_token>");
  process.exit(1);
}

const baseDir = path.join(__dirname, '../supabase/functions/email-dispatcher');

// Read index.ts
let indexContent = fs.readFileSync(path.join(baseDir, 'index.ts'), 'utf8');

// Read templates
const templates = [
  { file: 'onboarding-invite.ts', funcName: 'renderOnboarding' },
  { file: 'employee-created.ts', funcName: 'renderEmployeeCreated' },
  { file: 'task-assigned.ts', funcName: 'renderTaskAssigned' },
  { file: 'task-repeat-assigned.ts', funcName: 'renderTaskRepeatAssigned' },
  { file: 'task-due.ts', funcName: 'renderTaskDue' },
  { file: 'daily-work-log-report.ts', funcName: 'renderDailyReport' },
  { file: 'ticket-assigned.ts', funcName: 'renderTicketAssigned' },
  { file: 'missing-attendance.ts', funcName: 'renderMissingAttendance' },
  { file: 'leave-applied.ts', funcName: 'renderLeaveApplied' },
  { file: 'regularization-applied.ts', funcName: 'renderRegularizationApplied' },
  { file: 'weekly-summary.ts', funcName: 'renderWeeklySummary' },
];

let bundleContent = `// Compiled with custom deploy-helper
`;

// Inline each template code
for (const temp of templates) {
  let content = fs.readFileSync(path.join(baseDir, 'templates', temp.file), 'utf8');
  
  // Clean up content:
  // Remove export keywords from functions
  content = content.replace(/export\s+function\s+render\b/g, `function ${temp.funcName}`);
  
  // If there are other helper functions like formatDateTime, rename them to avoid conflicts
  if (temp.file === 'task-assigned.ts') {
    content = content.replace(/formatDateTime/g, 'formatTaskAssignedDateTime');
  } else if (temp.file === 'task-due.ts') {
    content = content.replace(/import\s+\{\s*formatDateTime\s*\}\s*from\s+['"]\.\/task-assigned(?:\.ts)?['"];?/g, '');
    content = content.replace(/formatDateTime/g, 'formatTaskAssignedDateTime');
  } else if (temp.file === 'task-repeat-assigned.ts') {
    content = content.replace(/import\s+\{\s*formatDateTime\s*\}\s*from\s+['"]\.\/task-assigned(?:\.ts)?['"];?/g, '');
    content = content.replace(/formatDateTime/g, 'formatTaskAssignedDateTime');
  } else if (temp.file === 'daily-work-log-report.ts') {
    content = content.replace(/formatDateTime/g, 'formatDailyReportDateTime');
  }
  
  bundleContent += `\n// --- ${temp.file} ---\n` + content + '\n';
}

// Read and inline templates/index.ts
let templatesIndexContent = fs.readFileSync(path.join(baseDir, 'templates/index.ts'), 'utf8');
// Strip imports from templates/index.ts
templatesIndexContent = templatesIndexContent.replace(/import\s+[\s\S]*?from\s+['"].*?['"];?/g, '');
bundleContent += `\n// --- templates/index.ts ---\n` + templatesIndexContent + '\n';

// Strip the import of templates/index.ts from index.ts
indexContent = indexContent.replace(/import\s+\{\s*renderEmail\s*\}\s*from\s+['"]\.\/templates\/index\.ts['"];?/g, '');

const finalFileContent = bundleContent + '\n' + indexContent;

// Save locally for debugging/inspection
const bundledPath = path.join(__dirname, 'bundled_index.ts');
fs.writeFileSync(bundledPath, finalFileContent, 'utf8');
console.log(`Bundled file written to ${bundledPath}`);

// Deploy via Supabase API
const projectRef = 'llfoaqnljjbneouiedbg';
const slug = 'email-dispatcher';
const url = `https://api.supabase.com/v1/projects/${projectRef}/functions/deploy?slug=${slug}`;

console.log("Bundled successfully. Deploying to Supabase project...");

const formData = new FormData();
formData.append('metadata', JSON.stringify({
  entrypoint_path: 'index.ts',
  name: 'email-dispatcher',
  verify_jwt: false
}));

// Create a blob representing the bundled file
const fileBlob = new Blob([finalFileContent], { type: 'text/plain' });
formData.append('file', fileBlob, 'index.ts');

fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData
})
.then(async res => {
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    console.log("Deployment successful!");
    console.log("Function details:", data);
  } else {
    console.error("Deployment failed:", res.status, data);
  }
})
.catch(err => {
  console.error("Network error during deployment:", err);
});
