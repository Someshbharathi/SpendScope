type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

/**
 * Fixed-window in-memory rate limiter. Best-effort on serverless (per warm instance).
 * Use for lightweight abuse resistance on public API routes.
 */
export function rateLimit(
  key: string,
  options: { max: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  pruneExpired(now);

  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true };
  }

  if (existing.count < options.max) {
    existing.count += 1;
    return { ok: true };
  }

  const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  return { ok: false, retryAfterSec };
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 128);
  return "unknown";
}
