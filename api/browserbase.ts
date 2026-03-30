/**
 * browserbase.ts — Autonomous Grant Portal Form-Fill via Browserbase
 *
 * Browserbase provides a real headless Chrome browser on the cloud.
 * This agent opens a grant portal URL, fills the application form
 * using the user's CivicPath profile, and captures the result.
 *
 * Activation: Set BROWSERBASE_API_KEY in Vercel ($50/mo plan)
 * Sign up: browserbase.com
 *
 * POST /api/browserbase
 * Body: { action: 'fill-form' | 'screenshot' | 'check-portal', url, profile, proposalText }
 *
 * ⚠️  Full portal automation requires portal-specific mapping.
 *     Each grant portal (Grants.gov, FastLane, etc.) has a unique form.
 *     The scaffold below handles the most common patterns.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rateLimit, getClientIp } from './rateLimiter.js';

const BROWSERBASE_API = 'https://www.browserbase.com/v1';

async function createSession(apiKey: string): Promise<string> {
  const res = await fetch(`${BROWSERBASE_API}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bb-api-key': apiKey,
    },
    body: JSON.stringify({
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      browserSettings: {
        viewport: { width: 1280, height: 900 },
        fingerprint: { browsers: ['chrome'], devices: ['desktop'] },
      },
      timeout: 120, // 2 minute max per session
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create Browserbase session');
  return data.id;
}

async function runSession(apiKey: string, sessionId: string, script: string): Promise<any> {
  const res = await fetch(`${BROWSERBASE_API}/sessions/${sessionId}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bb-api-key': apiKey,
    },
    body: JSON.stringify({ code: script }),
  });
  return res.json();
}

async function takeScreenshot(apiKey: string, sessionId: string): Promise<string> {
  const res = await fetch(`${BROWSERBASE_API}/sessions/${sessionId}/screenshot`, {
    headers: { 'x-bb-api-key': apiKey },
  });
  const data = await res.json();
  return data.screenshot || ''; // base64 PNG
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req.headers as any);
  if (!rateLimit(`browserbase:${ip}`, 5)) return res.status(429).json({ error: 'Rate limit exceeded' });

  const bbKey = process.env.BROWSERBASE_API_KEY;
  if (!bbKey) {
    return res.status(200).json({
      offline: true,
      note: 'BROWSERBASE_API_KEY not configured. Add it to Vercel to enable autonomous form-filling.',
      setupUrl: 'https://browserbase.com',
    });
  }

  const { action = 'check-portal', url, profile, proposalText } = req.body || {};
  if (!url) return res.status(400).json({ error: 'url required' });

  let sessionId = '';
  try {
    sessionId = await createSession(bbKey);

    if (action === 'screenshot') {
      // Navigate and screenshot — useful for previewing a grant portal
      await runSession(bbKey, sessionId, `
        await page.goto(${JSON.stringify(url)}, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.waitForTimeout(2000);
      `);
      const screenshot = await takeScreenshot(bbKey, sessionId);
      return res.status(200).json({ success: true, screenshot, sessionId });
    }

    if (action === 'check-portal') {
      // Navigate and extract form fields — map the portal structure
      const result = await runSession(bbKey, sessionId, `
        await page.goto(${JSON.stringify(url)}, { waitUntil: 'networkidle0', timeout: 30000 });
        const inputs = await page.$$eval('input, textarea, select', els =>
          els.map(el => ({
            type: el.tagName.toLowerCase(),
            name: el.name || el.id || el.placeholder || '',
            label: el.closest('label')?.textContent?.trim() || '',
            required: el.required,
          })).filter(e => e.name || e.label)
        );
        const title = await page.title();
        return { inputs, title, url: page.url() };
      `);
      return res.status(200).json({ success: true, ...result, sessionId });
    }

    if (action === 'fill-form') {
      if (!profile) return res.status(400).json({ error: 'profile required for fill-form' });

      // Generic form-fill using common field name patterns
      // Each grant portal has unique field names — this covers the most common patterns
      const fillScript = `
        await page.goto(${JSON.stringify(url)}, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.waitForTimeout(2000);

        const profile = ${JSON.stringify(profile)};
        const proposalText = ${JSON.stringify(proposalText || '')};

        // Common field patterns across grant portals
        const fieldMap = {
          // Organization name variations
          '#org_name,#organization_name,#applicant_name,[name="org_name"],[name="organization"],[name="applicantName"]':
            profile.companyName,
          // EIN variations
          '#ein,#tax_id,#ein_number,[name="ein"],[name="taxId"],[name="ein_number"]':
            profile.ein,
          // Mission variations
          '#mission,#mission_statement,[name="mission"],[name="missionStatement"],textarea[id*="mission"]':
            profile.missionStatement || profile.backgroundInfo,
          // Project description
          '#project_description,#description,[name="projectDescription"],[name="project_description"],textarea[id*="description"]':
            profile.projectDescription,
          // Contact email
          '#email,#contact_email,[name="email"],[name="contactEmail"],[type="email"]':
            profile.linkedinEmail || '',
          // Location
          '#city,[name="city"]': profile.location?.split(',')[0]?.trim() || '',
          '#state,[name="state"]': profile.location?.split(',')[1]?.trim() || '',
        };

        let filled = 0;
        for (const [selector, value] of Object.entries(fieldMap)) {
          if (!value) continue;
          try {
            const selectors = selector.split(',');
            for (const s of selectors) {
              const el = await page.$(s.trim());
              if (el) {
                await el.click({ clickCount: 3 });
                await el.type(String(value), { delay: 30 });
                filled++;
                break;
              }
            }
          } catch {}
        }

        const screenshot = await page.screenshot({ encoding: 'base64', type: 'png' });
        return { filled, screenshot };
      `;

      const result = await runSession(bbKey, sessionId, fillScript);
      return res.status(200).json({
        success: true,
        fieldsFilledCount: result?.filled || 0,
        screenshot: result?.screenshot || '',
        note: `${result?.filled || 0} fields auto-filled. Review the screenshot before submitting.`,
        sessionId,
      });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });

  } catch (err: any) {
    return res.status(500).json({ error: err.message, sessionId });
  }
}
