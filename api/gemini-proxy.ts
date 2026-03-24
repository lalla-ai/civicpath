import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Use server-side key (no VITE_ prefix — never exposed to browser)
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });

  const { prompt, messages, systemContext, useSearch } = req.body || {};
  if (!prompt && !messages) return res.status(400).json({ error: 'prompt or messages required' });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    // Enable Google Search grounding when requested (e.g. MyLalla live search)
    const modelConfig: any = { model: 'gemini-2.0-flash' };
    if (useSearch) {
      modelConfig.tools = [{ googleSearch: {} }];
    }
    const model = genAI.getGenerativeModel(modelConfig);

    if (messages && Array.isArray(messages) && messages.length > 0) {
      // Multi-turn chat
      const history = messages.slice(0, -1).map((m: any) => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.content }],
      }));
      const chat = model.startChat({ history, systemInstruction: systemContext });
      const last = messages[messages.length - 1];
      const result = await chat.sendMessage(last.content);
      return res.status(200).json({ text: result.response.text() });
    } else {
      // Single prompt
      const result = await model.generateContent(prompt);
      return res.status(200).json({ text: result.response.text() });
    }
  } catch (err: any) {
    console.error('Gemini proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
