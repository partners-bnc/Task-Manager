import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  normalizeVariables,
  sanitizeEmailHtml,
  TEMPLATE_CATEGORIES,
} from "../../../utils/emailTemplates";

const MODEL = process.env.GROQ_TEMPLATE_MODEL || "llama-3.3-70b-versatile";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

const TEMPLATE_CONTRACT = {
  name: "string",
  category: TEMPLATE_CATEGORIES,
  subject: "string",
  html: "email-client-safe HTML string",
  plainText: "plain-text fallback string",
  variables: ["ContactName", "CompanyName"],
};

export async function POST(request) {
  try {
    const apiKeys = getGroqApiKeys();
    if (!apiKeys.length) {
      return NextResponse.json(
        { error: "GROQ_API_KEY, GROQ_API_KEY_1, or GROQ_API_KEY_2 is missing from environment variables.", missingKey: true },
        { status: 500 }
      );
    }

    const { prompt, tone = "Professional", category = "Follow-up" } = await request.json();
    const userPrompt = String(prompt || "").trim();
    const safeCategory = TEMPLATE_CATEGORIES.includes(category) ? category : "Follow-up";
    if (!userPrompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const parsed = await generateWithGroqKeys(apiKeys, {
      prompt: userPrompt,
      tone,
      category: safeCategory,
    });

    const template = {
      name: String(parsed.name || "AI Generated Template").trim(),
      category: TEMPLATE_CATEGORIES.includes(parsed.category) ? parsed.category : safeCategory,
      subject: String(parsed.subject || "").trim(),
      html_body: sanitizeEmailHtml(parsed.html),
      plain_text_body: String(parsed.plainText || "").trim(),
      variables: normalizeVariables(parsed.variables),
      status: "Draft",
      source: "AI",
    };

    if (!template.subject || !template.html_body || !template.plain_text_body) {
      return NextResponse.json(
        { error: "AI response did not include a usable subject, HTML body, and plain-text fallback." },
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

function getGroqApiKeys() {
  return [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_1, process.env.GROQ_API_KEY_2]
    .map((key) => String(key || "").trim())
    .filter(Boolean);
}

async function generateWithGroqKeys(apiKeys, request) {
  let lastError = null;

  for (const apiKey of apiKeys) {
    try {
      const client = new OpenAI({ apiKey, baseURL: GROQ_BASE_URL });
      const completion = await client.chat.completions.create({
        model: MODEL,
        temperature: 0.45,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You design polished, production-ready CRM email templates.",
              "The email must always be written in a professional tone and styled using a cohesive, premium blue color tone (e.g., matching corporate blue colors for headers, buttons, CTA, and accent styling).",
              "Return exactly one JSON object and no markdown.",
              "The JSON object must match this shape:",
              JSON.stringify(TEMPLATE_CONTRACT),
              "The HTML must be email-client friendly: table layout, inline CSS, no scripts, no forms, no external CSS, no remote tracking pixels.",
              "The plainText value must be a complete fallback version of the email, not a summary.",
              "Use these variable names exactly when needed: ContactName, CompanyName, AgentName, ProductName, EstimatedValue, FollowupDate.",
              "The template should look premium but restrained, with readable typography, clear hierarchy, and one clear CTA.",
            ].join(" "),
          },
          {
            role: "user",
            content: `Category: ${request.category}
Tone: ${request.tone}
Request: ${request.prompt}`,
          },
        ],
      });

      return parseTemplateJson(completion.choices?.[0]?.message?.content || "");
    } catch (error) {
      lastError = error;
      if (!shouldTryNextKey(error)) break;
    }
  }

  throw new Error(normalizeGroqError(lastError));
}

function shouldTryNextKey(error) {
  const status = Number(error?.status || error?.code || 0);
  return status === 0 || status === 401 || status === 403 || status === 408 || status === 429 || status >= 500;
}

function normalizeGroqError(error) {
  if (!error) return "Groq template generation failed.";
  const status = error.status ? `Groq returned ${error.status}. ` : "";
  return `${status}${error.message || "Groq template generation failed."}`.trim();
}

function parseTemplateJson(rawText) {
  const cleaned = String(rawText || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  if (!cleaned) {
    throw new Error("Groq returned an empty template response.");
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw new Error("Groq response was not valid template JSON.");
  }
}
