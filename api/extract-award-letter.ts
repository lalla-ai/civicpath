import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { rateLimit, getClientIp } from '../lib/rateLimiter';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req.headers as any);
  if (!rateLimit(`award:${ip}`, 10)) {
    return res.status(429).json({ error: 'Too many requests. Please wait.' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  const { content, mimeType = 'text/plain', fileName = 'award-letter', orgName } = req.body || {};
  if (!content) return res.status(400).json({ error: 'content (base64) required' });

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const extractionPrompt = `You are a grant compliance expert. Extract ALL reporting requirements, deadlines, and milestones from this grant award letter.

Organization applying: ${orgName || 'Not specified'}
File: ${fileName}

Return ONLY valid JSON (no markdown, no explanation):
{
  "grantTitle": "full official grant program name",
  "agency": "funding agency full name",
  "awardAmount": "$X,XXX (exact figure from letter)",
  "awardDate": "YYYY-MM-DD or written date",
  "fundingPeriod": "e.g. January 1, 2026 – December 31, 2026",
  "programOfficer": "name and email if listed, else null",
  "deadlines": [
    {
      "type": "interim|progress|financial|narrative|final|other",
      "title": "descriptive name e.g. Q1 Financial Report",
      "dueDate": "YYYY-MM-DD",
      "softDueDate": "YYYY-MM-DD (exactly 7 days before dueDate)",
      "period": "reporting period e.g. Q1 2026, Year 1, Mid-Project"
    }
  ],
  "specialRequirements": [
    "specific requirement or condition from the award letter"
  ]
}

CRITICAL: Extract EVERY single reporting obligation mentioned. If relative dates like '90 days after award start', calculate from awardDate. Include financial reports, narrative reports, progress updates, final reports, site visits — everything.`;

  try {
    // Try multimodal first (works for PDF, DOCX, images)
    const result = await model.generateContent([
      { inlineData: { data: content, mimeType } },
      extractionPrompt,
    ]);
    const raw = result.response.text().replace(/```json|```/g, '').trim();
    const data = JSON.parse(raw);
    return res.status(200).json(data);
  } catch {
    // Fallback: decode base64 to text and send as plain text
    try {
      const textContent = Buffer.from(content, 'base64').toString('utf-8');
      const result = await model.generateContent(
        `${extractionPrompt}\n\nDOCUMENT CONTENT:\n${textContent.slice(0, 10000)}`
      );
      const raw = result.response.text().replace(/```json|```/g, '').trim();
      const data = JSON.parse(raw);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: `Extraction failed: ${err.message}` });
    }
  }
}
