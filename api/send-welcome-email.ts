import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Silently succeed if Resend not configured — don't break signup flow
    return res.status(200).json({ ok: true, note: 'RESEND_API_KEY not set — email skipped' });
  }

  const { name, email, role = 'seeker' } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });

  const resend = new Resend(apiKey);
  const firstName = (name || 'there').split(' ')[0];
  const isSeeker = role !== 'funder';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to CivicPath</title>
</head>
<body style="margin:0;padding:0;background:#F9F7F2;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F7F2;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #E8E5DE;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#1A1A1A;padding:32px 40px;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="padding-right:10px;">
                  <svg width="32" height="32" viewBox="0 0 48 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#76B900" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
                  </svg>
                </td>
                <td style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">CivicPath</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td style="padding:40px 40px 24px;text-align:center;">
            <div style="display:inline-block;background:#76B90020;color:#76B900;font-size:12px;font-weight:700;padding:6px 16px;border-radius:100px;margin-bottom:20px;letter-spacing:0.5px;text-transform:uppercase;">
              🏆 Google Cloud ADK Hackathon 2026 · Finalist
            </div>
            <h1 style="margin:0 0 12px;font-size:28px;font-weight:900;color:#1A1A1A;line-height:1.2;">
              Welcome, ${firstName}! 🎉
            </h1>
            <p style="margin:0;font-size:16px;color:#6B6860;line-height:1.6;">
              ${isSeeker
                ? 'Your AI grant pipeline is ready. 6 agents are standing by to find, score, draft, and submit grants for your organization — automatically.'
                : 'Your grant funder dashboard is ready. Start posting grants and let AI match you with the best applicants.'}
            </p>
          </td>
        </tr>

        <!-- CTA Button -->
        <tr>
          <td style="padding:0 40px 32px;text-align:center;">
            <a href="https://grant-scout-ui.vercel.app/${isSeeker ? 'seeker' : 'funder'}"
               style="display:inline-block;background:#76B900;color:#111111;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">
              ${isSeeker ? 'Find My Grants →' : 'Go to Funder Dashboard →'}
            </a>
          </td>
        </tr>

        <!-- Steps -->
        ${isSeeker ? `
        <tr>
          <td style="padding:0 40px 32px;">
            <div style="background:#F9F7F2;border-radius:12px;padding:24px;">
              <p style="margin:0 0 16px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6B6860;">Your next 3 steps</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${[
                  ['01', 'Complete your profile', 'Add your org name, EIN, mission, and LinkedIn. Better profile = better grants.'],
                  ['02', 'Run the pipeline', 'Hit "Run Full Pipeline" — Hunter + Matchmaker scan Grants.gov live in 60 seconds.'],
                  ['03', 'Approve & submit', 'Review your AI-drafted proposal. One click to approve. Agents send it for you.'],
                ].map(([n, title, desc]) => `
                <tr>
                  <td style="padding:8px 0;vertical-align:top;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right:12px;vertical-align:top;">
                          <div style="width:28px;height:28px;background:#76B900;border-radius:50%;text-align:center;line-height:28px;font-size:11px;font-weight:900;color:#111;">${n}</div>
                        </td>
                        <td>
                          <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#1A1A1A;">${title}</p>
                          <p style="margin:0;font-size:13px;color:#6B6860;">${desc}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`).join('')}
              </table>
            </div>
          </td>
        </tr>` : ''}

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #E8E5DE;" /></td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;text-align:center;">
            <p style="margin:0 0 8px;font-size:13px;color:#6B6860;">
              Questions? Reply to this email or chat with Omninor ⌘ on the platform.
            </p>
            <p style="margin:0;font-size:12px;color:#9CA3AF;">
              © 2026 HelloAgentic · Built in Florida · 
              <a href="https://grant-scout-ui.vercel.app/privacy" style="color:#76B900;text-decoration:none;">Privacy</a> · 
              <a href="https://grant-scout-ui.vercel.app/terms" style="color:#76B900;text-decoration:none;">Terms</a> ·
              <a href="https://grant-scout-ui.vercel.app/pricing" style="color:#76B900;text-decoration:none;">Manage Subscription</a>
            </p>
            <p style="margin:8px 0 0;font-size:11px;color:#9CA3AF;">
              You're receiving this because you signed up for CivicPath.<br/>
              To unsubscribe, reply "unsubscribe" to this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: 'CivicPath <hello@civicpath.ai>',
      to: email,
      subject: `Welcome to CivicPath, ${firstName}! Your grant pipeline is ready 🏆`,
      html,
      reply_to: 'hello@civicpath.ai',
    });
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('Resend error:', err);
    // Don't fail the signup — email is non-critical
    return res.status(200).json({ ok: true, note: err.message });
  }
}
