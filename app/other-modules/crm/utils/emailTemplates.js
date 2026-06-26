export const TEMPLATE_CATEGORIES = [
  "Outreach",
  "Follow-up",
  "Proposal",
  "Onboarding",
  "Reminder",
  "General",
];

export const TEMPLATE_STATUSES = ["Draft", "Active", "Archived"];

export const SAMPLE_VARIABLES = {
  ContactName: "John Doe",
  CompanyName: "Acme Corp",
  AgentName: "Alice Admin",
  ProductName: "Enterprise Audit Package",
  EstimatedValue: "$10,000",
  FollowupDate: "May 28, 2026",
};

export function normalizeVariables(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
  }

  return [
    ...new Set(
      String(value || "")
        .split(",")
        .map((item) => item.replace(/[{}]/g, "").trim())
        .filter(Boolean)
    ),
  ];
}

export function renderTemplateVariables(content, variables = SAMPLE_VARIABLES) {
  if (!content) return "";
  
  // Normalize variable keys for matching
  const normalizedVariables = {};
  for (const [key, val] of Object.entries(variables || {})) {
    const norm = key.toLowerCase().replace(/[\s_\-]+/g, '');
    normalizedVariables[norm] = val;
  }
  
  const getNormalizedValue = (key) => {
    const norm = key.toLowerCase().replace(/[\s_\-]+/g, '');
    
    // Check if key is explicitly in normalizedVariables
    if (Object.prototype.hasOwnProperty.call(normalizedVariables, norm)) {
      return normalizedVariables[norm];
    }
    
    // Aliases fallback
    switch (norm) {
      case 'contactname':
      case 'fullname':
      case 'leadname':
      case 'name':
        return normalizedVariables['contactname'] || normalizedVariables['fullname'] || normalizedVariables['leadname'] || normalizedVariables['name'] || '';
      case 'firstname':
        const nameVal = normalizedVariables['contactname'] || normalizedVariables['fullname'] || normalizedVariables['leadname'] || normalizedVariables['name'] || '';
        return nameVal ? String(nameVal).split(' ')[0] : '';
      case 'companyname':
      case 'company':
        return normalizedVariables['companyname'] || normalizedVariables['company'] || '';
      case 'agentname':
      case 'agent':
      case 'assignedto':
        return normalizedVariables['agentname'] || normalizedVariables['agent'] || normalizedVariables['assignedto'] || '';
      case 'productname':
      case 'product':
        return normalizedVariables['productname'] || normalizedVariables['product'] || '';
      case 'estimatedvalue':
      case 'value':
        return normalizedVariables['estimatedvalue'] || normalizedVariables['value'] || '';
      default:
        return null;
    }
  };

  return String(content).replace(/\{\{\s*([a-zA-Z0-9_\s\-]+?)\s*\}\}/g, (match, key) => {
    const val = getNormalizedValue(key);
    return val !== null ? val : match;
  });
}

export function sanitizeEmailHtml(html) {
  let sanitized = String(html || "");

  sanitized = sanitized.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  sanitized = sanitized.replace(/<style[\s\S]*?@import[\s\S]*?<\/style>/gi, "");
  sanitized = sanitized.replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "");
  sanitized = sanitized.replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, "");
  sanitized = sanitized.replace(/<embed[\s\S]*?>[\s\S]*?<\/embed>/gi, "");
  sanitized = sanitized.replace(/<form[\s\S]*?>[\s\S]*?<\/form>/gi, "");
  sanitized = sanitized.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  sanitized = sanitized.replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, "");
  sanitized = sanitized.replace(/\s(href|src)\s*=\s*(['"])\s*data:(?!image\/(?:png|jpeg|jpg|gif|webp);)/gi, " $1=$2#");

  return sanitized.trim();
}

export function buildPreviewDocument(template, variables = SAMPLE_VARIABLES) {
  const html = renderTemplateVariables(sanitizeEmailHtml(template?.html_body || template?.html || ""), variables);
  const subject = renderTemplateVariables(template?.subject || "Email preview", variables);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
    <style>
      html, body { margin: 0; padding: 0; background: #e5e7eb; font-family: Arial, Helvetica, sans-serif; }
      .preview-shell { padding: 24px 12px; }
      .preview-meta { max-width: 680px; margin: 0 auto 12px; color: #475569; font-size: 12px; line-height: 1.5; }
      .preview-meta strong { color: #0f172a; }
      @media (max-width: 520px) { .preview-shell { padding: 12px 0; } }
    </style>
  </head>
  <body>
    <div class="preview-shell">
      <div class="preview-meta">
        <div><strong>Subject:</strong> ${escapeHtml(subject)}</div>
      </div>
      ${html}
    </div>
  </body>
</html>`;
}

export function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const STARTER_EMAIL_TEMPLATES = [
  {
    name: "Initial Outreach",
    category: "Outreach",
    subject: "Helping {{CompanyName}} move faster this quarter",
    status: "Active",
    source: "Seed",
    variables: ["ContactName", "CompanyName", "AgentName", "ProductName"],
    plain_text_body:
      "Hi {{ContactName}}, I wanted to reach out because teams like {{CompanyName}} often use {{ProductName}} to improve follow-up speed and visibility. Would you be open to a short conversation this week?",
    html_body: starterShell({
      eyebrow: "New conversation",
      title: "A practical way to support {{CompanyName}}'s growth",
      body:
        "Hi {{ContactName}},<br><br>I wanted to reach out because teams like <strong>{{CompanyName}}</strong> often use <strong>{{ProductName}}</strong> to improve follow-up speed, visibility, and handoffs across the pipeline.",
      cta: "Book a quick discussion",
      footer: "{{AgentName}} - TasksFlow CRM",
    }),
  },
  {
    name: "Warm Follow-up",
    category: "Follow-up",
    subject: "Following up on {{CompanyName}}",
    status: "Active",
    source: "Seed",
    variables: ["ContactName", "CompanyName", "AgentName", "FollowupDate"],
    plain_text_body:
      "Hi {{ContactName}}, following up on our conversation about {{CompanyName}}. I can share a concise next-step plan by {{FollowupDate}} if helpful.",
    html_body: starterShell({
      eyebrow: "Follow-up",
      title: "Next steps for {{CompanyName}}",
      body:
        "Hi {{ContactName}},<br><br>Following up on our conversation, I put together a simple next-step path for <strong>{{CompanyName}}</strong>. If useful, I can share the plan by <strong>{{FollowupDate}}</strong> and walk through it with your team.",
      cta: "Review next steps",
      footer: "Sent by {{AgentName}}",
    }),
  },
  {
    name: "Post-demo Follow-up",
    category: "Follow-up",
    subject: "Demo recap for {{CompanyName}}",
    status: "Active",
    source: "Seed",
    variables: ["ContactName", "CompanyName", "AgentName", "ProductName"],
    plain_text_body:
      "Hi {{ContactName}}, thanks for joining the demo. Based on what we discussed, {{ProductName}} looks aligned with {{CompanyName}}'s workflow needs.",
    html_body: starterShell({
      eyebrow: "Demo recap",
      title: "What stood out from the demo",
      body:
        "Hi {{ContactName}},<br><br>Thanks for joining the demo. Based on the workflow gaps we discussed, <strong>{{ProductName}}</strong> looks aligned with how <strong>{{CompanyName}}</strong> wants to manage lead visibility and follow-up accountability.",
      cta: "Schedule implementation review",
      footer: "{{AgentName}} - CRM Team",
    }),
  },
  {
    name: "Proposal Follow-up",
    category: "Proposal",
    subject: "Proposal details for {{CompanyName}}",
    status: "Active",
    source: "Seed",
    variables: ["ContactName", "CompanyName", "EstimatedValue", "AgentName"],
    plain_text_body:
      "Hi {{ContactName}}, checking in on the proposal for {{CompanyName}}. The estimated scope is {{EstimatedValue}} and I am available to clarify details.",
    html_body: starterShell({
      eyebrow: "Proposal",
      title: "Proposal follow-up for {{CompanyName}}",
      body:
        "Hi {{ContactName}},<br><br>I wanted to check in on the proposal for <strong>{{CompanyName}}</strong>. The estimated scope is <strong>{{EstimatedValue}}</strong>, and I am available to clarify commercial details, implementation timing, or stakeholder questions.",
      cta: "Discuss the proposal",
      footer: "Prepared by {{AgentName}}",
    }),
  },
  {
    name: "No-response Re-engagement",
    category: "Reminder",
    subject: "Should I close the loop?",
    status: "Active",
    source: "Seed",
    variables: ["ContactName", "CompanyName", "AgentName"],
    plain_text_body:
      "Hi {{ContactName}}, I know priorities shift. Should I close the loop for now, or would it still be useful to revisit this for {{CompanyName}}?",
    html_body: starterShell({
      eyebrow: "Quick check",
      title: "Should I close the loop?",
      body:
        "Hi {{ContactName}},<br><br>I know priorities shift. Should I close the loop for now, or would it still be useful to revisit this for <strong>{{CompanyName}}</strong> when timing is better?",
      cta: "Reply with best timing",
      footer: "{{AgentName}}",
    }),
  },
  {
    name: "Customer Onboarding",
    category: "Onboarding",
    subject: "Welcome to the next step, {{CompanyName}}",
    status: "Active",
    source: "Seed",
    variables: ["ContactName", "CompanyName", "AgentName", "ProductName"],
    plain_text_body:
      "Hi {{ContactName}}, welcome aboard. We are ready to help {{CompanyName}} get started with {{ProductName}}.",
    html_body: starterShell({
      eyebrow: "Onboarding",
      title: "Welcome, {{CompanyName}}",
      body:
        "Hi {{ContactName}},<br><br>Welcome aboard. We are ready to help <strong>{{CompanyName}}</strong> get started with <strong>{{ProductName}}</strong>. The next step is a short onboarding review so expectations, ownership, and timelines are clear.",
      cta: "Start onboarding",
      footer: "Your point of contact: {{AgentName}}",
    }),
  },
];

function starterShell({ eyebrow, title, body, cta, footer }) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e5e7eb;margin:0;padding:0;">
  <tr>
    <td align="center" style="padding:28px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #dbe3ef;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:#0f172a;padding:24px 28px;">
            <div style="font-size:12px;line-height:16px;color:#93c5fd;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">${eyebrow}</div>
            <h1 style="margin:8px 0 0;font-size:26px;line-height:32px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">${title}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;color:#334155;font-size:15px;line-height:24px;font-family:Arial,Helvetica,sans-serif;">
            ${body}
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:24px;">
              <tr>
                <td style="background:#2563eb;border-radius:6px;">
                  <a href="#" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">${cta}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:18px;font-family:Arial,Helvetica,sans-serif;">
            ${footer}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}
