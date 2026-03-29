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

// ── In-memory profile store keyed by chat_id / phone ─────────────────────────
// Persists across requests within the same Vercel function instance.
// Falls back gracefully when instance restarts.
interface BotProfile {
  org?: string;
  focus?: string;
  location?: string;
  updatedAt: number;
}
const profileStore = new Map<string, BotProfile>();

function getProfile(id: string): BotProfile | null {
  const p = profileStore.get(id);
  if (!p) return null;
  // Expire after 7 days
  if (Date.now() - p.updatedAt > 7 * 24 * 60 * 60 * 1000) { profileStore.delete(id); return null; }
  return p;
}

function setProfile(id: string, data: Partial<BotProfile>) {
  profileStore.set(id, { ...getProfile(id), ...data, updatedAt: Date.now() });
}

// ── Intent Classification ─────────────────────────────────────────────────────

type Intent = 'search' | 'draft' | 'help' | 'status' | 'loi' | 'setup' | 'myprofile';

function classifyIntent(text: string): { type: Intent; query: string } {
  const t = text.trim();
  if (/^\/(start|help|menu)$/i.test(t) || /^(help|what can you do|commands)/i.test(t)) {
    return { type: 'help', query: '' };
  }
  if (/^\/setup\b/i.test(t) || /^(my org is|i am|we are|setup:|configure:)/i.test(t)) {
    return { type: 'setup', query: t };
  }
  if (/^\/myprofile$/i.test(t) || /^(my profile|show my setup|what do you know)/i.test(t)) {
    return { type: 'myprofile', query: '' };
  }
  if (/^\/(grants|search)$/i.test(t)) {
    return { type: 'search', query: '' }; // use stored profile
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

// ── Profile Setup ─────────────────────────────────────────────────────────────

function handleSetup(senderId: string, text: string): string {
  // Formats: /setup Acme Corp | AI technology | Florida
  //          My org is Acme Corp, focus AI, in Florida
  const raw = text.replace(/^\/setup\s*/i, '').replace(/^(my org is|i am|we are|setup:|configure:)\s*/i, '');
  const parts = raw.split(/[|,]/).map(s => s.trim()).filter(Boolean);

  if (parts.length >= 2) {
    const p: Partial<BotProfile> = {};
    if (parts[0]) p.org = parts[0].slice(0, 80);
    if (parts[1]) p.focus = parts[1].slice(0, 80);
    if (parts[2]) p.location = parts[2].slice(0, 60);
    setProfile(senderId, p);
    const saved = getProfile(senderId)!;
    return `✅ *Profile saved!*\n\n🏢 *Org:* ${saved.org || '—'}\n🎯 *Focus:* ${saved.focus || '—'}\n📍 *Location:* ${saved.location || '—'}\n\nNow just say *\/grants* or *find me grants* and I'll search specifically for you.`;
  }

  return `To save your profile, send:\n\`/setup [Org Name] | [Focus Area] | [Location]\`\n\nExample:\n\`/setup Sunrise AI Nonprofit | AI technology | Miami, FL\``;
}

function showProfile(senderId: string): string {
  const p = getProfile(senderId);
  if (!p) return `No profile set. Send:\n\`/setup [Org Name] | [Focus Area] | [Location]\`\n\nExample:\n\`/setup Sunrise AI Nonprofit | AI technology | Florida\``;
  return `👤 *Your GrantClaw Profile*\n\n🏢 *Org:* ${p.org || '—'}\n🎯 *Focus:* ${p.focus || '—'}\n📍 *Location:* ${p.location || '—'}\n\nTo update: \`/setup [Org] | [Focus] | [Location]\``;
}

// ── Grant Search ───────────────────────────────────────────────────────────────

async function searchGrants(query: string, senderId?: string): Promise<string> {
  const siteUrl = (process.env.SITE_URL || 'https://civicpath.ai').replace(/\/$/, '');

  // Use stored profile if no explicit query
  const stored = senderId ? getProfile(senderId) : null;

  // Extract location hint from query ("in Florida", "for NYC", etc.)
  const locMatch = query.match(/\bin\s+([A-Za-z\s]+?)(?:\s*$|\s+for\b)/i);
  const location = locMatch ? locMatch[1].trim() : stored?.location || 'United States';

  // Extract keyword — fall back to stored focus area if query is vague
  const cleanedQuery = query
    .replace(/find me|find|search for|best|top|today|latest|grants? for|grants? in|in [a-z ]+$/gi, '')
    .trim();
  const keyword = (cleanedQuery || stored?.focus || 'technology').slice(0, 100);

  const profileContext = stored?.org ? ` for *${stored.org}*` : '';
  const searchLabel = cleanedQuery || stored?.focus || 'your focus area';

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

    const lines = [`🔍 *Top ${grants.length} Grants${profileContext} — "${searchLabel}"*\n`];
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
    if (stored?.org) {
      lines.push(`_Results personalized for ${stored.org}. Reply "draft proposal for [#]" to draft._`);
    } else {
      lines.push(`_Set your profile with /setup for personalized results. Reply "draft" to draft a proposal._`);
    }
    return lines.join('\n');
  } catch {
    return `⚠️ Grant search offline. Try again in a moment, or visit civicpath.ai to run the full pipeline.`;
  }
}

// ── Proposal Draft ─────────────────────────────────────────────────────────────

async function draftProposal(query: string, senderId?: string): Promise<string> {
  const apiKey = getGeminiKey();
  if (!apiKey) return `⚠️ AI drafting is not configured on this server.`;

  const stored = senderId ? getProfile(senderId) : null;
  const orgContext = stored
    ? `\nOrg: ${stored.org || 'the applicant'}, Focus: ${stored.focus || 'community impact'}, Location: ${stored.location || 'United States'}`
    : '';

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `You are a professional grant writer. Write a compelling 3-paragraph Executive Summary for a grant proposal.${orgContext}
Request: "${query.slice(0, 400)}"

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

I'm your personal grant expert. Set me up once and I'll find and draft grants specifically for your org.

*👤 Set Up Your Profile (do this first!):*
/setup \[Org Name\] | \[Focus Area\] | \[Location\]
_Example: /setup Sunrise AI | AI technology | Miami, FL_

*🔍 Find Grants:*
/grants — search with your saved profile
"find me AI startup grants in Florida"
"best NSF grants today"

*✍️ Draft Proposal:*
"draft proposal for SBIR Phase I AI"
"write grant proposal for community nonprofit"

*📋 Letter of Intent:*
"write LOI for NSF SBIR AI healthcare startup"

*👤 Your Profile:* /myprofile
*📊 Status:* /help

💡 For the full 8-agent pipeline (match → draft → compliance → submit), visit *civicpath.ai*`;

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

async function processMessage(text: string, senderId: string): Promise<string> {
  const { type, query } = classifyIntent(text);
  switch (type) {
    case 'help':
    case 'status':
      return HELP_TEXT;
    case 'setup':
      return handleSetup(senderId, text);
    case 'myprofile':
      return showProfile(senderId);
    case 'search':
      return searchGrants(query, senderId);
    case 'draft':
      return draftProposal(query, senderId);
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
    const senderId = `tg:${chatId}`;

    if (!text) return res.status(200).json({ ok: true });

    // Process BEFORE responding — Vercel kills execution after res.send().
    // Use Telegram's webhook response body feature: return sendMessage JSON
    // directly so Telegram sends it instantly without a second API call.
    const reply = await processMessage(text, senderId);

    return res.status(200).json({
      method: 'sendMessage',
      chat_id: chatId,
      text: reply,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    });
  }

  // ── WhatsApp via Twilio ───────────────────────────────────────────────────
  if (body?.Body !== undefined && body?.From !== undefined) {
    const from = body.From as string;
    const text = (body.Body || '').trim();
    const senderId = `wa:${from}`;

    if (!text) return res.status(200).send('<Response></Response>');

    // Process first, then send via Twilio API, then respond
    const reply = await processMessage(text, senderId);
    await sendWhatsApp(from, reply);
    return res.status(200).send('<Response></Response>');
  }

  return res.status(400).json({ error: 'Unrecognized messaging platform format' });
}
