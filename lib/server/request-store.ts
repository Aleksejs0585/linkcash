import { getUpstashClient } from "./upstash-client";

export type PaymentRequest = {
  requestId: string;
  displayName: string;
  amountUsdc: string;
  message?: string;
  createdAt: string;
  requesterWalletAddress: string;
  requesterEmail?: string;
  paidAt?: string;
};

const TTL_SEC = 90 * 24 * 60 * 60;

const globalState = globalThis as typeof globalThis & {
  __requestMemory?: Map<string, PaymentRequest>;
};

function memoryMap(): Map<string, PaymentRequest> {
  if (!globalState.__requestMemory) {
    globalState.__requestMemory = new Map();
  }
  return globalState.__requestMemory;
}

function redisKey(requestId: string): string {
  return `linkcash:request:${requestId}`;
}

function walletIndexKey(walletAddress: string): string {
  return `linkcash:wallet-requests:${walletAddress.toLowerCase()}`;
}

class RequestStore {
  private readonly upstash = getUpstashClient();

  async write(req: PaymentRequest): Promise<void> {
    const key = redisKey(req.requestId);
    const payload = JSON.stringify(req);

    memoryMap().set(key, req);

    if (!this.upstash) return;

    try {
      await this.upstash.command(["SET", key, payload, "EX", TTL_SEC, "NX"]);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "request_store_write_error",
          message: error instanceof Error ? error.message : "unknown",
        })
      );
    }

    // Best-effort wallet index — failure here is non-fatal
    try {
      const wKey = walletIndexKey(req.requesterWalletAddress);
      await this.upstash.command(["LPUSH", wKey, req.requestId]);
      await this.upstash.command(["LTRIM", wKey, 0, 99]);
      await this.upstash.command(["EXPIRE", wKey, TTL_SEC]);
    } catch {
      // index update failed; request is still accessible by ID
    }
  }

  async read(requestId: string): Promise<PaymentRequest | null> {
    const key = redisKey(requestId);
    const cached = memoryMap().get(key);
    if (cached) return cached;

    if (!this.upstash) return null;

    try {
      const raw = await this.upstash.command<string | null>(["GET", key]);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PaymentRequest;
      memoryMap().set(key, parsed);
      return parsed;
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "request_store_read_error",
          message: error instanceof Error ? error.message : "unknown",
        })
      );
      return null;
    }
  }

  async markPaid(requestId: string): Promise<void> {
    const paidAt = new Date().toISOString();
    const key = redisKey(requestId);

    // Update memory immediately
    const cached = memoryMap().get(key);
    if (cached) {
      memoryMap().set(key, { ...cached, paidAt });
    }

    if (!this.upstash) return;

    try {
      const raw = await this.upstash.command<string | null>(["GET", key]);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PaymentRequest;
      if (parsed.paidAt) return; // already marked
      const updated = { ...parsed, paidAt };
      memoryMap().set(key, updated);
      await this.upstash.command(["SET", key, JSON.stringify(updated), "EX", TTL_SEC]);
    } catch {
      // non-fatal
    }
  }

  async listByWallet(walletAddress: string): Promise<PaymentRequest[]> {
    if (this.upstash) {
      try {
        const wKey = walletIndexKey(walletAddress);
        const ids = await this.upstash.command<string[]>(["LRANGE", wKey, 0, 99]);
        if (!ids?.length) return [];
        const items = await Promise.all(ids.map((id) => this.read(id)));
        return items.filter((r): r is PaymentRequest => r !== null);
      } catch {
        // fall through to memory scan
      }
    }

    // Memory fallback: linear scan
    const lower = walletAddress.toLowerCase();
    const results: PaymentRequest[] = [];
    for (const req of memoryMap().values()) {
      if (req.requesterWalletAddress.toLowerCase() === lower) {
        results.push(req);
      }
    }
    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

export const requestStore = new RequestStore();
