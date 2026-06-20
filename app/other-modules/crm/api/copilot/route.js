import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { message } = await request.json();
    
    // Validate request
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    
    // Check if API key exists
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Google Gemini API Key (`GEMINI_API_KEY`) is missing from environment variables. Please add it to your .env.local file.',
        missingKey: true
      }, { status: 500 });
    }

    // Call the Gemini API via fetch (Google Generative AI REST endpoint for gemini-1.5-pro or similar)
    // You can also use the '@google/generative-ai' npm package, but using a direct fetch keeps dependencies low.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`;
    
    const context = `You are a CRM AI Pipeline Copilot. 
Your goal is to provide insightful answers about leads, customers, pipelines, and revenue.
You have access to a mock backend of sales data. 
Be concise, incredibly smart, and helpful. Format your responses primarily as clean text without excessive markdown unless specifically formatting a list or table.`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${context}\n\nUser Message: ${message}` }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Gemini API Error');
    }
    
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    return NextResponse.json({ reply: replyText });
  } catch (error) {
    console.error('Copilot Error:', error);
    return NextResponse.json({ 
      error: error.message || 'An error occurred while generating a response.'
    }, { status: 500 });
  }
}
