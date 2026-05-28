import { getUpstashClient } from "./upstash-client";
import type { GiftMetadata } from "./gift-metadata";

const TTL_SEC = 90 * 24 * 60 * 60;

const globalState = globalThis as typeof globalThis & {
  __giftMetadataMemory?: Map<string, GiftMetadata>;
};

function memoryMap(): Map<string, GiftMetadata> {
  if (!globalState.__giftMetadataMemory) {
    globalState.__giftMetadataMemory = new Map();
  }
  return globalState.__giftMetadataMemory;
}

function redisKey(paymentIdHash: string): string {
  return `linkcash:gift-meta:${paymentIdHash.toLowerCase()}`;
}

class GiftMetadataStore {
  private readonly upstash = getUpstashClient();

  async set(paymentIdHash: string, metadata: GiftMetadata): Promise<void> {
    const key = redisKey(paymentIdHash);
    const payload = JSON.stringify(metadata);

    // Write-once: don't overwrite existing metadata so a second caller who
    // knows the paymentIdHash + refundAddress cannot replace sender display
    // name or gift message with arbitrary content.
    if (memoryMap().has(key)) return;
    memoryMap().set(key, metadata);

    if (!this.upstash) return;

    try {
      // NX = only set if not exists, preserving the write-once guarantee in Redis.
      await this.upstash.command(["SET", key, payload, "EX", TTL_SEC, "NX"]);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "gift_metadata_redis_write_error",
          paymentIdHash,
          message: error instanceof Error ? error.message : "unknown",
        })
      );
    }
  }

  async get(paymentIdHash: string): Promise<GiftMetadata | null> {
    const key = redisKey(paymentIdHash);
    const cached = memoryMap().get(key);
    if (cached) return cached;

    if (!this.upstash) return null;

    try {
      const raw = await this.upstash.command<string | null>(["GET", key]);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as GiftMetadata;
      if (
        typeof parsed.senderDisplayName !== "string" ||
        !parsed.senderDisplayName.trim()
      ) {
        return null;
      }
      memoryMap().set(key, parsed);
      return parsed;
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "gift_metadata_redis_read_error",
          paymentIdHash,
          message: error instanceof Error ? error.message : "unknown",
        })
      );
      return null;
    }
  }
}

export const giftMetadataStore = new GiftMetadataStore();
