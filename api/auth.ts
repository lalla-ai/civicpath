/**
 * auth.ts — Server-side Firebase Auth Proxy
 *
 * Routes email/password auth through our Vercel server (US-based) instead of
 * the user's browser. This fixes auth for users in countries where Google/Firebase
 * endpoints (identitytoolkit.googleapis.com) are blocked or throttled.
 *
 * Flow:
 *   1. Client sends email + password to POST /api/auth
 *   2. Server calls Firebase Auth REST API (from US Vercel server)
 *   3. Server creates a custom token via Firebase Admin SDK
 *   4. Client receives custom token and calls signInWithCustomToken()
 *
 * Actions: login | signup | reset
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rateLimit, getClientIp } from './rateLimiter.js';

const FIREBASE_API_KEY = 'AIzaSyBR-RZA2caNRQ8MOuj0VaJxhj30H7CyXwE';

function getAdminAuth() {
  const { initializeApp, getApps, cert } = require('firebase-admin/app');
  const { getAuth } = require('firebase-admin/auth');
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!sa) throw new Error('FIREBASE_SERVICE_ACCOUNT not set');
  if (getApps().length === 0) initializeApp({ credential: cert(JSON.parse(sa)) });
  return getAuth();
}

async function firebaseRestCall(endpoint: string, body: object) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  return res.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req.headers as any);
  if (!rateLimit(`auth:${ip}`, 10)) {
    return res.status(429).json({ error: 'Too many attempts. Please wait a moment.' });
  }

  const { action, email, password, name } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  if (action === 'login' || !action) {
    const data = await firebaseRestCall('signInWithPassword', {
      email,
      password,
      returnSecureToken: true,
    });

    if (data.error) {
      const code = data.error.message || '';
      if (code.includes('INVALID_PASSWORD') || code.includes('EMAIL_NOT_FOUND') || code.includes('INVALID_LOGIN_CREDENTIALS')) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      if (code.includes('TOO_MANY_ATTEMPTS')) {
        return res.status(429).json({ error: 'Too many failed attempts. Please try again later.' });
      }
      if (code.includes('USER_DISABLED')) {
        return res.status(403).json({ error: 'This account has been disabled.' });
      }
      return res.status(401).json({ error: 'Sign in failed. Please check your credentials.' });
    }

    const uid = data.localId;
    const adminAuth = getAdminAuth();
    const customToken = await adminAuth.createCustomToken(uid);

    return res.status(200).json({
      customToken,
      uid,
      email: data.email,
      displayName: data.displayName || '',
    });
  }

  // ── SIGNUP ────────────────────────────────────────────────────────────────
  if (action === 'signup') {
    const data = await firebaseRestCall('signUp', {
      email,
      password,
      returnSecureToken: true,
    });

    if (data.error) {
      const code = data.error.message || '';
      if (code.includes('EMAIL_EXISTS')) {
        return res.status(409).json({ error: 'An account with this email already exists. Try signing in instead.' });
      }
      if (code.includes('WEAK_PASSWORD')) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }
      if (code.includes('INVALID_EMAIL')) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }
      return res.status(400).json({ error: 'Sign up failed. Please try again.' });
    }

    const uid = data.localId;
    const adminAuth = getAdminAuth();

    // Set display name if provided
    if (name?.trim()) {
      await adminAuth.updateUser(uid, { displayName: name.trim() }).catch(() => {});
    }

    const customToken = await adminAuth.createCustomToken(uid);

    return res.status(200).json({
      customToken,
      uid,
      email: data.email,
      displayName: name?.trim() || '',
    });
  }

  // ── PASSWORD RESET ────────────────────────────────────────────────────────
  if (action === 'reset') {
    const data = await firebaseRestCall('sendOobCode', {
      requestType: 'PASSWORD_RESET',
      email,
    });

    if (data.error) {
      return res.status(400).json({ error: 'Could not send reset email. Check the address and try again.' });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'Unknown action.' });
}
