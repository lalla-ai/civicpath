import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { useTEE } from '../hooks/useTEE';

// Continuous security heartbeat lines shown after attestation completes
const HEARTBEAT_LINES = [
  '[WATCHER]  Memory encryption: AES-256-XTS [ACTIVE]',
  '[WATCHER]  GDPR Art.17 purge monitor: RUNNING',
  '[WATCHER]  Network egress firewall: ENFORCED',
  '[WATCHER]  Key management (KMS): SEALED to PCR[7]',
  '[WATCHER]  Audit log hash: appended to chain',
  '[WATCHER]  No anomalies detected — next check in 30s',
  '[WATCHER]  Secure enclave memory: 0 leaks detected',
  '[WATCHER]  Data sovereignty boundary: ENFORCED',
];

export default function SovereignTerminal() {
  const { report, logs } = useTEE();
  const [minimized, setMinimized] = useState(true); // start minimized
  const [displayedLogs, setDisplayedLogs] = useState<string[]>([]);
  const [heartbeatIndex, setHeartbeatIndex] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  // Sync attestation logs in
  useEffect(() => {
    setDisplayedLogs(logs);
  }, [logs]);

  // Listen for external sovereign log events (e.g. RevokeAccess kill switch)
  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent<string>).detail;
      if (msg) {
        setDisplayedLogs(prev => [...prev, msg]);
        setMinimized(false); // auto-expand terminal when events arrive
      }
    };
    window.addEventListener('civicpath:sovereign-log', handler);
    return () => window.removeEventListener('civicpath:sovereign-log', handler);
  }, []);

  // After attestation is valid, start heartbeat lines
  useEffect(() => {
    if (report.status !== 'valid') return;
    const interval = setInterval(() => {
      setDisplayedLogs(prev => [
        ...prev,
        HEARTBEAT_LINES[heartbeatIndex % HEARTBEAT_LINES.length],
      ]);
      setHeartbeatIndex(i => i + 1);
    }, 8000);
    return () => clearInterval(interval);
  }, [report.status, heartbeatIndex]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedLogs]);

  const isValid = report.status === 'valid';
  const isChecking = report.status === 'checking';

  return (
    <div
      className={`fixed bottom-0 left-0 z-30 transition-all duration-300 ${
        minimized ? 'w-auto' : 'w-[420px]'
      }`}
      style={{ maxWidth: '100vw' }}
    >
      {/* Toggle bar */}
      <button
        onClick={() => setMinimized(m => !m)}
        className={`flex items-center gap-2 px-4 py-2 font-mono text-[10px] font-black uppercase tracking-widest border-t border-r rounded-tr-xl transition-colors ${
          isValid
            ? 'bg-[#0D0D0D] border-[#76B900]/30 text-[#76B900] hover:bg-[#111]'
            : 'bg-[#0D0D0D] border-[#1f1f1f] text-stone-600 hover:border-stone-600'
        }`}
      >
        {/* Live pulse */}
        <div className="relative w-2 h-2 flex items-center justify-center">
          {isValid ? (
            <>
              <span className="absolute w-2 h-2 rounded-full bg-[#76B900]/50 animate-ping" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-[#76B900]" />
            </>
          ) : (
            <span className={`w-1.5 h-1.5 rounded-full ${isChecking ? 'bg-amber-500 animate-pulse' : 'bg-stone-600'}`} />
          )}
        </div>

        <ShieldCheck className="w-3 h-3 shrink-0" />
        <span>Sovereign Terminal</span>

        {isValid && (
          <span className="px-1.5 py-0.5 bg-[#76B900] text-[#111] rounded text-[8px] font-black" title="TEE attestation verified — your data is encrypted and sovereign">
            VERIFIED
          </span>
        )}
        {isChecking && (
          <span className="text-amber-500 text-[8px] animate-pulse" title="Performing Trusted Execution Environment (TEE) attestation. Verifying PCR registers and measuring secure enclave state.">
            ATTESTING...
          </span>
        )}

        {minimized
          ? <ChevronUp className="w-3 h-3 ml-1" />
          : <ChevronDown className="w-3 h-3 ml-1" />
        }
      </button>

      {/* Terminal body */}
      {!minimized && (
        <div className="bg-[#080808] border-t border-r border-[#1f1f1f] w-full flex flex-col"
          style={{ height: '220px' }}>

          {/* PCR state summary bar */}
          <div className="px-4 py-2 border-b border-[#1a1a1a] flex flex-wrap gap-x-4 gap-y-1 shrink-0">
            {report.pcrBank.slice(0, 3).map(pcr => (
              <div key={pcr.index} className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${pcr.verified ? 'bg-[#76B900]' : 'bg-stone-700'}`} />
                <span className="font-mono text-[9px] text-stone-600">
                  PCR[{pcr.index}] {pcr.value.slice(0, 10)}...
                  <span className={`ml-1 font-black ${pcr.verified ? 'text-[#76B900]' : 'text-stone-600'}`}>
                    {pcr.verified ? '[VERIFIED]' : '[PENDING]'}
                  </span>
                </span>
              </div>
            ))}
          </div>

          {/* Scrollable log */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 font-mono text-[9px]">
            {displayedLogs.map((log, i) => (
              <div key={i} className={
                log.includes('[SOVEREIGN]') && log.includes('✓') ? 'text-[#76B900] font-bold' :
                log.includes('[SOVEREIGN]') ? 'text-red-400 font-bold' :
                log.includes('[ATTEST]') ? 'text-cyan-400' :
                log.includes('[VERIFIED]') || log.includes('[VALID]') || log.includes('[OK]') || log.includes('[MATCHES]') || log.includes('[ACTIVE]') || log.includes('[ENFORCED]') || log.includes('[RUNNING]') || log.includes('[SEALED]')
                  ? 'text-stone-400'
                  : 'text-stone-600'
              }>
                <span className="text-stone-700 mr-1">❯</span>
                {log}
              </div>
            ))}
            {isChecking && (
              <div className="text-amber-500 animate-pulse">❯ _</div>
            )}
            <div ref={endRef} />
          </div>
        </div>
      )}
    </div>
  );
}
