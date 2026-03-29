/**
 * calendar-create.ts — Auto-book Google Calendar events via OAuth2
 *
 * Uses the same refresh token from Google OAuth (gmail + calendar scopes).
 * Silently creates events — no tab opens, no user action needed.
 *
 * POST /api/calendar-create
 * Body: { uid, events: [{ title, date, description }] }
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
  if (!rateLimit(`calendar:${ip}`, 20)) return res.status(429).json({ error: 'Rate limit exceeded' });

  const { uid, events } = req.body || {};
  if (!uid || !Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'uid and events[] required' });
  }

  // Load refresh token from Firestore
  let refreshToken = '';
  try {
    const db = getAdminDb();
    const snap = await db.doc(`users/${uid}`).get();
    refreshToken = snap.data()?.googleRefreshToken || '';
  } catch (err: any) {
    return res.status(500).json({ error: `Firestore read failed: ${err.message}` });
  }

  if (!refreshToken) {
    return res.status(403).json({
      error: 'Google Calendar not connected',
      action: 'Connect Google in the Integrations tab.',
      fallbackUrls: events.map((e: any) => ({
        title: e.title,
        url: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${(e.date || '').replace(/-/g, '')}/${(e.date || '').replace(/-/g, '')}&details=${encodeURIComponent(e.description || 'CivicPath — Grant Deadline')}`,
      })),
    });
  }

  try {
    const accessToken = await getAccessToken(refreshToken);
    const results: any[] = [];

    for (const event of events) {
      // Build ISO date range (all-day event)
      const dateStr = event.date ? event.date.slice(0, 10) : new Date().toISOString().slice(0, 10);
      const nextDay = new Date(dateStr);
      nextDay.setDate(nextDay.getDate() + 1);
      const endDateStr = nextDay.toISOString().slice(0, 10);

      const calEvent = {
        summary: event.title,
        description: event.description || 'Grant deadline tracked by CivicPath',
        start: { date: dateStr },
        end:   { date: endDateStr },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 7 * 24 * 60 },  // 1 week before
            { method: 'popup', minutes: 24 * 60 },       // 1 day before
          ],
        },
        colorId: '2', // Sage green
      };

      const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calEvent),
      });
      const calData = await calRes.json();

      if (calRes.ok) {
        results.push({ title: event.title, eventId: calData.id, htmlLink: calData.htmlLink, status: 'created' });
      } else {
        results.push({ title: event.title, status: 'failed', error: calData.error?.message });
      }
    }

    const created = results.filter(r => r.status === 'created').length;
    return res.status(200).json({ success: true, created, total: events.length, results });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
