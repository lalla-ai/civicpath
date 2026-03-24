/**
 * zeroGStorage.ts — 0G Labs Decentralized Storage Slot
 *
 * Patent Reference: FIG.1 [112a] 0G Labs DA Layer
 *                   "Decentralized Storage · Merkle Anchoring"
 *                   FIG.2 [204] "Retrieve & Verify Context — SHA-256 Merkle Verify"
 *                   FIG.2 [208] "Encrypt & Anchor New Context — AES-256-GCM · 0G Labs DA Layer"
 *
 * Activation Slot Architecture:
 *   TODAY  → Deterministic simulation (cryptographically correct receipt)
 *   TOMORROW → Set ZG_RPC_URL env var → instantly anchors to live 0G blockchain
 *
 * The RPC URL must be server-side only. This module calls /api/sovereign
 * which handles the real network call when ZG_RPC_URL is configured.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ZGAnchorRequest {
  merkleRoot: string;
  /** Optional: additional content hash to anchor alongside the Merkle root */
  contentHash?: string;
  /** Optional: metadata stored with the anchor */
  metadata?: Record<string, string>;
}

export interface ZGReceipt {
  txHash: string;
  blockHeight: number;
  daLayer: '0G Labs' | '0G Labs (simulated)';
  merkleRoot: string;
  timestamp: string;
  status: 'confirmed' | 'simulated';
  gasUsed: string;
  dataSize: string;
  /** 'mainnet' | 'testnet' | 'simulation' */
  networkMode: 'mainnet' | 'testnet' | 'simulation';
}

export interface ZGVerifyResult {
  verified: boolean;
  txHash: string;
  receipt?: ZGReceipt;
  networkMode: ZGReceipt['networkMode'];
}

// ── Core functions ─────────────────────────────────────────────────────────────

/**
 * Anchor a Merkle root to the 0G Labs DA layer.
 *
 * FIG.2 Step [208]: "Encrypt & Anchor New Context — AES-256-GCM · 0G Labs DA Layer"
 *
 * Activation: set ZG_RPC_URL in Vercel environment variables.
 * Examples:
 *   Testnet: https://evmrpc-testnet.0g.ai
 *   Mainnet: https://evmrpc.0g.ai  (when available)
 */
export async function anchorToBlockchain(request: ZGAnchorRequest): Promise<ZGReceipt> {
  const res = await fetch('/api/sovereign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'anchor-0g',
      merkleRoot: request.merkleRoot,
      contentHash: request.contentHash,
      metadata: request.metadata,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`[0G] Anchor error: ${data.error}`);
  return data.receipt as ZGReceipt;
}

/**
 * Verify a previously anchored Merkle root.
 *
 * FIG.2 Step [204]: "Retrieve & Verify Context — 0G Labs · SHA-256 Merkle Verify"
 */
export async function verifyAnchor(txHash: string): Promise<ZGVerifyResult> {
  const res = await fetch('/api/sovereign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'verify-0g', txHash }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`[0G] Verify error: ${data.error}`);
  return {
    verified: data.verified,
    txHash,
    receipt: data.receipt,
    networkMode: data.networkMode || 'simulation',
  };
}

// ── Utility ───────────────────────────────────────────────────────────────────

/** Truncate a hex hash for display: 0x5f3a...c9d2 */
export function truncate0GHash(hash: string, chars = 6): string {
  const clean = hash.startsWith('0x') ? hash.slice(2) : hash;
  return `0x${clean.slice(0, chars)}...${clean.slice(-chars)}`;
}

/** Format a ZGReceipt for terminal display */
export function formatReceiptLog(receipt: ZGReceipt): string[] {
  return [
    `[0G] ${receipt.status === 'confirmed' ? 'ANCHOR-VERIFIED' : 'ANCHOR-SIMULATED'} ✓`,
    `[0G] TX: ${truncate0GHash(receipt.txHash)} · Block ${receipt.blockHeight.toLocaleString()}`,
    `[0G] DA Layer: ${receipt.daLayer} · Mode: ${receipt.networkMode}`,
    `[0G] Gas: ${receipt.gasUsed} · Data: ${receipt.dataSize}`,
  ];
}
