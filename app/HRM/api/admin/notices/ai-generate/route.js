import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { resolveAuthenticatedUserContext } from '@/utils/auth/context';

const MODEL = process.env.GROQ_TEMPLATE_MODEL || 'llama-3.3-70b-versatile';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

const NOTICE_CONTRACT = {
  title: 'string (short, engaging notice title)',
  content: 'string (body content of the notice. Can be plain text with line breaks or rich HTML depending on content_format)',
  content_format: 'text or html',
  bg_color: 'string (hex color for the card background, e.g., "#ffffff" or a clean corporate dark color like "#0f172a" or a soft color)',
  text_color: 'string (hex color for the text, must contrast clearly with bg_color, e.g., "#1e293b" or "#f8fafc")',
  primary_color: 'string (hex color for the primary action button, e.g., "#4f46e5" or "#0ea5e9")',
  border_color: 'string (hex color for the card border, e.g., "#e2e8f0" or "#334155")',
  title_size: 'string (font size for title, e.g. "20px", "24px", "28px" or "32px")',
  content_size: 'string (font size for content, e.g. "14px", "16px", "18px" or "20px")',
  content_bold: 'boolean (true if the main text should be bolded, otherwise false)',
};

export async function POST(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authContext = await resolveAuthenticatedUserContext(supabase, user);
    if (!authContext?.isHrAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const apiKeys = getGroqApiKeys();
    if (!apiKeys.length) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY, GROQ_API_KEY_1, or GROQ_API_KEY_2 is missing from environment variables.' },
        { status: 500 }
      );
    }

    const { prompt } = await request.json();
    const userPrompt = String(prompt || '').trim();
    if (!userPrompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    const parsed = await generateWithGroqKeys(apiKeys, userPrompt);

    return NextResponse.json({ success: true, notice: parsed });
  } catch (error) {
    console.error('Error in notice AI generator:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate notice' }, { status: 500 });
  }
}

function getGroqApiKeys() {
  return [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_1, process.env.GROQ_API_KEY_2]
    .map((key) => String(key || '').trim())
    .filter(Boolean);
}

async function generateWithGroqKeys(apiKeys, userPrompt) {
  let lastError = null;

  for (const apiKey of apiKeys) {
    try {
      const client = new OpenAI({ apiKey, baseURL: GROQ_BASE_URL });
      const completion = await client.chat.completions.create({
        model: MODEL,
        temperature: 0.5,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              'You are a professional HR communication assistant. You design announcements and notices for company staff.',
              'Your job is to write clear notice content AND select a matching premium color theme for the display card.',
              'Determine if the content should be simple text ("content_format": "text") or formatted HTML ("content_format": "html"). If HTML, format the content nicely using paragraphs <p> and bold tags <strong>, but do not use complex HTML grids, style blocks, or external links.',
              'Ensure selected colors have high readability contrast (text_color must stand out clearly against bg_color).',
              'Select custom size values: title_size (between "20px" and "32px") and content_size (between "14px" and "20px"). Determine if content_bold should be true.',
              'Return exactly one JSON object matching this schema:',
              JSON.stringify(NOTICE_CONTRACT),
            ].join(' '),
          },
          {
            role: 'user',
            content: `Create a notice for: ${userPrompt}`,
          },
        ],
      });

      const responseText = completion.choices?.[0]?.message?.content || '';
      return parseNoticeJson(responseText);
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
  if (!error) return 'Groq notice generation failed.';
  const status = error.status ? `Groq returned ${error.status}. ` : '';
  return `${status}${error.message || 'Groq notice generation failed.'}`.trim();
}

function parseNoticeJson(rawText) {
  const cleaned = String(rawText || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  if (!cleaned) {
    throw new Error('Groq returned an empty notice response.');
  }

  try {
    const parsed = JSON.parse(cleaned);
    // Sanitize keys and format
    return {
      title: String(parsed.title || 'Announcement').trim(),
      content: String(parsed.content || '').trim(),
      content_format: parsed.content_format === 'html' ? 'html' : 'text',
      bg_color: String(parsed.bg_color || '#ffffff').trim(),
      text_color: String(parsed.text_color || '#0f172a').trim(),
      primary_color: String(parsed.primary_color || '#4f46e5').trim(),
      border_color: String(parsed.border_color || '#e2e8f0').trim(),
      title_size: String(parsed.title_size || '24px').trim(),
      content_size: String(parsed.content_size || '16px').trim(),
      content_bold: Boolean(parsed.content_bold),
    };
  } catch (err) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      return {
        title: String(parsed.title || 'Announcement').trim(),
        content: String(parsed.content || '').trim(),
        content_format: parsed.content_format === 'html' ? 'html' : 'text',
        bg_color: String(parsed.bg_color || '#ffffff').trim(),
        text_color: String(parsed.text_color || '#0f172a').trim(),
        primary_color: String(parsed.primary_color || '#4f46e5').trim(),
        border_color: String(parsed.border_color || '#e2e8f0').trim(),
        title_size: String(parsed.title_size || '24px').trim(),
        content_size: String(parsed.content_size || '16px').trim(),
        content_bold: Boolean(parsed.content_bold),
      };
    }
    throw new Error('Groq response was not valid notice JSON.');
  }
}
