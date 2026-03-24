import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { rateLimit, getClientIp } from './_rateLimit';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req.headers as any);
  if (!rateLimit(`report:${ip}`, 15)) {
    return res.status(429).json({ error: 'Too many requests. Please wait.' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  const { deadline, grant, profile } = req.body || {};
  if (!deadline || !grant) return res.status(400).json({ error: 'deadline and grant required' });

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are a professional grant writer drafting a compliance report for a funder. Be precise, data-driven, and professional.

ORGANIZATION:
- Name: ${profile?.companyName || '[PLACEHOLDER: Organization Name]'}
- Type: ${profile?.orgType || '[PLACEHOLDER: Organization Type]'}
- Location: ${profile?.location || '[PLACEHOLDER: Location]'}
- Focus Area: ${profile?.focusArea || '[PLACEHOLDER: Focus Area]'}
- Mission: ${profile?.missionStatement || '[PLACEHOLDER: Mission Statement — complete your profile]'}
- EIN: ${profile?.ein || '[PLACEHOLDER: EIN/Tax ID — required for federal grants]'}
- Team Size: ${profile?.teamSize || '[PLACEHOLDER: Team Size]'}
- Annual Budget: ${profile?.annualBudget || '[PLACEHOLDER: Annual Budget]'}
- Impact Metrics: ${profile?.impactMetrics || '[PLACEHOLDER: Impact metrics — e.g. "500 students served, $2M secured"]'}
- Background: ${(profile?.backgroundInfo || '').slice(0, 500) || '[PLACEHOLDER: Project background and progress]'}

GRANT AWARDED:
- Title: ${grant.grantTitle}
- Agency: ${grant.agency}
- Amount: ${grant.awardAmount}
- Period: ${grant.fundingPeriod}
- Special Requirements: ${(grant.specialRequirements || []).join('; ') || 'None listed'}

REPORT REQUIRED:
- Report Type: ${deadline.title}
- Reporting Period: ${deadline.period}
- Official Due Date: ${deadline.dueDate}
- Soft Deadline: ${deadline.softDueDate} (7 days prior for internal review)

Write a complete, professional ${deadline.type} report. Use markdown headers (###). Where specific data is missing, insert [PLACEHOLDER: exact description of what is needed] so the human can fill it in.

The report should include:
### Executive Summary
### Progress Against Objectives
### Activities Completed This Period
### Outcomes & Impact Metrics
### Financial Summary
### Challenges & Lessons Learned
### Next Period Goals
### Certification

After the report, on a NEW LINE write exactly:
===HARD_BLOCKS===
["block1", "block2"]

List every specific piece of missing data as Hard Blocks. Be specific (e.g., "Q1 expense totals not entered", "Number of beneficiaries served not provided"). Empty array [] if nothing is missing.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let reportText = text;
    let hardBlocks: string[] = [];

    if (text.includes('===HARD_BLOCKS===')) {
      const parts = text.split('===HARD_BLOCKS===');
      reportText = parts[0].trim();
      try {
        hardBlocks = JSON.parse(parts[1].trim());
      } catch {}
    }

    // Auto-detect additional hard blocks from profile gaps
    if (!profile?.impactMetrics) hardBlocks.push('Impact metrics not entered in your profile');
    if (!profile?.ein) hardBlocks.push('EIN / Tax ID missing from profile — required for federal reports');
    if (!profile?.missionStatement) hardBlocks.push('Mission statement not set in profile');
    if (!profile?.backgroundInfo) hardBlocks.push('Project background / progress not entered in profile');

    // Extract placeholder descriptions from report text
    const placeholders = reportText.match(/\[PLACEHOLDER:[^\]]+\]/g) || [];
    placeholders.forEach(p => {
      const desc = p.slice(13, -1).trim();
      if (!hardBlocks.some(b => b.includes(desc.slice(0, 20)))) {
        hardBlocks.push(desc);
      }
    });

    return res.status(200).json({
      reportText,
      hardBlocks: [...new Set(hardBlocks)],
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Report drafting failed: ${err.message}` });
  }
}
