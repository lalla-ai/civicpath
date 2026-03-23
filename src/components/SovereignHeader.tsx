import { useState } from 'react';
import { ShieldCheck, ShieldAlert, Loader2, X, RefreshCw, Lock } from 'lucide-react';
import { useTEE } from '../hooks/useTEE';
import type { TEEStatus } from '../hooks/useTEE';

// ── Lock screen shown when attestation is missing / failed ──────────────────
function LockScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] bg-[#0a0a0a] flex flex-col items-center justify-center gap-6 animate-in fade-in duration-300">
      {/* Animated red pulse ring */}
      <div className="relative flex items-center justify-center">
        <span className="absolute w-32 h-32 rounded-full border-2 border-red-500/30 animate-ping" />
        <span className="absolute w-24 h-24 rounded-full border border-red-500/20 animate-pulse" />
        <div className="relative w-20 h-20 rounded-full bg-red-950/80 border border-red-800 flex items-center justify-center">
          <Lock className="w-9 h-9 text-red-400" />
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-red-400 font-black text-xl uppercase tracking-widest mb-2">
          Attestation Failed
        </h2>
        <p className="text-stone-500 text-sm font-mono max-w-xs">
          AMD SEV-SNP report could not be verified.<br />
          Access to sovereign infrastructure is blocked.
        </p>
      </div>

      {/* Terminal error readout */}
      <div className="bg-[#111] border border-red-900/50 rounded-xl px-6 py-4 font-mono text-xs text-red-400 w-80 space-y-1">
        <div>{'>'} Error: missing_attestation_report</div>
        <div>{'>'} PCR validation: FAILED</div>
        <div>{'>'} VCEK chain: UNTRUSTED</div>
        <div className="text-stone-600">{'>'} Code: SEV_SNP_E_INVALID_REPORT (0xFFFF)</div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-900/40 border border-red-700 text-red-300 font-bold text-sm rounded-xl hover:bg-red-800/40 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Retry Attestation
        </button>
      </div>
    </div>
  );
}

// ── Attestation detail modal ─────────────────────────────────────────────────
function AttestationModal({ report, logs, onClose, onRecheck }: {
  report: ReturnType<typeof useTEE>['report'];
  logs: string[];
  onClose: () => void;
  onRecheck: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[150] bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#0D0D0D] border border-[#2a2a2a] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1f1f1f] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-[#76B900]" />
            <div>
              <h3 className="text-white font-black text-sm tracking-wide">AMD SEV-SNP Attestation Report</h3>
              <p className="text-stone-600 text-[10px] font-mono mt-0.5">ID: {report.attestationId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onRecheck}
              className="p-2 text-stone-600 hover:text-[#76B900] transition-colors rounded-lg hover:bg-[#76B900]/10"
              title="Re-run attestation"
            >
              <RefreshCw className={`w-4 h-4 ${report.status === 'checking' ? 'animate-spin text-[#76B900]' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 text-stone-600 hover:text-stone-300 transition-colors rounded-lg hover:bg-[#1f1f1f]">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Status banner */}
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border font-mono text-sm ${
            report.status === 'valid' ? 'bg-[#76B900]/8 border-[#76B900]/30 text-[#76B900]' :
            report.status === 'checking' ? 'bg-stone-900 border-stone-700 text-stone-400' :
            'bg-red-950/40 border-red-800 text-red-400'
          }`}>
            {report.status === 'checking'
              ? <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              : report.status === 'valid'
              ? <span className="w-2 h-2 rounded-full bg-[#76B900] animate-pulse shrink-0" />
              : <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            }
            <span className="font-black uppercase tracking-wider text-xs">
              {report.status === 'checking' ? 'Running attestation check...'
               : report.status === 'valid' ? '✓ Hardware Attestation VALID — CivicPath runs in verified AMD SEV-SNP TEE'
               : '✗ Attestation FAILED — report missing or tampered'}
            </span>
          </div>

          {/* Report fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Platform', value: report.platform },
              { label: 'Chip ID', value: report.chipId },
              { label: 'TCB Version', value: report.tcbVersion },
              { label: 'SVN', value: report.svn },
              { label: 'Attestation ID', value: report.attestationId },
              { label: 'Timestamp', value: new Date(report.timestamp).toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#111] rounded-xl px-4 py-3 border border-[#1f1f1f]">
                <div className="text-[9px] font-black text-stone-600 uppercase tracking-widest mb-1">{label}</div>
                <div className="font-mono text-[11px] text-stone-300 truncate">{value}</div>
              </div>
            ))}
          </div>

          {/* Measurement */}
          <div className="bg-[#111] rounded-xl px-4 py-3 border border-[#1f1f1f]">
            <div className="text-[9px] font-black text-stone-600 uppercase tracking-widest mb-1">SEV-SNP Measurement (SHA-384)</div>
            <div className="font-mono text-[10px] text-[#76B900] break-all leading-relaxed">{report.measurement}</div>
          </div>

          {/* PCR bank */}
          <div>
            <div className="text-[9px] font-black text-stone-600 uppercase tracking-widest mb-2">Platform Configuration Registers</div>
            <div className="space-y-2">
              {report.pcrBank.map(pcr => (
                <div key={pcr.index} className="flex items-center gap-3 bg-[#111] rounded-xl px-4 py-2.5 border border-[#1f1f1f]">
                  <span className="text-[10px] font-black text-stone-500 w-12 shrink-0">PCR[{pcr.index}]</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] text-stone-600 mb-0.5">{pcr.label}</div>
                    <div className="font-mono text-[10px] text-stone-400 truncate">{pcr.value.slice(0, 42)}...</div>
                  </div>
                  <span className={`text-[9px] font-black uppercase shrink-0 px-2 py-0.5 rounded-full ${
                    pcr.verified ? 'text-[#76B900] bg-[#76B900]/10' : 'text-stone-600 bg-stone-800'
                  }`}>
                    {pcr.verified ? 'VERIFIED' : 'PENDING'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Live attestation log */}
          {logs.length > 0 && (
            <div>
              <div className="text-[9px] font-black text-stone-600 uppercase tracking-widest mb-2">Attestation Log</div>
              <div className="bg-[#080808] rounded-xl p-4 border border-[#1f1f1f] font-mono text-[10px] space-y-1.5 max-h-40 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i} className={
                    log.includes('[SOVEREIGN]') && log.includes('✓') ? 'text-[#76B900] font-bold' :
                    log.includes('[SOVEREIGN]') ? 'text-red-400 font-bold' :
                    log.includes('[ATTEST]') ? 'text-cyan-400' :
                    log.includes('[VERIFIED]') || log.includes('[VALID]') || log.includes('[OK]') || log.includes('[MATCHES]') ? 'text-stone-300' :
                    'text-stone-600'
                  }>
                    <span className="text-stone-700 mr-1">{'>'}</span>{log}
                  </div>
                ))}
                {report.status === 'checking' && (
                  <div className="text-[#76B900] animate-pulse">{'>'} _</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Public badge component ───────────────────────────────────────────────────
interface SovereignHeaderProps {
  forceStatus?: TEEStatus; // for testing — omit in production
}

export default function SovereignHeader({ forceStatus }: SovereignHeaderProps) {
  const { report, logs, recheck } = useTEE(forceStatus);
  const [showModal, setShowModal] = useState(false);

  // Lock screen for missing / invalid attestation
  if (report.status === 'missing' || report.status === 'invalid') {
    return <LockScreen onRetry={recheck} />;
  }

  const isChecking = report.status === 'checking';
  const isValid = report.status === 'valid';

  return (
    <>
      {/* Compact attestation badge */}
      <button
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-[10px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98] ${
          isValid
            ? 'bg-[#76B900]/10 border-[#76B900]/30 text-[#76B900] hover:bg-[#76B900]/15'
            : 'bg-stone-900 border-stone-700 text-stone-500 hover:border-stone-500'
        }`}
        title="View AMD SEV-SNP attestation report"
      >
        {/* Status indicator */}
        <div className="relative flex items-center justify-center w-3 h-3">
          {isChecking ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : isValid ? (
            <>
              <span className="absolute w-3 h-3 rounded-full bg-[#76B900]/50 animate-ping" />
              <span className="relative w-2 h-2 rounded-full bg-[#76B900]" />
            </>
          ) : (
            <ShieldAlert className="w-3 h-3 text-red-400" />
          )}
        </div>

        {/* Label */}
        <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${isValid ? 'text-[#76B900]' : 'text-stone-600'}`} />
        <span className="uppercase tracking-widest">
          {isChecking ? 'Attesting...' : isValid ? 'TEE · [VALID]' : 'TEE · [FAILED]'}
        </span>
        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider ${
          isValid ? 'bg-[#76B900] text-[#111]' : 'bg-stone-800 text-stone-500'
        }`}>
          {isChecking ? '...' : isValid ? 'AMD SEV-SNP' : 'ERROR'}
        </span>
      </button>

      {/* Detail modal */}
      {showModal && (
        <AttestationModal
          report={report}
          logs={logs}
          onClose={() => setShowModal(false)}
          onRecheck={() => { recheck(); }}
        />
      )}
    </>
  );
}
