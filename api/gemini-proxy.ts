import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { rateLimit, getClientIp } from './rateLimiter.js';

function extractAnthropicText(data: any): string {
  return (data?.content || [])
    .filter((item: any) => item?.type === 'text')
    .map((item: any) => item.text)
    .join('\n')
    .trim();
}

function toPlainPrompt(prompt: unknown, messages: unknown): string {
  if (typeof prompt === 'string' && prompt.trim()) return prompt;
  if (Array.isArray(messages) && messages.length > 0) {
    return messages.map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content || ''}`).join('\n');
  }
  return '';
}

function toChatMessages(prompt: unknown, messages: unknown) {
  if (Array.isArray(messages) && messages.length > 0) {
    return messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || ''),
    }));
  }
  return [{ role: 'user' as const, content: String(prompt || '') }];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: 20 requests per minute per IP
  const ip = getClientIp(req.headers as any);
  if (!rateLimit(`gemini:${ip}`, 20)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
  }


  const { prompt, messages, systemContext, useSearch, useNIM, nimModel } = req.body || {};
  if (!prompt && !messages) return res.status(400).json({ error: 'prompt or messages required' });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  const nimApiKey = process.env.NVIDIA_API_KEY;
  const plainPrompt = toPlainPrompt(prompt, messages);
  const chatMessages = toChatMessages(prompt, messages);

  if (!anthropicKey && !groqKey && !nimApiKey && !geminiKey) {
    return res.status(500).json({ error: 'No inference API configured on server' });
  }

  if (anthropicKey) {
    try {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
          max_tokens: 2048,
          system: systemContext || undefined,
          messages: chatMessages,
        }),
      });
      const anthropicData = await anthropicRes.json();
      const anthropicText = extractAnthropicText(anthropicData);
      if (anthropicRes.ok && anthropicText) {
        return res.status(200).json({
          text: anthropicText,
          provider: 'anthropic-claude',
          model: anthropicData.model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
        });
      }
      console.warn('[Claude] Response missing content, falling back:', JSON.stringify(anthropicData).slice(0, 200));
    } catch (anthropicErr: any) {
      console.warn('[Claude] Call failed, falling back:', anthropicErr.message);
    }
  }

  if (groqKey) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          messages: [
            ...(systemContext ? [{ role: 'system', content: systemContext }] : []),
            ...chatMessages,
          ],
          temperature: 0.6,
          max_tokens: 2048,
          stream: false,
        }),
      });
      const groqData = await groqRes.json();
      const groqText = groqData?.choices?.[0]?.message?.content?.trim();
      if (groqRes.ok && groqText) {
        return res.status(200).json({
          text: groqText,
          provider: 'groq',
          model: groqData.model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        });
      }
      console.warn('[Groq] Response missing content, falling back:', JSON.stringify(groqData).slice(0, 200));
    } catch (groqErr: any) {
      console.warn('[Groq] Call failed, falling back:', groqErr.message);
    }
  }

  // ── NVIDIA NIM slot ──────────────────────────────────────────────────────────────────────
  // Activation: Set NVIDIA_API_KEY in Vercel env vars.
  // When present + useNIM=true, routes inference through NVIDIA NIM GPU microservice.
  // FIG.1 [108] Neural Inference Microservice: GPU-Accelerated · Inside TEE
  if (useNIM && nimApiKey && plainPrompt) {
    try {
      // Nemotron-3-Super-120B: Hybrid MoE, 1M context window, superior reasoning
      // Tier routing: use Nemotron for research/complex tasks, Llama for fast pipeline
      const isResearchMode = useNIM && (prompt.length > 500 || systemContext);
      const model = nimModel
        || (isResearchMode
          ? (process.env.NVIDIA_NIM_MODEL || 'nvidia/nemotron-3-super-120b-instruct')
          : 'meta/llama-3.1-8b-instruct');

      const nimMessages = [
        {
          role: 'system' as const,
          content: systemContext || 'You are MyLalla, a world-class AI grant advisor. You have deep expertise in federal and state grant programs, SBIR/STTR, nonprofit funding, and compliance. Provide specific, actionable, data-driven guidance. Use markdown for clarity.',
        },
        { role: 'user' as const, content: plainPrompt },
      ];

      const nimRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${nimApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: nimMessages,
          max_tokens: 8192,  // leverage expanded context
          temperature: 0.6,
          top_p: 0.95,
          stream: false,
        }),
      });
      const nimData = await nimRes.json();
      if (nimData.choices?.[0]?.message?.content) {
        return res.status(200).json({
          text: nimData.choices[0].message.content,
          provider: 'nvidia-nim',
          nimModel: model,
        });
      }
      // NIM returned error — fall through to Gemini
      console.warn('[NIM] Response missing content, falling back to Gemini:', JSON.stringify(nimData).slice(0, 200));
    } catch (nimErr: any) {
      console.warn('[NIM] Call failed, falling back to Gemini:', nimErr.message);
    }
  }

  try {
    if (!geminiKey) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY / GROQ_API_KEY failed and GEMINI_API_KEY is not configured' });
    }

    const genAI = new GoogleGenerativeAI(geminiKey);

    // Enable Google Search grounding when requested (e.g. MyLalla live search)
    const modelConfig: any = { model: GEMINI_MODEL };
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
    return res.status(200).json({ text: result.response.text(), provider: 'gemini-fallback' });
    } else {
      // Single prompt
      const result = await model.generateContent(prompt);
      return res.status(200).json({ text: result.response.text(), provider: 'gemini-fallback' });
    }
  } catch (err: any) {
    console.error('Gemini proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
