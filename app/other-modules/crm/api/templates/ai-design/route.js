import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  normalizeVariables,
  sanitizeEmailHtml,
  TEMPLATE_CATEGORIES,
} from "../../../utils/emailTemplates";

const MODEL = process.env.OPENAI_TEMPLATE_MODEL || "gpt-4.1-mini";

const EMAIL_TEMPLATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    category: { type: "string", enum: TEMPLATE_CATEGORIES },
    subject: { type: "string" },
    preheader: { type: "string" },
    html: { type: "string" },
    plainText: { type: "string" },
    variables: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["name", "category", "subject", "preheader", "html", "plainText", "variables"],
};

export async function POST(request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing from environment variables.", missingKey: true },
        { status: 500 }
      );
    }

    const { prompt, tone = "Professional", category = "Follow-up" } = await request.json();
    const userPrompt = String(prompt || "").trim();
    if (!userPrompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey });
    const response = await openai.responses.create({
      model: MODEL,
      input: [
        {
          role: "system",
          content: [
            "You design polished, production-ready CRM email templates.",
            "Return one complete email template as structured JSON only.",
            "The HTML must be email-client friendly: table layout, inline CSS, no scripts, no forms, no external CSS, no remote tracking pixels.",
            "Use a professional CRM tone and include useful personalization variables only when relevant.",
            "Use these variable names exactly when needed: ContactName, CompanyName, AgentName, ProductName, EstimatedValue, FollowupDate.",
            "The template should look premium but restrained, with readable typography, a clear hierarchy, and one clear CTA.",
          ].join(" "),
        },
        {
          role: "user",
          content: `Category: ${category}\nTone: ${tone}\nRequest: ${userPrompt}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "crm_email_template",
          strict: true,
          schema: EMAIL_TEMPLATE_SCHEMA,
        },
      },
    });

    const rawText = response.output_text || "";
    const parsed = JSON.parse(rawText);
    const template = {
      name: String(parsed.name || "AI Generated Template").trim(),
      category: TEMPLATE_CATEGORIES.includes(parsed.category) ? parsed.category : category,
      subject: String(parsed.subject || "").trim(),
      preheader: String(parsed.preheader || "").trim(),
      html_body: sanitizeEmailHtml(parsed.html),
      plain_text_body: String(parsed.plainText || "").trim(),
      variables: normalizeVariables(parsed.variables),
      status: "Draft",
      source: "AI",
    };

    if (!template.subject || !template.html_body) {
      return NextResponse.json(
        { error: "AI response did not include a usable subject and HTML body." },
        { status: 502 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to generate template." },
      { status: 500 }
    );
  }
}
