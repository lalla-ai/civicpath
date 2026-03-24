import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

/**
 * cron-report-check.ts — Post-Award Compliance Watcher
 *
 * Runs daily at 8am UTC via Vercel cron.
 * Scans all users' awarded_grants for deadlines within 7 days (soft deadline = today).
 * Sends an alert email via Resend: "Your Q1 Financial Report is due in 7 days."
 * Requires FIREBASE_SERVICE_ACCOUNT + RESEND_API_KEY.
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return res.status(200).json({ ok: false, note: 'RESEND_API_KEY not set' });
  }

  let db: any;
  try {
    db = await getAdminDb();
  } catch (err: any) {
    return res.status(200).json({ ok: false, note: `Firebase Admin not configured: ${err.message}` });
  }

  const resend = new Resend(resendKey);
  const today = new Date();
  let alerted = 0;
  let scanned = 0;

  const usersSnap = await db.collection('users').get();

  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data();
    const userEmail = userData.profile?.email;
    const userName = userData.profile?.name || userData.profile?.companyName || 'there';
    if (!userEmail) continue;

    const grantsSnap = await db
      .collection('users').doc(userDoc.id)
      .collection('awarded_grants')
      .where('status', '==', 'active')
      .get();

    for (const grantDoc of grantsSnap.docs) {
      const grant = grantDoc.data();
      const upcoming = (grant.deadlines || []).filter((d: any) => {
        if (d.status !== 'upcoming') return false;
        const softDate = new Date(d.softDueDate || d.dueDate);
        const daysUntilSoft = Math.ceil((softDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilSoft >= 0 && daysUntilSoft <= 3; // alert when 3 days until soft deadline
      });

      if (upcoming.length === 0) continue;
      scanned++;

      const deadlineRows = upcoming.map((d: any) => {
        const daysLeft = Math.ceil((new Date(d.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0ede6;">
            <div style="font-size:16px;display:inline;">${d.type === 'financial' ? '💰' : d.type === 'final' ? '🏁' : d.type === 'narrative' ? '📝' : '📋'}</div>
            <div style="font-weight:700;color:#1A1A1A;font-size:14px;display:inline;margin-left:6px;">${d.title}</div>
            <div style="color:#6B6860;font-size:12px;margin-top:3px;">${grant.grantTitle} · ${d.period}</div>
            <div style="color:#DC2626;font-size:12px;font-weight:700;margin-top:3px;">⚠️ Due: ${d.dueDate} (${daysLeft} days) · Internal review by ${d.softDueDate}</div>
          </td>
        </tr>`;
      }).join('');

      try {
        await resend.emails.send({
          from: 'CivicPath Compliance <hello@civicpath.ai>',
          to: userEmail,
          subject: `⚠️ Action required: ${upcoming.length} report${upcoming.length > 1 ? 's' : ''} due soon — ${grant.grantTitle}`,
          html: `
<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F9F7F2;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F7F2;padding:32px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #E8E5DE;overflow:hidden;">
        <tr><td style="background:#111;padding:22px 32px;">
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
            <td style="padding-right:8px;"><svg width="22" height="21" viewBox="0 0 48 46" fill="none"><path fill="#76B900" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/></svg></td>
            <td style="color:#fff;font-size:17px;font-weight:800;">CivicPath</td>
            <td style="padding-left:12px;color:#DC2626;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Compliance Alert</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1A1A1A;">
            ⚠️ Report${upcoming.length > 1 ? 's' : ''} due soon, ${userName.split(' ')[0]}
          </h1>
          <p style="margin:0 0 24px;font-size:14px;color:#6B6860;">
            You have <strong>${upcoming.length} compliance report${upcoming.length > 1 ? 's' : ''}</strong> approaching their internal review deadline for <strong>${grant.grantTitle}</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">${deadlineRows}</table>
          <div style="margin-top:24px;text-align:center;">
            <a href="https://civicpath.ai/seeker" style="display:inline-block;background:#76B900;color:#111;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">
              Draft My Reports Now →
            </a>
          </div>
          <p style="margin-top:16px;font-size:12px;color:#9CA3AF;text-align:center;">
            Go to the <strong>Awarded</strong> tab in your dashboard to draft reports with AI.
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #E8E5DE;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9CA3AF;">© 2026 CivicPath · <a href="https://civicpath.ai/privacy" style="color:#76B900;text-decoration:none;">Privacy</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
          reply_to: 'hello@civicpath.ai',
        });
        alerted++;
      } catch (err) {
        console.error(`Report check alert failed for ${userEmail}:`, err);
      }
    }
  }

  return res.status(200).json({
    ok: true,
    alerted,
    scanned,
    timestamp: new Date().toISOString(),
  });
}
