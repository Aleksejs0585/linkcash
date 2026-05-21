/** Simple in-memory sliding-window rate limiter for serverless routes.
 *  State is per-process — provides basic abuse protection, not a hard guarantee. */

type Window = { count: number; resetAt: number };
const store = new Map<string, Window>();

export function checkRateLimit(
  key: string,
  maxPerWindow: number,
  windowMs: number
): { limited: boolean; retryAfter: number } {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now >= existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfter: 0 };
  }

  if (existing.count >= maxPerWindow) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    return { limited: true, retryAfter };
  }

  existing.count++;
  return { limited: false, retryAfter: 0 };
}

// Prune stale entries every ~500 calls to avoid memory leak
let pruneCounter = 0;
function maybePrune() {
  if (++pruneCounter < 500) return;
  pruneCounter = 0;
  const now = Date.now();
  for (const [k, v] of store) {
    if (now >= v.resetAt) store.delete(k);
  }
}

export function rateLimitedCheck(
  key: string,
  maxPerWindow: number,
  windowMs = 60_000
): { limited: boolean; retryAfter: number } {
  maybePrune();
  return checkRateLimit(key, maxPerWindow, windowMs);
}
