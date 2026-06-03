import { getUpstashClient } from "./upstash-client";

export type IdentityRecord = {
  walletAddress: string;
  email: string;
  lastSeen: string;
};

const TTL_SEC = 365 * 24 * 60 * 60; // 1 year

const globalState = globalThis as typeof globalThis & {
  __identityMemory?: Map<string, IdentityRecord>;
};

function mem(): Map<string, IdentityRecord> {
  if (!globalState.__identityMemory) globalState.__identityMemory = new Map();
  return globalState.__identityMemory;
}

function key(walletAddress: string): string {
  return `linkcash:identity:${walletAddress.toLowerCase()}`;
}

class IdentityStore {
  private readonly upstash = getUpstashClient();

  async upsert(walletAddress: string, email: string): Promise<void> {
    const record: IdentityRecord = {
      walletAddress: walletAddress.toLowerCase(),
      email: email.toLowerCase(),
      lastSeen: new Date().toISOString(),
    };
    mem().set(walletAddress.toLowerCase(), record);

    if (!this.upstash) return;
    try {
      await this.upstash.command(["SET", key(walletAddress), JSON.stringify(record), "EX", TTL_SEC]);
    } catch {
      // non-fatal
    }
  }

  async getEmail(walletAddress: string): Promise<string | null> {
    const cached = mem().get(walletAddress.toLowerCase());
    if (cached) return cached.email;

    if (!this.upstash) return null;
    try {
      const raw = await this.upstash.command<string | null>(["GET", key(walletAddress)]);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as IdentityRecord;
      mem().set(walletAddress.toLowerCase(), parsed);
      return parsed.email;
    } catch { return null; }
  }

  async enrichClaims<T extends { email: string; walletAddress: string }>(
    claims: T[]
  ): Promise<T[]> {
    return Promise.all(
      claims.map(async (c) => {
        const isReal = c.email.includes("@") && !c.email.endsWith("@wallet");
        if (isReal) return c;
        const email = await this.getEmail(c.walletAddress);
        return email ? { ...c, email } : c;
      })
    );
  }
}

export const identityStore = new IdentityStore();
