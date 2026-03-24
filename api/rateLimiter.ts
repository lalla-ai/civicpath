/**
 * rateLimiter.ts — Simple in-memory IP-based rate limiter for Vercel functions.
 * Works per-instance (sufficient for Vercel's serverless model).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Check and increment rate limit for a given key (IP + route).
 * Returns true if the request is allowed, false if it should be blocked.
 */
export function rateLimit(key: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const windowMs = 60_000;

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= maxPerMinute) return false;
  bucket.count++;
  return true;
}

/** Extract best available client IP from Vercel request headers. */
export function getClientIp(headers: Record<string, string | string[] | undefined>): string {
  const forwarded = headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) return forwarded[0].split(',')[0].trim();
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return (headers['x-real-ip'] as string) || 'unknown';
}
