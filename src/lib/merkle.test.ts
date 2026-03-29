/**
 * merkle.test.ts — GrantClaw Notary QA
 *
 * Protocol 2: Deterministic Validation
 * - SHA-256 output must match known reference vectors (0% drift allowed)
 * - grantLeafHash must be deterministic across calls
 * - Merkle root must be stable for same leaf set
 * - truncateHash must produce correct display format
 */

import { describe, it, expect } from 'vitest';
import { sha256, grantLeafHash, buildMerkleRoot, truncateHash } from './merkle';
import type { GrantLeaf } from './merkle';

// ── Protocol 2a: SHA-256 reference vector ────────────────────────────────────
// Known: SHA-256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
// Known: SHA-256("abc") = ba7816bf8f01cfea414140de5dae2ec73b00361bbef0469f492c344df720910a
describe('SHA-256 Notary — reference vectors', () => {
  it('produces correct hash for empty string', async () => {
    const result = await sha256('');
    expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('matches Node native SHA-256 for "abc"', async () => {
    // Use Node's built-in crypto as ground truth for the reference vector
    const { createHash } = await import('node:crypto');
    const expected = createHash('sha256').update('abc').digest('hex');
    const result = await sha256('abc');
    expect(result).toBe(expected);
  });

  it('produces 64-char lowercase hex output', async () => {
    const result = await sha256('civicpath-grantclaw');
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic — same input always same output', async () => {
    const a = await sha256('test-grant-data');
    const b = await sha256('test-grant-data');
    expect(a).toBe(b);
  });

  it('is collision-resistant — different inputs produce different hashes', async () => {
    const a = await sha256('grant-A');
    const b = await sha256('grant-B');
    expect(a).not.toBe(b);
  });
});

// ── Protocol 2b: Grant Leaf Notary ───────────────────────────────────────────
const MOCK_GRANT: GrantLeaf = {
  id: 'nsf-001',
  title: 'NSF SBIR Phase I: AI-Driven Civic Technology',
  agency: 'National Science Foundation',
  amount: '$305,000',
  status: 'saved',
  closeDate: '2026-07-15',
  addedAt: '2026-03-29',
};

describe('grantLeafHash — deterministic notary', () => {
  it('produces a 64-char hex hash for a grant', async () => {
    const hash = await grantLeafHash(MOCK_GRANT);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic across calls', async () => {
    const a = await grantLeafHash(MOCK_GRANT);
    const b = await grantLeafHash(MOCK_GRANT);
    expect(a).toBe(b);
  });

  it('changes when any field changes (tamper detection)', async () => {
    const original = await grantLeafHash(MOCK_GRANT);
    const tampered = await grantLeafHash({ ...MOCK_GRANT, amount: '$999,999' });
    expect(original).not.toBe(tampered);
  });

  it('changes when status changes', async () => {
    const saved = await grantLeafHash({ ...MOCK_GRANT, status: 'saved' });
    const won = await grantLeafHash({ ...MOCK_GRANT, status: 'won' });
    expect(saved).not.toBe(won);
  });
});

// ── Protocol 2c: Merkle Tree Builder ─────────────────────────────────────────
describe('buildMerkleRoot — Merkle tree integrity', () => {
  it('handles empty tree deterministically', async () => {
    const root = await buildMerkleRoot([]);
    // SHA-256("empty-tree")
    expect(root).toMatch(/^[0-9a-f]{64}$/);
    const root2 = await buildMerkleRoot([]);
    expect(root).toBe(root2);
  });

  it('returns leaf itself for single-leaf tree', async () => {
    const leaf = await sha256('single-grant');
    const root = await buildMerkleRoot([leaf]);
    expect(root).toBe(leaf);
  });

  it('combines two leaves correctly', async () => {
    const a = await sha256('grant-A');
    const b = await sha256('grant-B');
    const root = await buildMerkleRoot([a, b]);
    const expected = await sha256(a + b);
    expect(root).toBe(expected);
  });

  it('handles odd number of leaves (duplicates last leaf)', async () => {
    const leaves = await Promise.all(['A', 'B', 'C'].map(l => sha256(l)));
    const root = await buildMerkleRoot(leaves);
    expect(root).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for same leaf set', async () => {
    const leaves = await Promise.all(['grant-1', 'grant-2', 'grant-3', 'grant-4'].map(l => sha256(l)));
    const root1 = await buildMerkleRoot([...leaves]);
    const root2 = await buildMerkleRoot([...leaves]);
    expect(root1).toBe(root2);
  });

  it('root changes if any leaf changes (tamper detection)', async () => {
    const original = await Promise.all(['A', 'B', 'C'].map(l => sha256(l)));
    const tampered = await Promise.all(['A', 'B-TAMPERED', 'C'].map(l => sha256(l)));
    const root1 = await buildMerkleRoot(original);
    const root2 = await buildMerkleRoot(tampered);
    expect(root1).not.toBe(root2);
  });
});

// ── Protocol 2d: truncateHash display ────────────────────────────────────────
describe('truncateHash — display format', () => {
  const FULL_HASH = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';

  it('produces 0x{n}...{n} format', () => {
    const result = truncateHash(FULL_HASH, 4);
    expect(result).toBe('0xa1b2...a1b2');
  });

  it('handles 0x-prefixed input', () => {
    const result = truncateHash('0x' + FULL_HASH, 4);
    expect(result).toBe('0xa1b2...a1b2');
  });

  it('default 4 chars matches expected length', () => {
    const result = truncateHash(FULL_HASH);
    // '0x'(2) + chars(4) + '...'(3) + chars(4) = 13
    expect(result.length).toBe(13);
  });
});
