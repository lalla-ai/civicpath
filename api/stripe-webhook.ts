import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ── Firebase Admin (server-side) ─────────────────────────────────────────────
// Uses FIREBASE_SERVICE_ACCOUNT env var (JSON string of service account key)
function getAdminDb() {
  if (getApps().length === 0) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccount) throw new Error('FIREBASE_SERVICE_ACCOUNT not set');
    initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
  }
  return getFirestore();
}

export const config = { api: { bodyParser: false } }; // Stripe needs raw body

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) {
    return res.status(500).json({ error: 'Stripe env vars not configured' });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' });

  let event: Stripe.Event;
  try {
    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'] as string;
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  // ── Handle relevant events ─────────────────────────────────────────────────
  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'customer.subscription.updated'
  ) {
    try {
      const db = getAdminDb();

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const plan = session.metadata?.plan || 'pro';
        const customerEmail = session.customer_email || session.customer_details?.email;

        if (customerEmail) {
          // Find user by email and update their plan in Firestore
          const usersSnap = await db.collection('users')
            .where('profile.email', '==', customerEmail)
            .limit(1)
            .get();

          if (!usersSnap.empty) {
            const userDoc = usersSnap.docs[0];
            await userDoc.ref.set(
              {
                plan,
                planActivatedAt: new Date().toISOString(),
                role: plan === 'funder' ? 'funder' : 'seeker',
              },
              { merge: true }
            );
          }
        }
      }

      if (event.type === 'customer.subscription.updated') {
        const sub = event.data.object as Stripe.Subscription;
        // If subscription is canceled or past_due, downgrade to free
        if (sub.status === 'canceled' || sub.status === 'past_due') {
          const customerId = sub.customer as string;
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          const email = customer.email;
          if (email) {
            const usersSnap = await db.collection('users')
              .where('profile.email', '==', email)
              .limit(1)
              .get();
            if (!usersSnap.empty) {
              await usersSnap.docs[0].ref.set(
                { plan: 'free', planActivatedAt: null },
                { merge: true }
              );
            }
          }
        }
      }
    } catch (err: any) {
      // Don't fail the webhook — Stripe will retry
      console.error('Firestore update failed:', err.message);
    }
  }

  return res.status(200).json({ received: true });
}
