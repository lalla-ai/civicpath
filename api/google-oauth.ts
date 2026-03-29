/**
 * google-oauth.ts — Gmail + Google Calendar OAuth 2.0
 *
 * Scopes:
 *   - gmail.send        → Submitter agent sends proposals from user's Gmail
 *   - calendar.events   → Scheduler agent auto-books grant deadlines
 *
 * Flow:
 *   GET  /api/google-oauth?action=authorize&uid=xxx  → redirect to Google
 *   GET  /api/google-oauth?action=callback&code=xxx&state=xxx → exchange + store
 *
 * Env vars required:
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET
 *   SITE_URL (e.g. https://civicpath.ai)
 *
 * Token storage:
 *   Firestore: users/{uid}.googleRefreshToken (encrypted at rest by Firestore)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

function getRedirectUri(req: VercelRequest): string {
  const configured = process.env.SITE_URL?.trim().replace(/\/$/, '');
  const host = req.headers.host;
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const base = configured || `${proto}://${host}`;
  return `${base}/api/google-oauth`;
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
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({
      error: 'GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET not configured. Add them in Vercel environment variables.',
    });
  }

  const action = req.query.action as string;
  const redirectUri = getRedirectUri(req);

  // ── STEP 1: Redirect user to Google consent screen ──────────────────────
  if (action === 'authorize') {
    const uid = req.query.uid as string;
    const returnTo = (req.query.returnTo as string) || '/seeker';
    if (!uid) return res.status(400).json({ error: 'uid required' });

    const state = Buffer.from(JSON.stringify({ uid, returnTo })).toString('base64url');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('access_type', 'offline');   // get refresh token
    authUrl.searchParams.set('prompt', 'consent');         // always get refresh token
    authUrl.searchParams.set('state', state);

    return res.redirect(302, authUrl.toString());
  }

  // ── STEP 2: Handle callback — exchange code for tokens ───────────────────
  if (req.query.code && req.query.state) {
    const code = req.query.code as string;
    const stateRaw = req.query.state as string;

    let uid = '';
    let returnTo = '/seeker';
    try {
      const parsed = JSON.parse(Buffer.from(stateRaw, 'base64url').toString());
      uid = parsed.uid;
      returnTo = parsed.returnTo || '/seeker';
    } catch {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.refresh_token) {
      const base = process.env.SITE_URL || '';
      return res.redirect(302, `${base}${returnTo}?google_oauth=error&reason=no_refresh_token`);
    }

    // Get user email from Google
    let googleEmail = '';
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = await userRes.json();
      googleEmail = userData.email || '';
    } catch { /* optional */ }

    // Store refresh token in Firestore
    try {
      const db = getAdminDb();
      await db.doc(`users/${uid}`).set({
        googleRefreshToken: tokenData.refresh_token,
        googleEmail,
        googleConnectedAt: new Date().toISOString(),
        googleScopes: SCOPES,
      }, { merge: true });
    } catch (err: any) {
      console.error('[Google OAuth] Firestore write failed:', err.message);
    }

    const base = process.env.SITE_URL || '';
    return res.redirect(302, `${base}${returnTo}?google_oauth=success&email=${encodeURIComponent(googleEmail)}`);
  }

  // ── REVOKE: Remove stored token ──────────────────────────────────────────
  if (action === 'revoke' && req.method === 'POST') {
    const { uid } = req.body || {};
    if (!uid) return res.status(400).json({ error: 'uid required' });
    try {
      const db = getAdminDb();
      await db.doc(`users/${uid}`).set({
        googleRefreshToken: null,
        googleEmail: null,
        googleConnectedAt: null,
      }, { merge: true });
      return res.status(200).json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: 'Unknown action. Use ?action=authorize' });
}
