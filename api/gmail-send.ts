/**
 * gmail-send.ts — Send email from user's Gmail via OAuth2
 *
 * Uses the refresh token stored in Firestore after Google OAuth consent.
 * Falls back gracefully if token not connected.
 *
 * POST /api/gmail-send
 * Body: { uid, to, subject, body, attachmentBase64?, attachmentName? }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rateLimit, getClientIp } from './rateLimiter.js';

async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

function buildRawEmail(from: string, to: string, subject: string, body: string, attachmentBase64?: string, attachmentName?: string): string {
  const boundary = `civicpath_${Date.now()}`;
  const hasAttachment = attachmentBase64 && attachmentName;

  if (!hasAttachment) {
    const raw = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=UTF-8',
      'MIME-Version: 1.0',
      '',
      body,
    ].join('\r\n');
    return Buffer.from(raw).toString('base64url');
  }

  const raw = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    body,
    '',
    `--${boundary}`,
    `Content-Type: application/pdf; name="${attachmentName}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${attachmentName}"`,
    '',
    attachmentBase64,
    `--${boundary}--`,
  ].join('\r\n');
  return Buffer.from(raw).toString('base64url');
}

function getAdminDb() {
  const { initializeApp, getApps, cert } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!sa) throw new Error('FIREBASE_SERVICE_ACCOUNT not set');
  if (getApps().length === 0) initializeApp({ credential: cert(JSON.parse(sa)) });
  return getFirestore();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req.headers as any);
  if (!rateLimit(`gmail-send:${ip}`, 10)) return res.status(429).json({ error: 'Rate limit exceeded' });

  const { uid, to, subject, body, attachmentBase64, attachmentName } = req.body || {};
  if (!uid || !to || !subject || !body) {
    return res.status(400).json({ error: 'uid, to, subject, body required' });
  }

  // Load refresh token from Firestore
  let refreshToken = '';
  let fromEmail = '';
  try {
    const db = getAdminDb();
    const snap = await db.doc(`users/${uid}`).get();
    const data = snap.data() || {};
    refreshToken = data.googleRefreshToken || '';
    fromEmail = data.googleEmail || data.profile?.email || '';
  } catch (err: any) {
    return res.status(500).json({ error: `Firestore read failed: ${err.message}` });
  }

  if (!refreshToken) {
    return res.status(403).json({
      error: 'Gmail not connected',
      action: 'Connect Gmail in the Integrations tab to enable autonomous sending.',
    });
  }

  try {
    const accessToken = await getAccessToken(refreshToken);
    const rawMessage = buildRawEmail(fromEmail, to, subject, body, attachmentBase64, attachmentName);

    const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawMessage }),
    });
    const gmailData = await gmailRes.json();

    if (!gmailRes.ok) {
      return res.status(gmailRes.status).json({ error: gmailData.error?.message || 'Gmail send failed' });
    }

    return res.status(200).json({ success: true, messageId: gmailData.id, from: fromEmail });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
