import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const resendKey = process.env.RESEND_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!resendKey) return res.status(200).json({ ok: true, note: 'RESEND_API_KEY not set' });

  const { email, name = 'there', profile } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });

  const firstName = name.split(' ')[0];
  let grantRecommendations = '';

  // Generate grant recommendations with Gemini
  if (geminiKey && profile?.focusArea) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const prompt = `You are a grant advisor. Based on this organization profile, suggest 5 specific grant opportunities they should apply for this week.

Organization: ${profile.companyName || 'Not specified'}
Location: ${profile.location || 'Florida, USA'}
Focus Area: ${profile.focusArea}
Mission: ${profile.missionStatement || 'Community impact through innovation'}

Return ONLY a JSON array (no markdown):
[{"name":"Grant Name","agency":"Agency","amount":"$X","deadline":"Month DD","why":"1 sentence why it fits"}]`;

      const result = await model.generateContent(prompt);
      const raw = result.response.text();
      try {
        const cleaned = raw.replace(/```json|```/g, '').trim();
        const grants = JSON.parse(cleaned);
        grantRecommendations = grants.map((g: any, i: number) => `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f0ede6;">
                <div style="font-weight:700;color:#1A1A1A;font-size:14px;">${g.name}</div>
                <div style="color:#6B6860;font-size:12px;margin-top:2px;">${g.agency} · ${g.amount} · Due: ${g.deadline}</div>
                <div style="color:#5a9000;font-size:12px;margin-top:4px;">${g.why}</div>
              </td>
            </tr>`).join('');
      } catch {
        grantRecommendations = `<tr><td style="padding:12px 0;color:#6B6860;font-size:13px;">Based on your ${profile.focusArea} focus, check NSF SBIR, Grants.gov, and your state's innovation fund this week.</td></tr>`;
      }
    } catch {
      grantRecommendations = `<tr><td style="padding:12px 0;color:#6B6860;font-size:13px;">Visit your CivicPath dashboard to see this week's personalized matches.</td></tr>`;
    }
  } else {
    grantRecommendations = `<tr><td style="padding:12px 0;color:#6B6860;font-size:13px;">Complete your profile to get AI-powered weekly recommendations.</td></tr>`;
  }

  const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F9F7F2;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F7F2;padding:32px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #E8E5DE;overflow:hidden;">
        <tr>
          <td style="background:#111111;padding:24px 32px;">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="padding-right:8px;">
                  <svg width="24" height="23" viewBox="0 0 48 46" fill="none"><path fill="#76B900" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/></svg>
                </td>
                <td style="color:#ffffff;font-size:18px;font-weight:800;">CivicPath</td>
                <td style="padding-left:16px;color:#76B900;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Weekly Digest</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1A1A1A;">Your grants for this week, ${firstName}</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#6B6860;">Based on your profile, here are 5 opportunities worth your attention right now.</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${grantRecommendations}
            </table>
            <div style="margin-top:24px;text-align:center;">
              <a href="https://civicpath.ai/seeker" style="display:inline-block;background:#76B900;color:#111111;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">Run Full Pipeline →</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #E8E5DE;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9CA3AF;">© 2026 HelloAgentic · <a href="https://civicpath.ai/pricing" style="color:#76B900;text-decoration:none;">Manage subscription</a> · <a href="https://civicpath.ai/privacy" style="color:#76B900;text-decoration:none;">Privacy</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  try {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: 'CivicPath <hello@civicpath.ai>',
      to: email,
      subject: `Your weekly grant matches, ${firstName} — ${new Date().toLocaleDateString('en-US', {month:'long', day:'numeric'})}`,
      html,
      reply_to: 'hello@civicpath.ai',
    });
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('Resend digest error:', err);
    return res.status(200).json({ ok: true, note: err.message });
  }
}
