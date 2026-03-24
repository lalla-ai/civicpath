import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured' });

  const { customerId, email } = req.body || {};
  if (!customerId && !email) {
    return res.status(400).json({ error: 'customerId or email required' });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' });
  const baseUrl = process.env.SITE_URL || 'https://civicpath.ai';

  try {
    let resolvedCustomerId = customerId;

    // If we only have email, look up the customer
    if (!resolvedCustomerId && email) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length === 0) {
        return res.status(404).json({ error: 'No Stripe customer found for this email. Make sure you have an active subscription.' });
      }
      resolvedCustomerId = customers.data[0].id;
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: resolvedCustomerId,
      return_url: `${baseUrl}/seeker?tab=billing`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error('Portal session error:', err);
    return res.status(500).json({ error: err.message });
  }
}
