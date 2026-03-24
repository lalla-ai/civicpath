// @ts-nocheck
import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#111111',
          fontFamily: 'sans-serif',
          padding: '60px',
        }}
      >
        {/* Background glow */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex',
          background: 'radial-gradient(ellipse at 70% 50%, rgba(118,185,0,0.12) 0%, transparent 60%)',
        }} />

        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
          <svg width="52" height="50" viewBox="0 0 48 46" fill="none">
            <path fill="#76B900" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
          </svg>
          <span style={{ color: '#ffffff', fontSize: '42px', fontWeight: '900', letterSpacing: '-1px' }}>
            CivicPath
          </span>
          <div style={{
            background: '#76B900',
            color: '#111',
            fontSize: '14px',
            fontWeight: '900',
            padding: '4px 12px',
            borderRadius: '6px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginLeft: '8px',
          }}>
            AI
          </div>
        </div>

        {/* Headline */}
        <div style={{
          color: '#ffffff',
          fontSize: '68px',
          fontWeight: '900',
          textAlign: 'center',
          lineHeight: 1.05,
          letterSpacing: '-2px',
          maxWidth: '900px',
          marginBottom: '24px',
        }}>
          Find The Grant That Gets You.
        </div>

        {/* Subline */}
        <div style={{
          color: '#888888',
          fontSize: '28px',
          textAlign: 'center',
          maxWidth: '780px',
          lineHeight: 1.4,
          marginBottom: '48px',
        }}>
          6 AI agents find, score, draft &amp; submit grants automatically.
          First match in 60 seconds.
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '32px' }}>
          {[
            { n: '$800B', l: 'Unclaimed Grants' },
            { n: '6', l: 'AI Agents' },
            { n: '60s', l: 'First Match' },
            { n: 'Free', l: 'To Start' },
          ].map((s, i) => (
            <div key={i} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: '14px',
              padding: '16px 28px',
            }}>
              <span style={{ color: '#76B900', fontSize: '30px', fontWeight: '900' }}>{s.n}</span>
              <span style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>{s.l}</span>
            </div>
          ))}
        </div>

        {/* URL badge */}
        <div style={{
          position: 'absolute',
          bottom: '40px',
          right: '60px',
          color: '#444',
          fontSize: '18px',
          fontWeight: '600',
        }}>
          civicpath.ai
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
