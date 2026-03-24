/**
 * send-email.ts — Unified email dispatcher
 *
 * Replaces 4 separate routes (send-welcome-email, send-digest,
 * send-submission-confirmation, notify-approval) to stay within
 * Vercel Hobby's 12-function limit.
 *
 * POST /api/send-email
 * Body: { type: 'welcome' | 'digest' | 'confirmation' | 'approval', ...data }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { GoogleGenerativeAI } from '@google/generative-ai';

const LOGO_SVG = `<svg width="22" height="21" viewBox="0 0 48 46" fill="none"><path fill="#76B900" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/></svg>`;

const HEADER = (label = 'CivicPath') => `
<tr><td style="background:#1A1A1A;padding:24px 32px;">
  <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
    <td style="padding-right:8px;">${LOGO_SVG}</td>
    <td style="color:#fff;font-size:18px;font-weight:800;">CivicPath</td>
    <td style="padding-left:12px;color:#76B900;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">${label}</td>
  </tr></table>
</td></tr>`;

const FOOTER = `
<tr><td style="padding:16px 32px 24px;border-top:1px solid #E8E5DE;text-align:center;">
  <p style="margin:0;font-size:11px;color:#9CA3AF;">© 2026 CivicPath ·
    <a href="https://civicpath.ai/pricing" style="color:#76B900;text-decoration:none;">Manage subscription</a> ·
    <a href="https://civicpath.ai/privacy" style="color:#76B900;text-decoration:none;">Privacy</a>
  </p>
</td></tr>`;

function wrap(body: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F9F7F2;font-family:Inter,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F7F2;padding:32px 20px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #E8E5DE;overflow:hidden;">
      ${body}
    </table>
  </td></tr>
</table>
</body></html>`;
}

// ── Email builders ──────────────────────────────────────────────────────────

function buildWelcome(data: any): { subject: string; html: string } {
  const firstName = (data.name || 'there').split(' ')[0];
  const isSeeker = data.role !== 'funder';
  return {
    subject: `Welcome to CivicPath, ${firstName}! Your grant pipeline is ready 🏆`,
    html: wrap(`
      ${HEADER('Welcome')}
      <tr><td style="padding:40px;text-align:center;">
        <div style="display:inline-block;background:#76B90020;color:#76B900;font-size:12px;font-weight:700;padding:6px 16px;border-radius:100px;margin-bottom:20px;">
          🏆 Google Cloud ADK Hackathon 2026 · Finalist
        </div>
        <h1 style="margin:0 0 12px;font-size:28px;font-weight:900;color:#1A1A1A;">Welcome, ${firstName}! 🎉</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#6B6860;line-height:1.6;">
          ${isSeeker ? 'Your AI grant pipeline is ready. 6 agents are standing by to find, score, draft, and submit grants — automatically.' : 'Your funder dashboard is ready. Start posting grants and let AI match you with the best applicants.'}
        </p>
        <a href="https://civicpath.ai/${isSeeker ? 'seeker' : 'funder'}" style="display:inline-block;background:#76B900;color:#111;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;">
          ${isSeeker ? 'Find My Grants →' : 'Go to Funder Dashboard →'}
        </a>
      </td></tr>
      ${FOOTER}`),
  };
}

async function buildDigest(data: any, geminiKey: string): Promise<{ subject: string; html: string }> {
  const { email, name = 'there', profile } = data;
  const firstName = name.split(' ')[0];
  let grantRows = `<tr><td style="padding:12px 0;color:#6B6860;font-size:13px;">Visit your CivicPath dashboard to see this week's personalized matches.</td></tr>`;

  if (geminiKey && profile?.focusArea) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(`Suggest 5 specific grant opportunities for: org="${profile.companyName}", location="${profile.location || 'Florida'}", focus="${profile.focusArea}". Return ONLY JSON array: [{"name":"...","agency":"...","amount":"$X","deadline":"Month DD","why":"1 sentence"}]`);
      const raw = result.response.text().replace(/```json|```/g, '').trim();
      const grants = JSON.parse(raw);
      grantRows = grants.map((g: any) => `
        <tr><td style="padding:12px 0;border-bottom:1px solid #f0ede6;">
          <div style="font-weight:700;color:#1A1A1A;font-size:14px;">${g.name}</div>
          <div style="color:#6B6860;font-size:12px;margin-top:2px;">${g.agency} · ${g.amount} · Due: ${g.deadline}</div>
          <div style="color:#5a9000;font-size:12px;margin-top:4px;">${g.why}</div>
        </td></tr>`).join('');
    } catch {}
  }

  return {
    subject: `Your weekly grant matches, ${firstName} — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
    html: wrap(`
      ${HEADER('Weekly Digest')}
      <tr><td style="padding:32px;">
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1A1A1A;">Your grants for this week, ${firstName}</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#6B6860;">Based on your profile, here are 5 opportunities worth your attention right now.</p>
        <table width="100%" cellpadding="0" cellspacing="0">${grantRows}</table>
        <div style="margin-top:24px;text-align:center;">
          <a href="https://civicpath.ai/seeker" style="display:inline-block;background:#76B900;color:#111;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">Run Full Pipeline →</a>
        </div>
      </td></tr>
      ${FOOTER}`),
  };
}

function buildConfirmation(data: any): { subject: string; html: string } {
  const { name = 'there', orgName = 'Your Organization', grantName = 'Grant Application', amount, email } = data;
  const firstName = name.split(' ')[0];
  const now = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return {
    subject: `✅ Your grant proposal is ready — ${grantName}`,
    html: wrap(`
      ${HEADER('Proposal Confirmation')}
      <tr><td style="padding:32px;">
        <div style="font-size:40px;text-align:center;margin-bottom:16px;">✅</div>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1A1A1A;">Proposal prepared, ${firstName}!</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#6B6860;line-height:1.6;">Your AI-drafted grant proposal has been reviewed, approved, and packaged for submission.</p>
        <div style="background:#F9F7F2;border-radius:12px;padding:20px;margin-bottom:24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:6px 0;border-bottom:1px solid #E8E5DE;"><span style="font-size:11px;color:#9CA3AF;font-weight:700;text-transform:uppercase;">Organization</span><br/><span style="font-size:14px;color:#1A1A1A;font-weight:700;">${orgName}</span></td></tr>
            <tr><td style="padding:6px 0;border-bottom:1px solid #E8E5DE;"><span style="font-size:11px;color:#9CA3AF;font-weight:700;text-transform:uppercase;">Grant</span><br/><span style="font-size:14px;color:#1A1A1A;font-weight:700;">${grantName}</span></td></tr>
            ${amount ? `<tr><td style="padding:6px 0;border-bottom:1px solid #E8E5DE;"><span style="font-size:11px;color:#9CA3AF;font-weight:700;text-transform:uppercase;">Amount</span><br/><span style="font-size:14px;color:#76B900;font-weight:800;">${amount}</span></td></tr>` : ''}
            <tr><td style="padding:6px 0;"><span style="font-size:11px;color:#9CA3AF;font-weight:700;text-transform:uppercase;">Date Approved</span><br/><span style="font-size:14px;color:#1A1A1A;font-weight:700;">${now}</span></td></tr>
          </table>
        </div>
        <div style="text-align:center;">
          <a href="https://civicpath.ai/seeker" style="display:inline-block;background:#76B900;color:#111;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">Go to My Dashboard →</a>
        </div>
      </td></tr>
      ${FOOTER}`),
  };
}

function buildApproval(data: any): { subject: string; html: string } {
  const { seekerName = 'there', orgName = 'Your Organization', grantTitle = 'Grant Application', grantAmount = '', funderName = 'CivicPath Funder' } = data;
  const firstName = seekerName.split(' ')[0];
  return {
    subject: `🎉 Approved! Your grant application for "${grantTitle}"`,
    html: wrap(`
      ${HEADER('Award Notification')}
      <tr><td style="padding:40px;text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">🎉</div>
        <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;color:#1A1A1A;">You've been approved, ${firstName}!</h1>
        <p style="margin:0 0 28px;font-size:15px;color:#6B6860;line-height:1.6;"><strong>${funderName}</strong> has approved your grant application. 🏆</p>
        <div style="background:#F9F7F2;border-radius:12px;padding:20px;margin-bottom:24px;text-align:left;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:8px 0;border-bottom:1px solid #E8E5DE;"><span style="font-size:11px;color:#9CA3AF;font-weight:700;text-transform:uppercase;">Organization</span><br/><span style="font-size:14px;color:#1A1A1A;font-weight:700;">${orgName}</span></td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #E8E5DE;"><span style="font-size:11px;color:#9CA3AF;font-weight:700;text-transform:uppercase;">Grant</span><br/><span style="font-size:14px;color:#1A1A1A;font-weight:700;">${grantTitle}</span></td></tr>
            ${grantAmount ? `<tr><td style="padding:8px 0;border-bottom:1px solid #E8E5DE;"><span style="font-size:11px;color:#9CA3AF;font-weight:700;text-transform:uppercase;">Amount</span><br/><span style="font-size:16px;color:#76B900;font-weight:900;">${grantAmount}</span></td></tr>` : ''}
            <tr><td style="padding:8px 0;"><span style="font-size:11px;color:#9CA3AF;font-weight:700;text-transform:uppercase;">Approved By</span><br/><span style="font-size:14px;color:#1A1A1A;font-weight:700;">${funderName}</span></td></tr>
          </table>
        </div>
        <a href="https://civicpath.ai/seeker" style="display:inline-block;background:#76B900;color:#111;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;">View My Dashboard →</a>
      </td></tr>
      ${FOOTER}`),
  };
}

function buildCloseout(data: any): { subject: string; html: string } {
  const { grantTitle = 'Grant', orgName = 'Your Organization', merkleRoot = '', txHash = '', blockHeight = '' } = data;
  return {
    subject: `🔒 Sovereign Closeout Complete — ${grantTitle}`,
    html: wrap(`
      ${HEADER('Sovereign Closeout')}
      <tr><td style="padding:40px;">
        <div style="font-size:36px;text-align:center;margin-bottom:16px;">🔒</div>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#1A1A1A;text-align:center;">Closeout Complete</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#6B6860;text-align:center;line-height:1.6;">Your Audit Pack for <strong>${grantTitle}</strong> has been generated, anchored to 0G Labs, and downloaded.</p>
        <div style="background:#0D0D0D;border-radius:12px;padding:20px;margin-bottom:24px;font-family:monospace;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:6px 0;border-bottom:1px solid #1f1f1f;"><span style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:1px;">Organization</span><br/><span style="font-size:13px;color:#eee;font-weight:700;">${orgName}</span></td></tr>
            <tr><td style="padding:6px 0;border-bottom:1px solid #1f1f1f;"><span style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:1px;">Grant</span><br/><span style="font-size:13px;color:#eee;font-weight:700;">${grantTitle}</span></td></tr>
            <tr><td style="padding:6px 0;border-bottom:1px solid #1f1f1f;"><span style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:1px;">Merkle Root</span><br/><span style="font-size:11px;color:#76B900;">${merkleRoot}</span></td></tr>
            <tr><td style="padding:6px 0;border-bottom:1px solid #1f1f1f;"><span style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:1px;">0G Labs TX</span><br/><span style="font-size:11px;color:#67e8f9;">${txHash}</span></td></tr>
            <tr><td style="padding:6px 0;"><span style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:1px;">Block Height</span><br/><span style="font-size:13px;color:#eee;">${blockHeight}</span></td></tr>
          </table>
        </div>
        <div style="background:#76B90010;border:1px solid #76B90030;border-radius:10px;padding:14px;margin-bottom:24px;">
          <p style="margin:0;font-size:12px;color:#5a9000;font-weight:700;">🛡️ Sovereign Purge Executed</p>
          <p style="margin:6px 0 0;font-size:12px;color:#6B6860;">All in-memory GrantData has been cleared from the enclave. Your Audit Pack is the permanent record.</p>
        </div>
        <div style="text-align:center;">
          <a href="https://civicpath.ai/seeker" style="display:inline-block;background:#76B900;color:#111;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">View Dashboard →</a>
        </div>
      </td></tr>
      ${FOOTER}`),
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return res.status(200).json({ ok: true, note: 'RESEND_API_KEY not set — email skipped' });

  const { type, ...data } = req.body || {};
  if (!type) return res.status(400).json({ error: 'type required (welcome|digest|confirmation|approval)' });

  const to = data.email || data.seekerEmail;
  if (!to) return res.status(400).json({ error: 'email required' });

  const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

  try {
    let emailData: { subject: string; html: string };

    switch (type) {
      case 'welcome':      emailData = buildWelcome(data); break;
      case 'digest':       emailData = await buildDigest(data, geminiKey); break;
      case 'confirmation': emailData = buildConfirmation(data); break;
      case 'approval':     emailData = buildApproval(data); break;
      case 'closeout':     emailData = buildCloseout(data); break;
      default: return res.status(400).json({ error: `Unknown email type: ${type}` });
    }

    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: 'CivicPath <noreply@civicpath.ai>',
      to,
      subject: emailData.subject,
      html: emailData.html,
      reply_to: 'noreply@civicpath.ai',
    });

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error(`send-email [${type}] error:`, err);
    return res.status(200).json({ ok: true, note: err.message }); // never block the caller
  }
}
