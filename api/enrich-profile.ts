import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { rateLimit, getClientIp } from './rateLimiter.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req.headers as any);
  if (!rateLimit(`enrich:${ip}`, 10)) {
    return res.status(429).json({ error: 'Too many enrichment requests. Please wait a minute.' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  const { companyName, website, linkedinUrl, twitterUrl } = req.body || {};
  
  const urls = [website, linkedinUrl, twitterUrl].filter(Boolean).join(', ');
  if (!urls && !companyName) {
    return res.status(400).json({ error: 'Company name or at least one URL required for enrichment' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      tools: [{ googleSearch: {} }] 
    });

    const prompt = `You are a professional grant profile researcher.
Research the organization: ${companyName || 'Unknown'} 
Associated URLs: ${urls}

Perform a Google Search to find their latest mission, impact metrics, team size, and founding year.

Respond ONLY with a valid JSON object matching this schema (no markdown, no backticks):
{
  "companyName": "extracted official name",
  "tagline": "5-7 word impactful tagline",
  "focusArea": "primary sector (e.g. Health Tech, Education)",
  "missionStatement": "concise 2-sentence mission",
  "yearFounded": "YYYY",
  "location": "City, State, Country",
  "impactMetrics": "3-4 key metrics separated by bullets (e.g. 5k served • $1M raised)",
  "backgroundInfo": "Professional 200-word summary of their history and achievements",
  "teamSize": "number or range",
  "targetPopulation": "who they serve"
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Clean up potential markdown formatting if Gemini hallucinates it
    const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(jsonStr);

    return res.status(200).json(data);
  } catch (err: any) {
    console.error('Enrichment error:', err);
    return res.status(500).json({ error: err.message });
  }
}
