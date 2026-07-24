import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const MODEL = process.env.GROQ_TEMPLATE_MODEL || 'llama-3.3-70b-versatile';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

// In-memory cache for the daily message
let dailyCache = {
  dateKey: null,
  motivation: null,
};

function getGroqApiKeys() {
  return [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_1, process.env.GROQ_API_KEY_2]
    .map((key) => String(key || '').trim())
    .filter(Boolean);
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Serve from cache if valid
    if (dailyCache.dateKey === todayStr && dailyCache.motivation) {
      return NextResponse.json(dailyCache.motivation);
    }

    const apiKeys = getGroqApiKeys();
    if (!apiKeys.length) {
      return NextResponse.json({
        title: 'Progress Matters',
        body: 'Consistent effort always creates momentum.',
      });
    }

    let motivationData = null;

    const prompt = `Generate a single short, highly inspiring and professional daily motivational message for company employees. The message should focus on teamwork, progress, learning, or dedication.
The response MUST be a valid JSON object containing exactly two keys:
1. "title": A short, punchy title (2-3 words, e.g. "Embrace The Journey", "Stay Curious")
2. "body": A short motivational message/mantra that is EXACTLY 5 to 7 words long (no more, no less, e.g. "Consistency is key to success." or "Focus on progress, not perfection.")

Do not include any extra text or conversational filler, return only the JSON object.`;

    for (const apiKey of apiKeys) {
      try {
        const client = new OpenAI({ apiKey, baseURL: GROQ_BASE_URL });
        const completion = await client.chat.completions.create({
          model: MODEL,
          temperature: 0.8,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'You are a professional team coach and HR motivational guide. You write punchy, brief employee mantras.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const text = completion.choices[0]?.message?.content;
        motivationData = JSON.parse(text);
        if (motivationData && motivationData.title && motivationData.body) {
          break;
        }
      } catch (err) {
        console.error('Failed to generate motivation with key:', err);
      }
    }

    if (motivationData) {
      dailyCache.dateKey = todayStr;
      dailyCache.motivation = motivationData;
      return NextResponse.json(motivationData);
    }

    return NextResponse.json({
      title: 'Progress Matters',
      body: 'Consistent effort always creates momentum.',
    });
  } catch (error) {
    console.error('Error in daily-motivation endpoint:', error);
    return NextResponse.json({
      title: 'Progress Matters',
      body: 'Consistent effort always creates momentum.',
    });
  }
}
