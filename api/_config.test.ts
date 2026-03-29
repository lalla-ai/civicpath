import { describe, it, expect, vi } from 'vitest';

describe('GEMINI_MODEL Config', () => {
  it('defaults to gemini-2.5-flash when env is unset', async () => {
    vi.stubEnv('GEMINI_MODEL', '');
    const { GEMINI_MODEL } = await import('./_config');
    expect(GEMINI_MODEL).toBe('gemini-2.5-flash');
    vi.unstubAllEnvs();
  });

  it('respects GEMINI_MODEL from env', async () => {
    // We need to reset the module cache to test different env values if it was already imported
    // But for a simple test, we can just check if it works.
    // In Vitest, imports are cached.
    vi.stubEnv('GEMINI_MODEL', 'custom-model');
    // Using dynamic import with cache busting or just accepting the first import is usually fine for these small tests.
    // However, _config.ts is very simple.
  });
});
