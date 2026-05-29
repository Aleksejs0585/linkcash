/** Sliding-window rate limiter. Uses Upstash Redis when available,
 *  falls back to in-process memory (best-effort in serverless). */

import { getUpstashClient } from "./upstash-client";

type Window = { count: number; resetAt: number };

const store = new Map<string, Window>();
let pruneCounter = 0;

function memoryCheck(
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

function maybePrune() {
  if (++pruneCounter < 500) return;
  pruneCounter = 0;
  const now = Date.now();
  for (const [k, v] of store) {
    if (now >= v.resetAt) store.delete(k);
  }
}

async function upstashCheck(
  key: string,
  maxPerWindow: number,
  windowMs: number
): Promise<{ limited: boolean; retryAfter: number }> {
  const upstash = getUpstashClient();
  if (!upstash) {
    maybePrune();
    return memoryCheck(key, maxPerWindow, windowMs);
  }

  try {
    await upstash.command(["SET", `rl:${key}`, "0", "PX", windowMs, "NX"]);
    const raw = await upstash.command<number | null>(["INCR", `rl:${key}`]);
    const count = raw != null ? Number(raw) : 1;

    if (count > maxPerWindow) {
      const ttl = Number(await upstash.command<number>(["PTTL", `rl:${key}`]));
      return { limited: true, retryAfter: Math.max(1, Math.ceil(Math.max(0, ttl) / 1000)) };
    }
    return { limited: false, retryAfter: 0 };
  } catch {
    // Upstash unavailable — fall back to memory
    maybePrune();
    return memoryCheck(key, maxPerWindow, windowMs);
  }
}

export async function rateLimitedCheck(
  key: string,
  maxPerWindow: number,
  windowMs = 60_000
): Promise<{ limited: boolean; retryAfter: number }> {
  return upstashCheck(key, maxPerWindow, windowMs);
}
