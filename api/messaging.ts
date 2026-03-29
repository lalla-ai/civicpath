/**
 * messaging.ts — CivicPath GrantClaw Bot
 *
 * Handles incoming messages from Telegram and WhatsApp (Twilio).
 * Acts as a GrantClaw AI employee: users send a natural-language message
 * and the bot executes multi-step work (grant search, proposal draft)
 * then returns finished results.
 *
 * Telegram setup:
 *   1. Create bot via @BotFather → get TELEGRAM_BOT_TOKEN
 *   2. Register webhook: POST https://api.telegram.org/bot{TOKEN}/setWebhook
 *      with { url: "https://civicpath.ai/api/messaging" }
 *
 * WhatsApp setup (Twilio):
 *   1. Create Twilio account → Messaging → WhatsApp Sandbox
 *   2. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER
 *   3. Set Sandbox webhook to: https://civicpath.ai/api/messaging
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rateLimit, getClientIp } from './rateLimiter.js';
import { GEMINI_MODEL, getGeminiKey } from './_config.js';

// ── Intent Classification ─────────────────────────────────────────────────────

type Intent = 'search' | 'draft' | 'help' | 'status' | 'loi';

function classifyIntent(text: string): { type: Intent; query: string } {
  const t = text.trim();
  if (/^\/(start|help|menu)$/i.test(t) || /^(help|what can you do|commands)/i.test(t)) {
    return { type: 'help', query: '' };
  }
  if (/\b(loi|letter of intent|pre-application)\b/i.test(t)) {
    return { type: 'loi', query: t };
  }
  if (/\b(draft|write|generate|create).*(proposal|application|grant writing)\b/i.test(t)) {
    return { type: 'draft', query: t };
  }
  if (/\b(status|pipeline|progress|my grants?)\b/i.test(t)) {
    return { type: 'status', query: '' };
  }
  // Default: treat everything as a grant search (the most common intent)
  return { type: 'search', query: t };
}

// ── Grant Search ───────────────────────────────────────────────────────────────

async function searchGrants(query: string): Promise<string> {
  const siteUrl = (process.env.SITE_URL || 'https://civicpath.ai').replace(/\/$/, '');

  // Extract location hint from query ("in Florida", "for NYC", etc.)
  const locMatch = query.match(/\bin\s+([A-Za-z\s]+?)(?:\s*$|\s+for\b)/i);
  const location = locMatch ? locMatch[1].trim() : 'United States';

  // Extract keyword (strip location/stopwords)
  const keyword = query
    .replace(/find me|find|search for|best|top|today|latest|grants? for|grants? in|in [a-z ]+$/gi, '')
    .trim()
    .slice(0, 100) || 'technology';

  try {
    const r = await fetch(`${siteUrl}/api/grants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, location, rows: 5 }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    const grants = (data.grants || []).slice(0, 5);

    if (!grants.length) {
      return `No grants found for "${keyword}". Try a different keyword — e.g. "AI nonprofit", "health equity", "SBIR Phase I".`;
    }

    const lines = [`🔍 *Top ${grants.length} Grants — "${keyword}"*\n`];
    grants.forEach((g: any, i: number) => {
      lines.push(
        `*${i + 1}. ${g.title}*`,
        `   🏛 ${g.agency}`,
        `   💰 ${g.amount || 'Amount TBD'}`,
        `   📅 Deadline: ${g.closeDate || 'Rolling'}`,
        `   🔗 ${g.url}`,
        '',
      );
    });
    lines.push(`_Reply "draft proposal for [grant name]" or visit civicpath.ai for the full 8-agent pipeline._`);
    return lines.join('\n');
  } catch {
    return `⚠️ Grant search offline. Try again in a moment, or visit civicpath.ai to run the full pipeline.`;
  }
}

// ── Proposal Draft ─────────────────────────────────────────────────────────────

async function draftProposal(query: string): Promise<string> {
  const apiKey = getGeminiKey();
  if (!apiKey) return `⚠️ AI drafting is not configured on this server.`;

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `You are a professional grant writer. Write a compelling 3-paragraph Executive Summary for a grant proposal based on this request: "${query.slice(0, 400)}".

Rules: Be specific. No placeholders. Use professional language. Focus on impact, mission, and ROI for the funder. Maximum 300 words.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().slice(0, 1400);

    return `✍️ *Draft Executive Summary*\n\n${text}\n\n_Visit civicpath.ai to run the full 8-agent pipeline: match → draft → compliance → submit._`;
  } catch (err: any) {
    return `⚠️ Drafting unavailable: ${err.message}. Try again in a moment.`;
  }
}

// ── LOI Generator ──────────────────────────────────────────────────────────────

async function generateLOI(query: string): Promise<string> {
  const apiKey = getGeminiKey();
  if (!apiKey) return `⚠️ AI is not configured on this server.`;

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `Write a brief Letter of Intent (LOI) for a grant application based on: "${query.slice(0, 400)}".

Format: 2 paragraphs. Paragraph 1: who we are + the problem we solve. Paragraph 2: what funding we're requesting + projected impact.
Style: Professional, concise, funder-focused. Maximum 200 words. No placeholders.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().slice(0, 1200);

    return `📋 *Letter of Intent Draft*\n\n${text}\n\n_Visit civicpath.ai to generate a full proposal with the 8-agent pipeline._`;
  } catch {
    return `⚠️ LOI generation unavailable. Try again in a moment.`;
  }
}

// ── Help Message ───────────────────────────────────────────────────────────────

const HELP_TEXT = `🤖 *CivicPath GrantClaw*
_Your AI grant-hunting employee_

I find grants, draft proposals, and generate LOIs — just tell me what you need.

*🔍 Find Grants:*
"find me AI startup grants in Florida"
"best NSF grants today"
"search education technology grants"
"top 5 health equity grants"

*✍️ Draft Proposal:*
"draft proposal for SBIR Phase I AI"
"write grant proposal for community nonprofit"

*📋 Letter of Intent:*
"write LOI for NSF SBIR AI healthcare startup"

*📊 Status:* "pipeline status"

💡 For the full pipeline (match → draft → compliance → submit), visit *civicpath.ai*`;

// ── Telegram Sender ────────────────────────────────────────────────────────────

async function sendTelegram(chatId: number | string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) { console.warn('[Telegram] TELEGRAM_BOT_TOKEN not set'); return; }

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    }),
  }).catch(err => console.error('[Telegram] Send failed:', err.message));
}

// ── WhatsApp Sender (Twilio) ───────────────────────────────────────────────────

async function sendWhatsApp(to: string, text: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
  if (!sid || !authToken) { console.warn('[WhatsApp] Twilio credentials not set'); return; }

  const body = new URLSearchParams({
    From: from,
    To: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
    Body: text.replace(/\*/g, '').replace(/_/g, ''),
  });

  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${sid}:${authToken}`).toString('base64')}`,
    },
    body: body.toString(),
  }).catch(err => console.error('[WhatsApp] Send failed:', err.message));
}

// ── Shared Message Processor ───────────────────────────────────────────────────

async function processMessage(text: string): Promise<string> {
  const { type, query } = classifyIntent(text);
  switch (type) {
    case 'help':
    case 'status':
      return HELP_TEXT;
    case 'search':
      return searchGrants(query);
    case 'draft':
      return draftProposal(query);
    case 'loi':
      return generateLOI(query);
    default:
      return HELP_TEXT;
  }
}

// ── Main Handler ───────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: health check + Telegram webhook verification
  if (req.method === 'GET') {
    const challenge = req.query['hub.challenge'];
    if (challenge) return res.status(200).send(String(challenge));
    return res.status(200).json({
      ok: true,
      service: 'CivicPath GrantClaw Bot',
      platforms: ['telegram', 'whatsapp'],
      telegram: !!process.env.TELEGRAM_BOT_TOKEN,
      whatsapp: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req.headers as any);
  if (!rateLimit(`msg:${ip}`, 20)) return res.status(429).json({ error: 'Too many requests' });

  const body = req.body || {};

  // ── Telegram ──────────────────────────────────────────────────────────────
  if (body?.message?.chat?.id !== undefined) {
    const chatId = body.message.chat.id;
    const text = (body.message.text || '').trim();

    if (!text) return res.status(200).json({ ok: true });

    // Immediate 200 to Telegram (avoid retry), process async
    res.status(200).json({ ok: true });

    const reply = await processMessage(text);
    await sendTelegram(chatId, reply);
    return;
  }

  // ── WhatsApp via Twilio ───────────────────────────────────────────────────
  if (body?.Body !== undefined && body?.From !== undefined) {
    const from = body.From as string;
    const text = (body.Body || '').trim();

    if (!text) return res.status(200).send('<Response></Response>');

    res.status(200).send('<Response></Response>');

    const reply = await processMessage(text);
    await sendWhatsApp(from, reply);
    return;
  }

  return res.status(400).json({ error: 'Unrecognized messaging platform format' });
}
