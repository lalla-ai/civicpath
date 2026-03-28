import type { VercelRequest, VercelResponse } from '@vercel/node';

function getSiteUrl(req: VercelRequest) {
  const configured = process.env.SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  const host = req.headers.host;
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  return `${proto}://${host}`;
}

function getRedirectUri(req: VercelRequest) {
  return (process.env.LINKEDIN_REDIRECT_URI?.trim() || `${getSiteUrl(req)}/linkedin/callback`).replace(/\/$/, '');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (req.method === 'GET') {
    const action = req.query.action;
    const state = typeof req.query.state === 'string' ? req.query.state : '';

    // Config probe — used by the frontend to decide OAuth vs paste fallback
    if (action === 'check') {
      return res.status(200).json({ configured: Boolean(clientId && clientSecret) });
    }

    if (action !== 'authorize') return res.status(400).json({ error: 'Unknown LinkedIn action' });
    if (!clientId) return res.status(500).json({ error: 'LINKEDIN_CLIENT_ID not configured' });
    if (!state) return res.status(400).json({ error: 'state required' });

    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', getRedirectUri(req));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('prompt', 'consent');
    return res.redirect(302, authUrl.toString());
  }

  if (req.method === 'POST') {
    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET not configured' });
    }

    const { action, code } = req.body || {};
    if (action !== 'exchange') return res.status(400).json({ error: 'Unknown LinkedIn action' });
    if (!code) return res.status(400).json({ error: 'code required' });

    const redirectUri = getRedirectUri(req);
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const tokenData = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenData.access_token) {
      return res.status(tokenRes.status || 500).json({
        error: tokenData.error_description || tokenData.error || 'LinkedIn token exchange failed',
      });
    }

    const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json().catch(() => ({}));
    if (!userRes.ok) {
      return res.status(userRes.status || 500).json({
        error: userData.message || userData.error_description || 'LinkedIn profile fetch failed',
      });
    }

    return res.status(200).json({
      profile: {
        sub: userData.sub || '',
        name: userData.name || '',
        givenName: userData.given_name || '',
        familyName: userData.family_name || '',
        picture: userData.picture || '',
        email: userData.email || '',
        emailVerified: Boolean(userData.email_verified),
        locale: userData.locale || '',
      },
      expiresIn: tokenData.expires_in || null,
      scope: tokenData.scope || 'openid profile email',
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
