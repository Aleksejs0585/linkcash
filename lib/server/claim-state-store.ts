type RateLimitResult = { limited: boolean; retryAfter: number };

export type IdempotencyEntry =
  | { status: "processing"; expiresAt: number }
  | { status: "success"; txHash: string; expiresAt: number };

const RATE_LIMIT_WINDOW_MS = 60_000;

class UpstashClient {
  private readonly url: string;
  private readonly token: string;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  async command<T = unknown>(args: Array<string | number>): Promise<T> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Upstash command failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as { result?: T; error?: string };
    if (payload.error) {
      throw new Error(payload.error);
    }
    return payload.result as T;
  }
}

function getUpstashClient(): UpstashClient | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new UpstashClient(url, token);
}

const globalState = globalThis as typeof globalThis & {
  __claimRateLimitStore?: Map<string, { count: number; windowStartMs: number }>;
  __claimIdempotencyStore?: Map<string, IdempotencyEntry>;
};

const rateLimitStore =
  globalState.__claimRateLimitStore ??
  new Map<string, { count: number; windowStartMs: number }>();
const idempotencyStore =
  globalState.__claimIdempotencyStore ?? new Map<string, IdempotencyEntry>();

globalState.__claimRateLimitStore = rateLimitStore;
globalState.__claimIdempotencyStore = idempotencyStore;

export class ClaimStateStore {
  private readonly upstash = getUpstashClient();

  async enforceRateLimit(clientIp: string, maxRequests: number): Promise<RateLimitResult> {
    if (this.upstash) {
      return this.enforceRateLimitUpstash(clientIp, maxRequests);
    }
    return this.enforceRateLimitMemory(clientIp, maxRequests);
  }

  private async enforceRateLimitUpstash(
    clientIp: string,
    maxRequests: number
  ): Promise<RateLimitResult> {
    const key = `claim:rate:${clientIp}`;
    // SET NX PX atomically initialises the key with TTL only on first touch,
    // avoiding the INCR-then-PEXPIRE race where two concurrent requests both
    // see count===1 and only one sets the TTL, leaving the other key immortal.
    await this.upstash!.command(["SET", key, "0", "PX", RATE_LIMIT_WINDOW_MS, "NX"]);
    const raw = await this.upstash!.command<number | string | null>(["INCR", key]);
    // Treat null (eviction between SET and INCR) as count=1 to fail safe.
    const count = raw != null ? Number(raw) : 1;

    if (count > maxRequests) {
      const ttl = Number(await this.upstash!.command<number>(["PTTL", key]));
      const retryAfter = Math.max(1, Math.ceil(Math.max(0, ttl) / 1000));
      return { limited: true, retryAfter };
    }
    return { limited: false, retryAfter: 0 };
  }

  private enforceRateLimitMemory(clientIp: string, maxRequests: number): RateLimitResult {
    const now = Date.now();
    const current = rateLimitStore.get(clientIp);

    if (!current || now - current.windowStartMs >= RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.set(clientIp, { count: 1, windowStartMs: now });
      return { limited: false, retryAfter: 0 };
    }

    current.count += 1;
    rateLimitStore.set(clientIp, current);

    if (current.count > maxRequests) {
      const retryAfter = Math.ceil(
        (RATE_LIMIT_WINDOW_MS - (now - current.windowStartMs)) / 1000
      );
      return { limited: true, retryAfter: Math.max(1, retryAfter) };
    }

    return { limited: false, retryAfter: 0 };
  }

  async getIdempotency(key: string): Promise<IdempotencyEntry | null> {
    if (this.upstash) {
      const raw = await this.upstash.command<string | null>(["GET", `claim:idem:${key}`]);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as IdempotencyEntry;
      if (parsed.expiresAt <= Date.now()) {
        await this.deleteIdempotency(key);
        return null;
      }
      return parsed;
    }

    const current = idempotencyStore.get(key) ?? null;
    if (current && current.expiresAt <= Date.now()) {
      idempotencyStore.delete(key);
      return null;
    }
    return current;
  }

  async setProcessing(key: string, ttlMs: number): Promise<void> {
    const entry: IdempotencyEntry = {
      status: "processing",
      expiresAt: Date.now() + ttlMs,
    };
    await this.writeIdempotency(key, entry, ttlMs);
  }

  async setSuccess(key: string, txHash: string, ttlMs: number): Promise<void> {
    const entry: IdempotencyEntry = {
      status: "success",
      txHash,
      expiresAt: Date.now() + ttlMs,
    };
    await this.writeIdempotency(key, entry, ttlMs);
  }

  async deleteIdempotency(key: string): Promise<void> {
    if (this.upstash) {
      await this.upstash.command(["DEL", `claim:idem:${key}`]);
      return;
    }
    idempotencyStore.delete(key);
  }

  private async writeIdempotency(
    key: string,
    value: IdempotencyEntry,
    ttlMs: number
  ): Promise<void> {
    if (this.upstash) {
      await this.upstash.command([
        "SET",
        `claim:idem:${key}`,
        JSON.stringify(value),
        "PX",
        ttlMs,
      ]);
      return;
    }
    idempotencyStore.set(key, value);
  }
}

export const claimStateStore = new ClaimStateStore();

