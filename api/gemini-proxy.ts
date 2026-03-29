import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { rateLimit, getClientIp } from './rateLimiter.js';
import { GEMINI_MODEL, getGeminiKey } from './_config.js';

const FREE_MONTHLY_LIMIT = 50; // ~10 full pipeline runs

/**
 * Verify the Firebase ID token and enforce the free-tier call limit.
 * Returns { allowed: true } on success or when plan check can't run.
 * Returns { allowed: false, reason } when the limit is exceeded.
 * Never throws — always fails open so a misconfigured Admin SDK never blocks users.
 */
async function checkUsage(authHeader: string | undefined): Promise<{ allowed: boolean; reason?: string; upgradeRequired?: boolean }> {
  if (!authHeader?.startsWith('Bearer ')) return { allowed: true };
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!sa) return { allowed: true }; // Admin SDK not configured — skip check

  try {
    const [{ initializeApp, getApps, cert }, { getFirestore }, { getAuth }] = await Promise.all([
      import('firebase-admin/app'),
      import('firebase-admin/firestore'),
      import('firebase-admin/auth'),
    ]);
    if (getApps().length === 0) initializeApp({ credential: cert(JSON.parse(sa)) });

    const token = authHeader.slice(7);
    const decoded = await getAuth().verifyIdToken(token);
    const db = getFirestore();
    const userRef = db.doc(`users/${decoded.uid}`);
    const monthKey = new Date().toISOString().slice(0, 7).replace('-', '_');
    const field = `aiCalls_${monthKey}`;

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const data = snap.data() || {};
      if ((data.plan || 'free') !== 'free') return { allowed: true }; // Pro = unlimited
      const count: number = data[field] || 0;
      if (count >= FREE_MONTHLY_LIMIT) {
        return {
          allowed: false,
          reason: `Free plan limit reached (${FREE_MONTHLY_LIMIT} AI requests/month). Upgrade to Pro for unlimited access.`,
          upgradeRequired: true,
        };
      }
      tx.set(userRef, { [field]: count + 1 }, { merge: true });
      return { allowed: true };
    });
    return result;
  } catch (err: any) {
    console.warn('[Plan] Usage check failed — allowing:', err.message);
    return { allowed: true }; // Always fail open
  }
}

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


  const { prompt: rawPrompt, messages: rawMessages, systemContext, useSearch, useNIM, nimModel } = req.body || {};
  if (!rawPrompt && !rawMessages) return res.status(400).json({ error: 'prompt or messages required' });

  // Input length caps
  const MAX_PROMPT = 8_000;
  const MAX_MSG = 2_000;
  const prompt = typeof rawPrompt === 'string' ? rawPrompt.slice(0, MAX_PROMPT) : rawPrompt;
  const messages = Array.isArray(rawMessages)
    ? rawMessages.map((m: any) => ({ ...m, content: String(m.content || '').slice(0, MAX_MSG) }))
    : rawMessages;

  // Server-side plan enforcement
  const usage = await checkUsage(req.headers['authorization'] as string | undefined);
  if (!usage.allowed) {
    return res.status(402).json({ error: usage.reason, upgradeRequired: usage.upgradeRequired });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = getGeminiKey();
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
    if (expectJson) {
      modelConfig.generationConfig = { responseMimeType: "application/json" };
    }
    const model = genAI.getGenerativeModel(modelConfig);

    if (messages && Array.isArray(messages) && messages.length > 0) {
      // Multi-turn chat
      const history = messages.slice(0, -1).map((m: any) => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.content }],
      }));
      const chat = model.startChat({ history, systemInstruction: enhancedSystemContext });
      const last = messages[messages.length - 1];
      const result = await chat.sendMessage(last.content);
    return res.status(200).json({ text: result.response.text(), provider: 'gemini-fallback' });
    } else {
      // Single prompt
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        ...(enhancedSystemContext ? { systemInstruction: enhancedSystemContext } : {})
      });
      return res.status(200).json({ text: result.response.text(), provider: 'gemini-fallback' });
    }
  } catch (err: any) {
    console.error('Gemini proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
}
