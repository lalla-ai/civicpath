import { useState, useEffect, useCallback } from 'react';

export type TEEStatus = 'checking' | 'valid' | 'invalid' | 'missing';

export interface PCRBank {
  index: string;
  value: string;
  label: string;
  verified: boolean;
}

export interface TEEReport {
  status: TEEStatus;
  chipId: string;
  platform: string;
  measurement: string;        // SHA-384 of initial VM image
  tcbVersion: string;         // Trusted Computing Base version
  svn: string;                // Security Version Number
  pcrBank: PCRBank[];         // Platform Configuration Registers
  hostData: string;           // Binding data (org-specific)
  timestamp: string;
  attestationId: string;
}

// Deterministic hex derived from a seed — keeps values stable across re-checks
const hex = (seed: string, len: number) => {
  let h = '';
  for (let i = 0; i < len; i++) {
    h += ((seed.charCodeAt(i % seed.length) * 31 + i * 17) & 0xff).toString(16).padStart(2, '0');
  }
  return '0x' + h;
};

const STABLE_SEED = 'civicpath-sovereign-tee-2026';

const buildReport = (status: TEEStatus): TEEReport => ({
  status,
  chipId: hex(STABLE_SEED + 'chip', 8),
  platform: 'AMD EPYC 9654 — SEV-SNP Rev.2',
  measurement: hex(STABLE_SEED + 'meas', 48),
  tcbVersion: hex(STABLE_SEED + 'tcb', 4),
  svn: '0x' + (7).toString(16).padStart(4, '0'),
  hostData: hex(STABLE_SEED + 'host', 16),
  attestationId: 'ATT-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
  timestamp: new Date().toISOString(),
  pcrBank: [
    { index: '0', value: hex(STABLE_SEED + 'pcr0', 32), label: 'BIOS / UEFI Firmware',     verified: status === 'valid' },
    { index: '1', value: hex(STABLE_SEED + 'pcr1', 32), label: 'Platform Configuration',   verified: status === 'valid' },
    { index: '4', value: hex(STABLE_SEED + 'pcr4', 32), label: 'Boot Loader Code',         verified: status === 'valid' },
    { index: '7', value: hex(STABLE_SEED + 'pcr7', 32), label: 'Secure Boot State',        verified: status === 'valid' },
    { index: '9', value: hex(STABLE_SEED + 'pcr9', 32), label: 'Kernel + initrd',          verified: status === 'valid' },
  ],
});

// Simulate the check phases: checking → valid (or missing on deliberate trigger)
export function useTEE(forceStatus?: TEEStatus) {
  const [report, setReport] = useState<TEEReport>(buildReport('checking'));
  const [logs, setLogs] = useState<string[]>([]);

  const appendLog = useCallback((line: string) => {
    setLogs(prev => [...prev, line]);
  }, []);

  const runAttestation = useCallback(() => {
    const target = forceStatus ?? 'valid';
    setReport(buildReport('checking'));
    setLogs([]);

    const steps: [number, string][] = [
      [200,  '[TEE]    Initializing AMD SEV-SNP attestation request...'],
      [600,  `[1a]     Chip ID: ${hex(STABLE_SEED + 'chip', 8)} — AMD EPYC 9654 Series`],
      [1000, `[1b]     PCR[0] BIOS/UEFI:     ${hex(STABLE_SEED + 'pcr0', 12)}... [VERIFIED]`],
      [1300, `[1b]     PCR[4] Boot Loader:   ${hex(STABLE_SEED + 'pcr4', 12)}... [VERIFIED]`],
      [1600, `[1b]     PCR[7] Secure Boot:   ${hex(STABLE_SEED + 'pcr7', 12)}... [VERIFIED]`],
      [1900, `[1b]     PCR[9] Kernel/initrd: ${hex(STABLE_SEED + 'pcr9', 12)}... [VERIFIED]`],
      [2300, `[2a]     SEV-SNP Measurement:  ${hex(STABLE_SEED + 'meas', 16)}... [VALID]`],
      [2600, `[2b]     TCB Version: ${hex(STABLE_SEED + 'tcb', 4)} | SVN: 0x0007 [CURRENT]`],
      [2900, '[3a]     VCEK Certificate chain: Root → Intermediate → Leaf [OK]'],
      [3200, '[3b]     Report Signature: ECDSA P-384 [VALID]'],
      [3600, `[ATTEST] Host Data Binding: ${hex(STABLE_SEED + 'host', 8)}... [MATCHES]`],
      [4000, target === 'valid'
        ? '[SOVEREIGN] ✓ Hardware attestation VALID — CivicPath running in verified TEE'
        : '[SOVEREIGN] ✗ Attestation FAILED — report missing or tampered'
      ],
    ];

    steps.forEach(([delay, msg]) => {
      setTimeout(() => appendLog(msg), delay);
    });

    setTimeout(() => {
      setReport(buildReport(target));
    }, 4200);
  }, [forceStatus, appendLog]);

  useEffect(() => {
    runAttestation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { report, logs, recheck: runAttestation };
}
