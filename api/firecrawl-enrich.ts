/**
 * firecrawl-enrich.ts — Scrape grant pages for eligibility + requirements
 *
 * When FIRECRAWL_API_KEY is set, Hunter uses this to read the actual
 * grant portal page instead of just the API title/description.
 * This dramatically improves Matchmaker scoring accuracy.
 *
 * POST /api/firecrawl-enrich
 * Body: { urls: string[], profile: { focusArea, orgType, location } }
 *
 * Sign up free at firecrawl.dev — $0.001/page
 * Add FIRECRAWL_API_KEY to Vercel env vars to activate.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rateLimit, getClientIp } from './rateLimiter.js';
import { GEMINI_MODEL, getGeminiKey } from './_config.js';

async function scrapeUrl(url: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: true,
      timeout: 15000,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Firecrawl scrape failed');
  return (data.data?.markdown || '').slice(0, 3000); // Limit to 3K chars per page
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req.headers as any);
  if (!rateLimit(`firecrawl:${ip}`, 10)) return res.status(429).json({ error: 'Rate limit exceeded' });

  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (!firecrawlKey) {
    return res.status(200).json({
      enriched: [],
      note: 'FIRECRAWL_API_KEY not set — add it to Vercel to enable deep grant page analysis.',
    });
  }

  const { urls, profile } = req.body || {};
  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'urls array required' });
  }

  const geminiKey = getGeminiKey();
  const enriched: any[] = [];

  // Scrape up to 5 URLs in parallel
  const toScrape = urls.slice(0, 5);

  await Promise.allSettled(
    toScrape.map(async (url: string) => {
      try {
        const markdown = await scrapeUrl(url, firecrawlKey);
        if (!markdown) return;

        // Use Gemini to extract structured eligibility data
        let eligibility: any = { raw: markdown.slice(0, 500) };

        if (geminiKey) {
          try {
            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

            const prompt = `Extract grant eligibility requirements from this grant page content.

Grant page content:
${markdown}

Organization context:
- Focus: ${profile?.focusArea || 'technology'}
- Type: ${profile?.orgType || 'nonprofit'}
- Location: ${profile?.location || 'United States'}

Return ONLY valid JSON:
{
  "eligibleOrgTypes": ["501c3", "small business", etc.],
  "geographicRestrictions": "national/state/city or null",
  "minBudget": "$ amount or null",
  "maxBudget": "$ amount or null",
  "requiredDocuments": ["EIN", "IRS letter", etc.],
  "deadlineInfo": "date or rolling",
  "keyRequirements": ["short bullet points"],
  "fitSummary": "1 sentence on fit for this org type",
  "eligibilityScore": 0-100
}`;

            const result = await model.generateContent(prompt);
            const raw = result.response.text();
            try {
              eligibility = JSON.parse(raw.replace(/```json|```/g, '').trim());
            } catch {
              eligibility = { fitSummary: raw.slice(0, 200), raw: markdown.slice(0, 300) };
            }
          } catch { /* use raw markdown if Gemini fails */ }
        }

        enriched.push({ url, eligibility });
      } catch (err: any) {
        enriched.push({ url, error: err.message });
      }
    })
  );

  return res.status(200).json({ enriched, scraped: enriched.length, total: toScrape.length });
}
