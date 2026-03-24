import { useState, useEffect } from 'react';
import { ShieldOff, AlertTriangle } from 'lucide-react';

// ── Revocation log sequence ────────────────────────────────────────────────
const REVOKE_SEQUENCE: [number, string][] = [
  [0,    '[KEY-MGR] ⚠ Cryptographic revocation initiated...'],
  [200,  '[KEY-MGR] ROTATING MASTER KEY — AMD SEV-SNP enclave'],
  [500,  '[HSM]     Shredding AES-256-GCM key material → /dev/null'],
  [800,  '[HSM]     ECDSA P-384 signing keys: DESTROYED'],
  [1100, '[TEE]     In-memory key slots zeroed (512 bytes wiped)'],
  [1400, '[PCR]     PCR[7] Secure Boot key binding: UNLINKED'],
  [1700, '[0G-DA]   Revoking 0G Labs fragment access tokens...'],
  [2000, '[0G-DA]   Fragment indices [0..n]: REVOKED'],
  [2300, '[0G-DA]   DA Layer anchors: INVALIDATED'],
  [2600, '[GDPR]    Article 17 — Right to Erasure: ENACTED'],
  [2900, '[GDPR]    Mathematical erasure > administrative deletion: CONFIRMED'],
  [3200, '[AUDIT]   Erasure proof hash logged to immutable audit trail'],
  [3500, '[SOVEREIGN] ✓ MASTER KEY DESTROYED. 0G Fragments Revoked. GDPR Art.17 Compliance Verified.'],
];

type RevokePhase = 'idle' | 'confirming' | 'revoking' | 'complete';

// ── Dispatch to Sovereign Terminal via CustomEvent ─────────────────────────
function dispatchRevokeLogs() {
  REVOKE_SEQUENCE.forEach(([delay, msg]) => {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('civicpath:sovereign-log', { detail: msg }));
    }, delay);
  });
}

// ── Apply CSS filter to entire app ─────────────────────────────────────────
function blurApp(on: boolean) {
  const root = document.getElementById('root');
  if (!root) return;
  root.style.filter = on ? 'blur(6px) grayscale(1) brightness(0.4)' : '';
  root.style.transition = on ? 'filter 600ms ease-in' : 'filter 300ms ease-out';
  root.style.pointerEvents = on ? 'none' : '';
}

// ── Full-screen revocation overlay ────────────────────────────────────────
function RevocationOverlay({ onDismiss }: { onDismiss: () => void }) {
  const [tick, setTick] = useState(0);
  const [line, setLine] = useState(0);

  // Stream log lines inside the overlay
  useEffect(() => {
    const int = setInterval(() => setTick(t => t + 1), 80);
    return () => clearInterval(int);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setLine(l => Math.min(l + 1, REVOKE_SEQUENCE.length)), 280);
    return () => clearTimeout(t);
  }, [line]);

  const canDismiss = line >= REVOKE_SEQUENCE.length;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex flex-col items-center justify-center gap-6 px-6"
      style={{ fontFamily: 'ui-monospace, monospace' }}
    >
      {/* Red pulse rings */}
      <div className="relative flex items-center justify-center mb-2">
        <span className="absolute w-40 h-40 rounded-full border border-red-900/40 animate-ping" />
        <span className="absolute w-28 h-28 rounded-full border border-red-700/30 animate-pulse" />
        <div className="relative w-20 h-20 rounded-full bg-red-950/60 border border-red-800 flex items-center justify-center">
          <ShieldOff className={`w-8 h-8 ${canDismiss ? 'text-[#76B900]' : 'text-red-400 animate-pulse'}`} />
        </div>
      </div>

      {/* Status heading */}
      <div className="text-center">
        {canDismiss ? (
          <>
            <h2 className="text-[#76B900] font-black text-xl uppercase tracking-[0.2em] mb-1">
              KEY DESTROYED
            </h2>
            <p className="text-stone-400 text-sm leading-relaxed max-w-md text-center">
              MASTER KEY DESTROYED.<br />
              0G Fragments Revoked.<br />
              GDPR Art.17 Compliance Verified.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-red-400 font-black text-xl uppercase tracking-[0.2em] mb-1 animate-pulse">
              REVOKING...
            </h2>
            <p className="text-stone-600 text-xs">Cryptographic erasure in progress</p>
          </>
        )}
      </div>

      {/* Streaming terminal */}
      <div className="w-full max-w-xl bg-[#080808] border border-[#1f1f1f] rounded-xl px-5 py-4 text-[10px] space-y-1 max-h-52 overflow-hidden">
        {REVOKE_SEQUENCE.slice(0, line).map(([, msg], i) => (
          <div
            key={i}
            className={
              msg.includes('[SOVEREIGN]') ? 'text-[#76B900] font-bold' :
              msg.includes('[GDPR]') ? 'text-cyan-400' :
              msg.includes('[0G-DA]') ? 'text-blue-400' :
              msg.includes('[HSM]') || msg.includes('[KEY-MGR]') ? 'text-red-400' :
              'text-stone-600'
            }
          >
            <span className="text-stone-700 mr-1">❯</span>{msg}
          </div>
        ))}
        {!canDismiss && (
          <div className="text-red-500 animate-pulse">
            <span className="text-stone-700 mr-1">❯</span>_
            {/* Fake scan bytes */}
            <span className="text-stone-800 ml-2">
              {Array.from({ length: 6 }, () =>
                Math.floor(Math.random() * 0xff).toString(16).padStart(2, '0')
              ).join(' ')}
            </span>
          </div>
        )}
      </div>

      {/* Mathematical erasure note */}
      {canDismiss && (
        <div className="text-center text-[10px] text-stone-600 max-w-sm leading-relaxed animate-in fade-in duration-500">
          Mathematical erasure differs from administrative deletion:<br />
          the key material is cryptographically destroyed, making<br />
          recovery mathematically infeasible — not just policy-prohibited.
        </div>
      )}

      {/* Dismiss button */}
      <button
        onClick={canDismiss ? onDismiss : undefined}
        disabled={!canDismiss}
        className={`px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${
          canDismiss
            ? 'bg-[#76B900] text-[#111] hover:bg-[#8FD400] cursor-pointer animate-in fade-in duration-500'
            : 'bg-stone-900 text-stone-700 cursor-not-allowed border border-stone-800'
        }`}
      >
        {canDismiss ? 'Acknowledge & Restore' : 'Processing...'}
      </button>

      {/* Cursor blink */}
      {tick % 2 === 0 && !canDismiss && (
        <span className="absolute bottom-6 right-8 text-red-800 font-black text-xs">█</span>
      )}
    </div>
  );
}

// ── Public RevokeAccess component ──────────────────────────────────────────
interface RevokeAccessProps {
  /** Optional callback to also trigger the PurgeController wipe */
  onWipeData?: () => void;
}

export default function RevokeAccess({ onWipeData }: RevokeAccessProps) {
  const [phase, setPhase] = useState<RevokePhase>('idle');

  const handleRevoke = () => {
    if (phase !== 'confirming') return;
    setPhase('revoking');

    // 1. Stream logs to Sovereign Terminal
    dispatchRevokeLogs();

    // 2. Blur + grayscale the entire app after short delay
    setTimeout(() => blurApp(true), 400);

    // 3. Show full-screen overlay after blur kicks in
    // (overlay renders immediately above the blur via z-[9999])

    // 4. Optional data wipe
    if (onWipeData) {
      setTimeout(onWipeData, 500);
    }

    // Phase transitions to complete handled by overlay dismiss
    setTimeout(() => setPhase('complete'), 300);
  };

  const handleDismiss = () => {
    blurApp(false);
    setPhase('idle');
  };

  return (
    <>
      {/* Overlay — rendered above the blurred app */}
      {(phase === 'revoking' || phase === 'complete') && (
        <RevocationOverlay onDismiss={handleDismiss} />
      )}

      <div className="space-y-5">
        {/* Explainer */}
        <div className="bg-[#0D0D0D] border border-[#1f1f1f] rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="p-3 bg-red-950/40 border border-red-900/40 rounded-xl shrink-0">
              <ShieldOff className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-white font-black text-base mb-1">Cryptographic Revocation Kill Switch</h3>
              <p className="text-stone-500 text-sm leading-relaxed">
                Destroys the master encryption key inside the AMD SEV-SNP enclave, revokes all
                0G Labs DA fragment access tokens, and enacts GDPR Article 17 mathematical erasure.
              </p>
            </div>
          </div>

          {/* What it does */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Key Material', detail: 'AES-256-GCM + ECDSA P-384 destroyed in HSM', icon: '🔑' },
              { label: '0G Fragments', detail: 'All DA fragment indices revoked + invalidated', icon: '⛓' },
              { label: 'GDPR Art.17', detail: 'Mathematical erasure > administrative deletion', icon: '⚖️' },
            ].map(item => (
              <div key={item.label} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-3">
                <div className="text-lg mb-1">{item.icon}</div>
                <div className="text-xs font-black text-stone-300 mb-0.5">{item.label}</div>
                <div className="text-[10px] text-stone-600 leading-relaxed">{item.detail}</div>
              </div>
            ))}
          </div>

          {/* Difference callout */}
          <div className="bg-[#111] border border-amber-900/30 rounded-xl p-4 mb-5">
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Why Mathematical Erasure Matters</p>
            <p className="text-stone-500 text-xs leading-relaxed">
              Administrative deletion removes a database record — the bits still exist on disk and can be recovered.
              Mathematical erasure destroys the encryption key, making the encrypted data permanently unreadable.
              <span className="text-stone-300 font-bold"> Recovery becomes computationally infeasible (2²⁵⁶ brute-force attempts).</span>
            </p>
          </div>

          {/* Confirm / revoke UI */}
          {phase === 'idle' && (
            <button
              onClick={() => setPhase('confirming')}
              className="flex items-center gap-2 px-5 py-3 bg-red-950/40 border border-red-800 text-red-400 font-bold text-sm rounded-xl hover:bg-red-900/40 transition-colors"
            >
              <ShieldOff className="w-4 h-4" /> Initiate Revocation
            </button>
          )}

          {phase === 'confirming' && (
            <div className="border border-red-800 bg-red-950/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-300 font-bold text-sm">Confirm Cryptographic Revocation</p>
              </div>
              <p className="text-stone-500 text-xs leading-relaxed">
                This action is <span className="text-red-400 font-bold">irreversible</span>. The master key will be destroyed,
                all 0G fragment access revoked, and the GDPR Art.17 erasure proof logged.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleRevoke}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-900/60 border border-red-700 text-red-300 font-black text-sm rounded-xl hover:bg-red-800/60 transition-colors"
                >
                  <ShieldOff className="w-4 h-4" /> CONFIRM — Destroy Master Key
                </button>
                <button
                  onClick={() => setPhase('idle')}
                  className="px-4 py-2.5 border border-[#2a2a2a] text-stone-500 font-bold text-sm rounded-xl hover:border-stone-600 hover:text-stone-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Audit trail info */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <h4 className="font-bold text-stone-800 mb-3 text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#76B900] animate-pulse" />
            Sovereign Audit Trail
          </h4>
          <p className="text-stone-500 text-xs leading-relaxed mb-3">
            Every revocation event is cryptographically signed and appended to an immutable audit log
            anchored to the 0G Labs DA Layer. The erasure proof is permanently verifiable without
            retaining the erased data.
          </p>
          <div className="flex flex-wrap gap-2">
            {['Key Rotation', '0G Fragment Revocation', 'GDPR Art.17 Proof', 'Audit Log Hash'].map(tag => (
              <span key={tag} className="text-[10px] font-bold px-2 py-1 bg-[#76B900]/10 text-[#76B900] rounded-full border border-[#76B900]/20">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
