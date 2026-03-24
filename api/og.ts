import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * OG image — returns a branded 1200x630 SVG for social sharing previews.
 * Works on LinkedIn, Slack, Discord, iMessage, WhatsApp.
 * Twitter/X requires PNG — use https://og-playground.vercel.app for a PNG upgrade.
 */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="75%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#76B900" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#111111" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="#111111"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <!-- CivicPath logo mark -->
  <g transform="translate(72, 72)">
    <path fill="#76B900" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
  </g>

  <!-- Brand name -->
  <text x="132" y="108" font-family="Arial,sans-serif" font-size="40" font-weight="900" fill="#ffffff" letter-spacing="-1">CivicPath</text>

  <!-- AI badge -->
  <rect x="330" y="78" width="46" height="26" rx="5" fill="#76B900"/>
  <text x="353" y="96" font-family="Arial,sans-serif" font-size="12" font-weight="900" fill="#111111" text-anchor="middle" letter-spacing="1">AI</text>

  <!-- Main headline -->
  <text x="600" y="290" font-family="Arial,sans-serif" font-size="72" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="-2">Find The Grant That Gets You.</text>

  <!-- Subline -->
  <text x="600" y="356" font-family="Arial,sans-serif" font-size="28" fill="#888888" text-anchor="middle">6 AI agents find, score, draft &amp; submit grants automatically.</text>
  <text x="600" y="394" font-family="Arial,sans-serif" font-size="28" fill="#888888" text-anchor="middle">First match in 60 seconds. Free to start.</text>

  <!-- Stats row -->
  <!-- $800B -->
  <rect x="170" y="446" width="180" height="84" rx="12" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1"/>
  <text x="260" y="493" font-family="Arial,sans-serif" font-size="28" font-weight="900" fill="#76B900" text-anchor="middle">$800B</text>
  <text x="260" y="516" font-family="Arial,sans-serif" font-size="13" fill="#666666" text-anchor="middle">Unclaimed Grants</text>

  <!-- 6 Agents -->
  <rect x="378" y="446" width="160" height="84" rx="12" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1"/>
  <text x="458" y="493" font-family="Arial,sans-serif" font-size="28" font-weight="900" fill="#76B900" text-anchor="middle">6</text>
  <text x="458" y="516" font-family="Arial,sans-serif" font-size="13" fill="#666666" text-anchor="middle">AI Agents</text>

  <!-- 60s -->
  <rect x="562" y="446" width="160" height="84" rx="12" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1"/>
  <text x="642" y="493" font-family="Arial,sans-serif" font-size="28" font-weight="900" fill="#76B900" text-anchor="middle">60s</text>
  <text x="642" y="516" font-family="Arial,sans-serif" font-size="13" fill="#666666" text-anchor="middle">First Match</text>

  <!-- Free -->
  <rect x="746" y="446" width="160" height="84" rx="12" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1"/>
  <text x="826" y="493" font-family="Arial,sans-serif" font-size="28" font-weight="900" fill="#76B900" text-anchor="middle">Free</text>
  <text x="826" y="516" font-family="Arial,sans-serif" font-size="13" fill="#666666" text-anchor="middle">To Start</text>

  <!-- Hackathon badge -->
  <rect x="940" y="446" width="240" height="84" rx="12" fill="#76B900" fill-opacity="0.12" stroke="#76B900" stroke-opacity="0.3" stroke-width="1"/>
  <text x="1060" y="487" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#76B900" text-anchor="middle">🏆 Google Cloud ADK</text>
  <text x="1060" y="508" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#76B900" text-anchor="middle">Hackathon 2026 · Finalist</text>

  <!-- Domain watermark -->
  <text x="1140" y="590" font-family="Arial,sans-serif" font-size="18" font-weight="600" fill="#444444" text-anchor="end">civicpath.ai</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  res.status(200).send(svg);
}
