import { getUpstashClient } from "./upstash-client";

export type Campaign = {
  campaignId: string;
  title: string;
  createdAt: string;
  createdBy: string;
  amountPerGift: string;
  totalGifts: number;
  senderDisplayName: string;
  giftMessage?: string;
};

export type ClaimRecord = {
  email: string;
  paymentIdHash: string;
  txHash: string;
  claimedAt: string;
  walletAddress: string;
};

export type PoolEntry = {
  paymentIdHash: string;
  secret: string;
};

const TTL_SEC = 90 * 24 * 60 * 60;

type MemEntry = {
  campaign: Campaign;
  pool: PoolEntry[];
  claims: ClaimRecord[];
  claimers: Set<string>;
};

const globalState = globalThis as typeof globalThis & {
  __campaignMemory?: Map<string, MemEntry>;
};

function mem(): Map<string, MemEntry> {
  if (!globalState.__campaignMemory) globalState.__campaignMemory = new Map();
  return globalState.__campaignMemory;
}

const k = {
  camp: (id: string) => `linkcash:camp:${id}`,
  pool: (id: string) => `linkcash:camp:${id}:pool`,
  claims: (id: string) => `linkcash:camp:${id}:claims`,
  claimers: (id: string) => `linkcash:camp:${id}:claimers`,
};

class CampaignStore {
  private readonly upstash = getUpstashClient();

  async create(campaign: Campaign, pool: PoolEntry[]): Promise<void> {
    mem().set(campaign.campaignId, {
      campaign,
      pool: [...pool],
      claims: [],
      claimers: new Set(),
    });

    if (!this.upstash) return;

    try {
      await this.upstash.command(["SET", k.camp(campaign.campaignId), JSON.stringify(campaign), "EX", TTL_SEC]);
      if (pool.length > 0) {
        await this.upstash.command(["RPUSH", k.pool(campaign.campaignId), ...pool.map((e) => JSON.stringify(e))]);
        await this.upstash.command(["EXPIRE", k.pool(campaign.campaignId), TTL_SEC]);
      }
    } catch (error) {
      console.error(JSON.stringify({ event: "campaign_create_error", message: error instanceof Error ? error.message : "unknown" }));
    }
  }

  async get(campaignId: string): Promise<Campaign | null> {
    const m = mem().get(campaignId);
    if (m) return m.campaign;
    if (!this.upstash) return null;
    try {
      const raw = await this.upstash.command<string | null>(["GET", k.camp(campaignId)]);
      return raw ? (JSON.parse(raw) as Campaign) : null;
    } catch { return null; }
  }

  async popGift(campaignId: string): Promise<PoolEntry | null> {
    const m = mem().get(campaignId);
    if (m) return m.pool.shift() ?? null;
    if (!this.upstash) return null;
    try {
      const raw = await this.upstash.command<string | null>(["LPOP", k.pool(campaignId)]);
      return raw ? (JSON.parse(raw) as PoolEntry) : null;
    } catch { return null; }
  }

  async recordClaim(campaignId: string, claim: ClaimRecord): Promise<void> {
    const m = mem().get(campaignId);
    if (m) {
      m.claims.push(claim);
      m.claimers.add(`email:${claim.email.toLowerCase()}`);
      m.claimers.add(`wallet:${claim.walletAddress.toLowerCase()}`);
    }
    if (!this.upstash) return;
    try {
      await this.upstash.command(["RPUSH", k.claims(campaignId), JSON.stringify(claim)]);
      await this.upstash.command(["EXPIRE", k.claims(campaignId), TTL_SEC]);
      await this.upstash.command([
        "SADD", k.claimers(campaignId),
        `email:${claim.email.toLowerCase()}`,
        `wallet:${claim.walletAddress.toLowerCase()}`,
      ]);
      await this.upstash.command(["EXPIRE", k.claimers(campaignId), TTL_SEC]);
    } catch (error) {
      console.error(JSON.stringify({ event: "campaign_record_claim_error", message: error instanceof Error ? error.message : "unknown" }));
    }
  }

  async hasClaimed(campaignId: string, email: string, walletAddress: string): Promise<boolean> {
    const m = mem().get(campaignId);
    if (m) {
      return (
        m.claimers.has(`email:${email.toLowerCase()}`) ||
        m.claimers.has(`wallet:${walletAddress.toLowerCase()}`)
      );
    }
    if (!this.upstash) return false;
    try {
      const [byEmail, byWallet] = await Promise.all([
        this.upstash.command<number>(["SISMEMBER", k.claimers(campaignId), `email:${email.toLowerCase()}`]),
        this.upstash.command<number>(["SISMEMBER", k.claimers(campaignId), `wallet:${walletAddress.toLowerCase()}`]),
      ]);
      return byEmail > 0 || byWallet > 0;
    } catch { return false; }
  }

  async getClaims(campaignId: string): Promise<ClaimRecord[]> {
    const m = mem().get(campaignId);
    if (m) return [...m.claims];
    if (!this.upstash) return [];
    try {
      const raws = await this.upstash.command<string[]>(["LRANGE", k.claims(campaignId), 0, -1]);
      if (!raws?.length) return [];
      return raws
        .map((r) => { try { return JSON.parse(r) as ClaimRecord; } catch { return null; } })
        .filter((c): c is ClaimRecord => c !== null);
    } catch { return []; }
  }

  async getRemainingCount(campaignId: string): Promise<number> {
    const m = mem().get(campaignId);
    if (m) return m.pool.length;
    if (!this.upstash) return 0;
    try {
      return (await this.upstash.command<number>(["LLEN", k.pool(campaignId)])) ?? 0;
    } catch { return 0; }
  }
}

export const campaignStore = new CampaignStore();
