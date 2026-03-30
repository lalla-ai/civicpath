/**
 * push-subscribe.ts — Save Web Push subscription to Firestore
 * POST /api/push-subscribe { uid, subscription }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { uid, subscription } = req.body || {};
  if (!uid) return res.status(400).json({ error: 'uid required' });

  const db = getAdminDb();

  if (req.method === 'DELETE') {
    await db.doc(`users/${uid}/meta/pushSubscription`).delete();
    return res.status(200).json({ success: true, action: 'unsubscribed' });
  }

  if (!subscription?.endpoint) return res.status(400).json({ error: 'subscription required' });

  await db.doc(`users/${uid}/meta/pushSubscription`).set({
    ...subscription,
    subscribedAt: new Date().toISOString(),
  });

  return res.status(200).json({ success: true, action: 'subscribed' });
}
