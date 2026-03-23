/**
 * merkle.ts — CivicPath Sovereign Data Integrity
 *
 * Implements SHA-256 Merkle tree for grant tracker entries.
 * Claim 1e-iii: Every grant has a cryptographic leaf hash; all leaves form
 * a Merkle root that is anchored to the 0G Labs DA Layer.
 *
 * Uses browser-native crypto.subtle — no external dependencies.
 */

// ── SHA-256 via crypto.subtle ──────────────────────────────────────────────
export async function sha256(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Merkle leaf for a grant entry ──────────────────────────────────────────
export interface GrantLeaf {
  id: string;
  title: string;
  agency: string;
  amount: string;
  status: string;
  closeDate: string;
  addedAt: string;
}

export async function grantLeafHash(g: GrantLeaf): Promise<string> {
  const canonical = [g.id, g.title, g.agency, g.amount, g.status, g.closeDate, g.addedAt].join('|');
  return sha256(canonical);
}

// ── Merkle tree builder ────────────────────────────────────────────────────
export async function buildMerkleRoot(leaves: string[]): Promise<string> {
  if (leaves.length === 0) return sha256('empty-tree');
  if (leaves.length === 1) return leaves[0];

  let level = [...leaves];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left; // duplicate last leaf if odd
      next.push(await sha256(left + right));
    }
    level = next;
  }
  return level[0];
}

// ── 0G Labs DA Layer mock receipt ─────────────────────────────────────────
// Simulates posting the Merkle root to 0G Labs Data Availability Layer.
// In production this would call the 0G RPC endpoint with the root hash.

export interface ZGReceipt {
  txHash: string;
  blockHeight: number;
  daLayer: '0G Labs';
  merkleRoot: string;
  timestamp: string;
  status: 'confirmed';
  gasUsed: string;
  dataSize: string;
}

/** Generate a deterministic-looking 0G Labs TX hash from a Merkle root */
function deriveTxHash(merkleRoot: string): string {
  // XOR fold the root into a 32-byte hex string for a stable mock hash
  const bytes = merkleRoot.match(/.{1,2}/g)!.map(h => parseInt(h, 16));
  const out = new Array(32).fill(0).map((_, i) => bytes[i % bytes.length] ^ bytes[(i * 7 + 13) % bytes.length]);
  return '0x' + out.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function simulateZGSync(merkleRoot: string): Promise<ZGReceipt> {
  // Simulate 1.2s network round-trip
  await new Promise(r => setTimeout(r, 1200));
  return {
    txHash: deriveTxHash(merkleRoot),
    blockHeight: 4_200_000 + Math.floor(Math.random() * 50_000),
    daLayer: '0G Labs',
    merkleRoot,
    timestamp: new Date().toISOString(),
    status: 'confirmed',
    gasUsed: (21_000 + Math.floor(Math.random() * 3000)).toLocaleString(),
    dataSize: '512 bytes',
  };
}

/** Truncate a hex hash for display: 0x5f3a...c9d2 */
export function truncateHash(hash: string, chars = 4): string {
  const clean = hash.startsWith('0x') ? hash.slice(2) : hash;
  return `0x${clean.slice(0, chars)}...${clean.slice(-chars)}`;
}
