import { getUpstashClient } from "./upstash-client";

export type PaymentRequest = {
  requestId: string;
  displayName: string;
  amountUsdc: string;
  message?: string;
  createdAt: string;
  requesterWalletAddress: string;
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

class RequestStore {
  private readonly upstash = getUpstashClient();

  async write(req: PaymentRequest): Promise<void> {
    const key = redisKey(req.requestId);
    const payload = JSON.stringify(req);

    memoryMap().set(key, req);

    if (!this.upstash) return;

    try {
      await this.upstash.command(["SET", key, payload, "EX", TTL_SEC]);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "request_store_write_error",
          message: error instanceof Error ? error.message : "unknown",
        })
      );
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
}

export const requestStore = new RequestStore();
