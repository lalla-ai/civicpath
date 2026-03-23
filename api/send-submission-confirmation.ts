import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return res.status(200).json({ ok: true, note: 'RESEND_API_KEY not set' });

  const { email, name = 'there', orgName = 'Your Organization', grantName, amount } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });

  const firstName = name.split(' ')[0];
  const now = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F9F7F2;font-family:Inter,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F7F2;padding:32px 20px;">
  <tr><td align="center">
    <table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #E8E5DE;overflow:hidden;">
      <tr>
        <td style="background:#111;padding:20px 32px;">
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr>
              <td style="padding-right:8px;">
                <svg width="22" height="21" viewBox="0 0 48 46" fill="none"><path fill="#76B900" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/></svg>
              </td>
              <td style="color:#fff;font-size:17px;font-weight:800;">CivicPath</td>
              <td style="padding-left:12px;color:#76B900;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Proposal Confirmation</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;">
          <div style="width:52px;height:52px;background:#76B90015;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;font-size:24px;">✅</div>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1A1A1A;">Proposal prepared, ${firstName}!</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#6B6860;line-height:1.6;">
            Your AI-drafted grant proposal has been reviewed, approved, and packaged for submission.
          </p>

          <div style="background:#F9F7F2;border-radius:12px;padding:20px;margin-bottom:24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:6px 0;border-bottom:1px solid #E8E5DE;">
                <span style="font-size:12px;color:#9CA3AF;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Organization</span><br/>
                <span style="font-size:14px;color:#1A1A1A;font-weight:700;">${orgName}</span>
              </td></tr>
              <tr><td style="padding:6px 0;border-bottom:1px solid #E8E5DE;">
                <span style="font-size:12px;color:#9CA3AF;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Grant</span><br/>
                <span style="font-size:14px;color:#1A1A1A;font-weight:700;">${grantName || 'Grant Application'}</span>
              </td></tr>
              ${amount ? `<tr><td style="padding:6px 0;border-bottom:1px solid #E8E5DE;">
                <span style="font-size:12px;color:#9CA3AF;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Amount</span><br/>
                <span style="font-size:14px;color:#76B900;font-weight:800;">${amount}</span>
              </td></tr>` : ''}
              <tr><td style="padding:6px 0;">
                <span style="font-size:12px;color:#9CA3AF;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Date Approved</span><br/>
                <span style="font-size:14px;color:#1A1A1A;font-weight:700;">${now}</span>
              </td></tr>
            </table>
          </div>

          <div style="background:#76B90010;border:1px solid #76B90030;border-radius:10px;padding:16px;margin-bottom:24px;">
            <p style="margin:0;font-size:13px;color:#5a9000;font-weight:600;">📋 Next step to complete submission</p>
            <p style="margin:6px 0 0;font-size:12px;color:#6B6860;">Connect Gmail in the Integrations tab to enable autonomous sending. Your proposal is ready and waiting.</p>
          </div>

          <div style="text-align:center;">
            <a href="https://civicpath.ai/seeker" style="display:inline-block;background:#76B900;color:#111;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">Go to My Dashboard →</a>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px 24px;border-top:1px solid #E8E5DE;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9CA3AF;">
            © 2026 CivicPath · <a href="https://civicpath.ai/privacy" style="color:#76B900;text-decoration:none;">Privacy</a> · 
            <a href="https://civicpath.ai/terms" style="color:#76B900;text-decoration:none;">Terms</a>
          </p>
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
      subject: `✅ Your grant proposal is ready — ${grantName || 'Grant Application'}`,
      html,
      reply_to: 'hello@civicpath.ai',
    });
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('Resend submission confirmation error:', err);
    return res.status(200).json({ ok: true, note: err.message });
  }
}
