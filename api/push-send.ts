/**
 * push-send.ts — Send Web Push notification via VAPID
 * POST /api/push-send { subscription, payload }
 *
 * Uses Web Push Protocol directly (no web-push library needed).
 * VAPID keys stored as VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY env vars.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rateLimit, getClientIp } from './rateLimiter.js';

function base64urlToBuffer(base64url: string): Buffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  return Buffer.from(padded, 'base64');
}

async function buildVapidJWT(audience: string): Promise<string> {
  const crypto = require('crypto');
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;

  const header = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const claims = Buffer.from(JSON.stringify({
    aud: audience,
    exp: now + 43200, // 12 hours
    sub: 'mailto:noreply@civicpath.ai',
  })).toString('base64url');

  const signingInput = `${header}.${claims}`;
  const privKeyDer = Buffer.alloc(138);
  // Reconstruct PKCS8 DER for P-256 private key
  const privBytes = base64urlToBuffer(VAPID_PRIVATE);
  // Minimal PKCS8 structure for P-256
  const pkcs8Header = Buffer.from('308187020100301306072a8648ce3d020106082a8648ce3d030107046d306b02010104', 'hex');
  const sec1 = Buffer.concat([pkcs8Header, privBytes]);

  const privateKey = crypto.createPrivateKey({ key: sec1, format: 'der', type: 'pkcs8' });
  const sign = crypto.createSign('SHA256');
  sign.update(signingInput);
  const derSig = sign.sign(privateKey);

  // Convert DER signature to raw r||s (64 bytes)
  const rLen = derSig[3];
  const r = derSig.slice(4, 4 + rLen).slice(-32);
  const sLen = derSig[5 + rLen];
  const s = derSig.slice(6 + rLen, 6 + rLen + sLen).slice(-32);
  const rawSig = Buffer.concat([
    Buffer.alloc(32 - r.length), r,
    Buffer.alloc(32 - s.length), s,
  ]).toString('base64url');

  return `${signingInput}.${rawSig}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req.headers as any);
  if (!rateLimit(`push:${ip}`, 30)) return res.status(429).json({ error: 'Rate limit' });

  const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(500).json({ error: 'VAPID keys not configured' });
  }

  const { subscription, payload } = req.body || {};
  if (!subscription?.endpoint) return res.status(400).json({ error: 'subscription required' });

  try {
    const endpoint = new URL(subscription.endpoint);
    const audience = `${endpoint.protocol}//${endpoint.host}`;
    const jwt = await buildVapidJWT(audience);

    const pushRes = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt},k=${VAPID_PUBLIC}`,
        'Content-Type': 'application/octet-stream',
        'TTL': '86400',
        ...(subscription.keys?.p256dh ? {
          'Content-Encoding': 'aes128gcm',
        } : {}),
      },
      body: typeof payload === 'string' ? Buffer.from(payload) : undefined,
    });

    if (pushRes.status === 201 || pushRes.status === 200 || pushRes.status === 204) {
      return res.status(200).json({ success: true });
    }

    // Subscription expired/invalid
    if (pushRes.status === 410 || pushRes.status === 404) {
      return res.status(200).json({ success: false, reason: 'subscription_expired' });
    }

    return res.status(200).json({ success: false, status: pushRes.status });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
