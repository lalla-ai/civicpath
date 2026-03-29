import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODEL, getGeminiKey } from './_config.js';

/**
 * cron-watcher.ts — The Watcher Agent (real backend)
 *
 * Scheduled by vercel.json: runs daily at 9am UTC.
 * 1. Reads all user profiles from Firestore (needs FIREBASE_SERVICE_ACCOUNT)
 * 2. Fetches fresh grants from Grants.gov for each user's focus area
 * 3. Uses Gemini to score the top 5 matches
 * 4. Sends a personalized digest email via Resend to each active user
 */

async function getAdminDb() {
  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  if (getApps().length === 0) {
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!sa) throw new Error('FIREBASE_SERVICE_ACCOUNT not set');
    initializeApp({ credential: cert(JSON.parse(sa)) });
  }
  return getFirestore();
}

async function fetchGrantsForKeyword(keyword: string, location: string): Promise<any[]> {
  try {
    const r = await fetch('https://apply07.grants.gov/grantsws/rest/opportunities/search/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: `${keyword} ${location}`.trim(),
        oppStatuses: 'posted',
        rows: 8,
        sortBy: 'openDate|desc',
      }),
    });
    const d = await r.json();
    return (d.oppHits || []).map((g: any) => ({
      title: g.title,
      agency: g.agency,
      closeDate: g.closeDate || 'Rolling',
      url: `https://www.grants.gov/search-results-detail/${g.id}`,
    }));
  } catch {
    return [];
  }
}

async function scoreAndSummarize(
  geminiKey: string,
  profile: { companyName: string; focusArea: string; location: string; missionStatement?: string },
  grants: any[]
): Promise<string> {
  if (grants.length === 0) return 'No new grants found this week.';
  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const prompt = `You are a grant advisor. Briefly describe why each of these grants is a good match for this org.

Org: ${profile.companyName}, focus: ${profile.focusArea}, location: ${profile.location}
Mission: ${profile.missionStatement || 'Community impact'}

Grants:
${grants.map((g, i) => `${i + 1}. ${g.title} (${g.agency}) — Deadline: ${g.closeDate}`).join('\n')}

For each, give: grant name, 1-sentence reason it fits, and deadline. Keep it concise.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch {
    return grants.map(g => `• ${g.title} — ${g.agency} (Due: ${g.closeDate})`).join('\n');
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel passes Authorization: Bearer <CRON_SECRET> for scheduled invocations
  const auth = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const geminiKey = getGeminiKey() || '';
  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey) {
    return res.status(200).json({ ok: false, note: 'RESEND_API_KEY not set — skipping digest' });
  }

  let db: any;
  try {
    db = await getAdminDb();
  } catch (err: any) {
    return res.status(200).json({ ok: false, note: `Firebase Admin not configured: ${err.message}` });
  }

  // Load all users with a profile
  const usersSnap = await db.collection('users').get();
  const resend = new Resend(resendKey);
  let sent = 0;
  let skipped = 0;

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const profile = data.profile;
    if (!profile?.email || !profile?.focusArea) { skipped++; continue; }

    // Don't send if user hasn't been active recently (no companyName = never onboarded)
    if (!profile.companyName) { skipped++; continue; }

    try {
      const grants = await fetchGrantsForKeyword(profile.focusArea, profile.location || 'United States');
      if (grants.length === 0) { skipped++; continue; }

      const summary = await scoreAndSummarize(geminiKey, profile, grants.slice(0, 5));

      const grantRows = grants.slice(0, 5).map((g: any) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0ede6;">
            <div style="font-weight:700;color:#1A1A1A;font-size:14px;">${g.title}</div>
            <div style="color:#6B6860;font-size:12px;margin-top:2px;">${g.agency} · Due: ${g.closeDate}</div>
            <div style="margin-top:4px;"><a href="${g.url}" style="color:#76B900;font-size:12px;text-decoration:none;">View Grant →</a></div>
          </td>
        </tr>`).join('');

      const firstName = (profile.name || profile.companyName || 'there').split(' ')[0];
      const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F9F7F2;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F7F2;padding:32px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #E8E5DE;overflow:hidden;">
        <tr><td style="background:#111;padding:22px 32px;">
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
            <td style="padding-right:8px;"><svg width="22" height="21" viewBox="0 0 48 46" fill="none"><path fill="#76B900" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/></svg></td>
            <td style="color:#fff;font-size:17px;font-weight:800;">CivicPath</td>
            <td style="padding-left:12px;color:#76B900;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Watcher Alert</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1A1A1A;">
            👁️ New grants for you, ${firstName}
          </h1>
          <p style="margin:0 0 6px;font-size:14px;color:#6B6860;">
            The Watcher found <strong>${grants.length} new ${profile.focusArea} grants</strong> matching your profile.
          </p>
          <p style="margin:0 0 24px;font-size:12px;color:#9CA3AF;">
            ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">${grantRows}</table>
          ${summary ? `<div style="margin-top:20px;padding:16px;background:#76B90008;border:1px solid #76B90020;border-radius:10px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#5a9000;">✨ MyLalla's analysis</p>
            <p style="margin:0;font-size:12px;color:#6B6860;line-height:1.6;white-space:pre-line;">${summary.slice(0, 500)}</p>
          </div>` : ''}
          <div style="margin-top:24px;text-align:center;">
            <a href="https://civicpath.ai/seeker" style="display:inline-block;background:#76B900;color:#111;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
              Run Full Pipeline →
            </a>
          </div>
        </td></tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #E8E5DE;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9CA3AF;">© 2026 CivicPath · <a href="https://civicpath.ai/privacy" style="color:#76B900;text-decoration:none;">Privacy</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

      await resend.emails.send({
        from: 'CivicPath Watcher <noreply@civicpath.ai>',
        to: profile.email,
        subject: `👁️ ${grants.length} new ${profile.focusArea} grants found for ${profile.companyName}`,
        html,
        replyTo: 'noreply@civicpath.ai',
      });
      sent++;
    } catch (err) {
      console.error(`Watcher: failed for ${profile.email}:`, err);
      skipped++;
    }
  }

  return res.status(200).json({
    ok: true,
    sent,
    skipped,
    total: usersSnap.size,
    timestamp: new Date().toISOString(),
  });
}
