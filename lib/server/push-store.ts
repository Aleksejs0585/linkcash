import { getUpstashClient } from "./upstash-client";

export type PushSubscriptionRecord = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

const TTL_SEC = 180 * 24 * 60 * 60; // 6 months
const MAX_SUBS = 5; // max devices per wallet

const globalState = globalThis as typeof globalThis & {
  __pushMemory?: Map<string, PushSubscriptionRecord[]>;
};

function mem(): Map<string, PushSubscriptionRecord[]> {
  if (!globalState.__pushMemory) globalState.__pushMemory = new Map();
  return globalState.__pushMemory;
}

function key(walletAddress: string): string {
  return `linkcash:push:${walletAddress.toLowerCase()}`;
}

class PushStore {
  private readonly upstash = getUpstashClient();

  async save(walletAddress: string, sub: PushSubscriptionRecord): Promise<void> {
    const existing = mem().get(walletAddress.toLowerCase()) ?? [];
    // Dedup by endpoint
    const deduped = existing.filter((s) => s.endpoint !== sub.endpoint);
    const updated = [...deduped, sub].slice(-MAX_SUBS);
    mem().set(walletAddress.toLowerCase(), updated);

    if (!this.upstash) return;
    try {
      await this.upstash.command(["SET", key(walletAddress), JSON.stringify(updated), "EX", TTL_SEC]);
    } catch { /* non-fatal */ }
  }

  async getAll(walletAddress: string): Promise<PushSubscriptionRecord[]> {
    const cached = mem().get(walletAddress.toLowerCase());
    if (cached) return cached;

    if (!this.upstash) return [];
    try {
      const raw = await this.upstash.command<string | null>(["GET", key(walletAddress)]);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as PushSubscriptionRecord[];
      mem().set(walletAddress.toLowerCase(), parsed);
      return parsed;
    } catch { return []; }
  }

  async remove(walletAddress: string, endpoint: string): Promise<void> {
    const existing = mem().get(walletAddress.toLowerCase()) ?? [];
    const filtered = existing.filter((s) => s.endpoint !== endpoint);
    mem().set(walletAddress.toLowerCase(), filtered);

    if (!this.upstash) return;
    try {
      if (filtered.length === 0) {
        await this.upstash.command(["DEL", key(walletAddress)]);
      } else {
        await this.upstash.command(["SET", key(walletAddress), JSON.stringify(filtered), "EX", TTL_SEC]);
      }
    } catch { /* non-fatal */ }
  }
}

export const pushStore = new PushStore();
