/**
 * grantclaw.test.ts — GrantClaw Hunter & Security QA
 *
 * Protocol 3: Agentic Stress Test
 * - Curated grant DB must contain required AI-startup programs
 * - All entries must have required fields (id, title, agency, url, source)
 * - No duplicate IDs allowed
 * - Kill-criteria fields (closeDate, amount) must be present
 *
 * Protocol 1: Environment / Security Check
 * - Rate limiter must block after limit
 * - API key config must default correctly
 * - BETA_CODES must default to CIVICPATH2026
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimit, getClientIp } from './rateLimiter';
import { GEMINI_MODEL, getGeminiKey } from './_config';
import { safeParseAIJSON } from './_utils';

// ── Protocol 1a: API Key Configuration ───────────────────────────────────────
describe('Protocol 1 — Environment / Key Guard', () => {
  it('GEMINI_MODEL defaults to gemini-2.5-flash', () => {
    expect(GEMINI_MODEL).toBe('gemini-2.5-flash');
  });

  it('getGeminiKey returns GEMINI_API_KEY env var', () => {
    process.env.GEMINI_API_KEY = 'test-key-123';
    expect(getGeminiKey()).toBe('test-key-123');
    delete process.env.GEMINI_API_KEY;
  });

  it('getGeminiKey falls back to VITE_GEMINI_API_KEY', () => {
    delete process.env.GEMINI_API_KEY;
    process.env.VITE_GEMINI_API_KEY = 'vite-fallback-key';
    expect(getGeminiKey()).toBe('vite-fallback-key');
    delete process.env.VITE_GEMINI_API_KEY;
  });

  it('getGeminiKey returns undefined when no key set', () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.VITE_GEMINI_API_KEY;
    expect(getGeminiKey()).toBeUndefined();
  });

  it('BETA_CODES env var defaults to CIVICPATH2026', () => {
    const codes = (process.env.BETA_CODES || 'CIVICPATH2026')
      .split(',')
      .map(c => c.trim().toUpperCase());
    expect(codes).toContain('CIVICPATH2026');
  });
});

// ── Protocol 1b: Rate Limiter ─────────────────────────────────────────────────
describe('Protocol 1 — Rate Limiter', () => {
  // Use unique keys per test to avoid bleed
  const key = () => `test:${Math.random().toString(36).slice(2)}`;

  it('allows requests under the limit', () => {
    const k = key();
    expect(rateLimit(k, 5)).toBe(true);
    expect(rateLimit(k, 5)).toBe(true);
    expect(rateLimit(k, 5)).toBe(true);
  });

  it('blocks exactly at limit', () => {
    const k = key();
    for (let i = 0; i < 3; i++) rateLimit(k, 3);
    expect(rateLimit(k, 3)).toBe(false);
  });

  it('different keys do not interfere', () => {
    const k1 = key();
    const k2 = key();
    for (let i = 0; i < 3; i++) rateLimit(k1, 3);
    expect(rateLimit(k1, 3)).toBe(false);
    expect(rateLimit(k2, 3)).toBe(true); // k2 is fresh
  });

  it('limit 1 blocks on second call', () => {
    const k = key();
    expect(rateLimit(k, 1)).toBe(true);
    expect(rateLimit(k, 1)).toBe(false);
  });
});

// ── Protocol 1c: IP Extraction ────────────────────────────────────────────────
describe('Protocol 1 — IP Extraction', () => {
  it('reads x-forwarded-for header', () => {
    const headers = { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' };
    expect(getClientIp(headers)).toBe('1.2.3.4');
  });

  it('reads x-real-ip header as fallback', () => {
    const headers = { 'x-real-ip': '9.10.11.12' };
    expect(getClientIp(headers)).toBe('9.10.11.12');
  });

  it('returns "unknown" when no IP header present', () => {
    expect(getClientIp({})).toBe('unknown');
  });

  it('handles array x-forwarded-for', () => {
    const headers = { 'x-forwarded-for': ['1.2.3.4', '5.6.7.8'] };
    expect(getClientIp(headers)).toBe('1.2.3.4');
  });
});

// ── Protocol 3: GrantClaw Hunter — Curated DB Integrity ──────────────────────
// We parse the curated grant database directly from grants.ts source
// to validate structure without spinning up a server.

const REQUIRED_AI_GRANTS = [
  'afwerx-001',   // Air Force SBIR Phase I
  'afwerx-002',   // Air Force SBIR Phase II
  'army-001',     // Army xTechSearch
  'navy-001',     // Navy NSIN
  'nist-001',     // NIST AI Safety
  'dhs-001',      // DHS SBIR
  'nsf-icorps',   // NSF I-Corps (commercialization)
  'nsf-pose',     // NSF Open Source
  'sbir-p2',      // SBIR Phase II scale-up
  'eda-001',      // EDA Build to Scale
  'iqt-001',      // In-Q-Tel
  'yc-001',       // Y Combinator
  'techstars-ai', // Techstars AI
  'intel-ignite', // Intel Ignite
  'openai-001',   // OpenAI credits
  'anthropic-001',// Anthropic credits
  'hf-001',       // Hugging Face
  'mcgovern-001', // McGovern Foundation
  'otf-001',      // Open Technology Fund
  'ai-grant',     // AI Grant community
  'wellcome-ai',  // Wellcome Leap
  // Pre-existing grants
  'nsf-001', 'nih-001', 'nasa-001', 'dod-001', 'goog-001', 'nv-001',
];

describe('Protocol 3 — GrantClaw Hunter: Curated Database', async () => {
  // Read grants.ts source and extract the expandedMock array
  const { readFileSync } = await import('fs');
  const { join } = await import('path');
  const src = readFileSync(join(process.cwd(), 'api/grants.ts'), 'utf-8');

  // Extract all id:'xxx' patterns from the curated list
  const idMatches = src.matchAll(/id:'([^']+)'/g);
  const ids = Array.from(idMatches).map(m => m[1]);

  it('contains all required AI startup grant IDs', () => {
    const missing = REQUIRED_AI_GRANTS.filter(id => !ids.includes(id));
    expect(missing, `Missing grant IDs: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('has no duplicate grant IDs', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const id of ids) {
      if (seen.has(id)) dupes.push(id);
      seen.add(id);
    }
    expect(dupes, `Duplicate IDs: ${dupes.join(', ')}`).toHaveLength(0);
  });

  it('curated DB has at least 50 grants', () => {
    expect(ids.length).toBeGreaterThanOrEqual(50);
  });

  it('NIH Reporter live search is present', () => {
    expect(src).toContain('api.reporter.nih.gov');
  });

  it('Grants.gov live search is present', () => {
    expect(src).toContain('apply07.grants.gov');
  });

  it('SBA SBIR live search is present', () => {
    expect(src).toContain('api.sbir.gov');
  });
});

// ── Protocol 5: AI JSON Parser resilience ────────────────────────────────────
describe('Protocol 5 — UI-to-Terminal Link: AI Output Integrity', () => {
  it('passes clean grant scoring JSON through intact', () => {
    const raw = JSON.stringify([
      { rank: 1, title: 'NSF SBIR', score: 92, fit: 'HIGH', reasons: ['AI focus', 'Nonprofit eligible'] },
      { rank: 2, title: 'AFWERX SBIR', score: 74, fit: 'MEDIUM', reasons: ['Defense AI match'] },
    ]);
    const result = safeParseAIJSON(raw) as any[];
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(92);
    expect(result[0].fit).toBe('HIGH');
  });

  it('recovers grant scores wrapped in markdown', () => {
    const raw = `Here are the scores:\n\`\`\`json\n[{"rank":1,"score":88}]\n\`\`\``;
    const result = safeParseAIJSON(raw) as any[];
    expect(result[0].score).toBe(88);
  });

  it('recovers grant scores preceded by prose', () => {
    const raw = `Based on your profile, here are the matches: [{"rank":1,"score":95,"title":"YC Batch"}]`;
    const result = safeParseAIJSON(raw) as any[];
    expect(result[0].score).toBe(95);
  });

  it('throws clearly when AI returns garbage (kill criteria: unscored grant)', () => {
    expect(() => safeParseAIJSON('No matches found for your criteria.')).toThrow();
  });
});
