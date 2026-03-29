import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured' });

  const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' });

  const { plan, email, userId } = req.body || {};
  if (!plan) return res.status(400).json({ error: 'plan required (pro | funder)' });

  // Price IDs — set these as Vercel env vars after creating products in Stripe dashboard
  const priceId = plan === 'funder'
    ? process.env.STRIPE_PRICE_FUNDER
    : process.env.STRIPE_PRICE_PRO;

  if (!priceId) {
    return res.status(500).json({
      error: `STRIPE_PRICE_${plan.toUpperCase()} env var not set. Create a recurring price in your Stripe dashboard and add the price ID to Vercel.`,
    });
  }

  const baseUrl = process.env.SITE_URL || 'https://civicpath.ai';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      ...(email ? { customer_email: email } : {}),
      success_url: `${baseUrl}/pricing?success=true&plan=${plan}`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
      metadata: { plan, ...(userId ? { userId } : {}) },
      subscription_data: {
        trial_period_days: 14, // 14-day free trial on all paid plans
        metadata: { plan, ...(userId ? { userId } : {}) },
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: err.message });
  }
}
