/**
 * _config.ts — Shared server-side AI configuration
 *
 * Change the active Gemini model for ALL routes by setting the
 * GEMINI_MODEL environment variable in Vercel (or .env.local).
 */

/** Canonical Gemini model name used by every API route. */
export const GEMINI_MODEL: string =
  process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/** Resolve the Gemini API key from whichever env var is set. */
export function getGeminiKey(): string | undefined {
  return process.env.GEMINI_API_KEY ?? process.env.VITE_GEMINI_API_KEY;
}
