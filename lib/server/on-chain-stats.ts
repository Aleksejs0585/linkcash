import { formatUnits } from "ethers";
import { getUpstashClient } from "./upstash-client";

const EXPLORER_BASE = "https://testnet.arcscan.app/api/v2";
const CONTRACT = "0x93fEF97173Af2Da909Fe83961421199B9dB17111";
const CACHE_KEY = "linkcash:stats-explorer-v1";
const CACHE_TTL = 5 * 60;

export type OnChainStats = {
  totalClaimed: number;
  totalUsdcClaimed: string;
  totalFunded: number;
};

const ZERO: OnChainStats = {
  totalClaimed: 0,
  totalUsdcClaimed: "0",
  totalFunded: 0,
};

const gState = globalThis as typeof globalThis & {
  __explorerStats?: { data: OnChainStats; fetchedAt: number };
};

async function fetchAllLogs(): Promise<OnChainStats> {
  let funded = 0;
  let claimed = 0;
  let totalRaw = BigInt(0);

  let url = `${EXPLORER_BASE}/addresses/${CONTRACT}/logs`;
  let pages = 0;
  const MAX_PAGES = 50;

  while (url && pages < MAX_PAGES) {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) break;

    const data = (await res.json()) as {
      items: Array<{
        decoded?: {
          method_call?: string;
          parameters?: Array<{ name: string; value: string }>;
        };
      }>;
      next_page_params?: {
        block_number: number;
        index: number;
        items_count: number;
      };
    };

    for (const item of data.items) {
      const method = item.decoded?.method_call ?? "";
      if (method.startsWith("GiftFunded")) {
        funded++;
      } else if (method.startsWith("GiftClaimed")) {
        claimed++;
        const amountParam = item.decoded?.parameters?.find(
          (p) => p.name === "amount"
        );
        if (amountParam?.value) {
          try {
            totalRaw += BigInt(amountParam.value);
          } catch { /* skip malformed */ }
        }
      }
    }

    pages++;
    if (data.next_page_params) {
      const p = data.next_page_params;
      url = `${EXPLORER_BASE}/addresses/${CONTRACT}/logs?block_number=${p.block_number}&index=${p.index}&items_count=${p.items_count}`;
    } else {
      url = "";
    }
  }

  return {
    totalFunded: funded,
    totalClaimed: claimed,
    totalUsdcClaimed: formatUnits(totalRaw, 6),
  };
}

async function loadFromCache(): Promise<OnChainStats | null> {
  if (gState.__explorerStats && Date.now() - gState.__explorerStats.fetchedAt < CACHE_TTL * 1000) {
    return gState.__explorerStats.data;
  }
  const upstash = getUpstashClient();
  if (!upstash) return null;
  try {
    const raw = await upstash.command<string | null>(["GET", CACHE_KEY]);
    if (!raw) return null;
    const data = JSON.parse(raw) as OnChainStats;
    gState.__explorerStats = { data, fetchedAt: Date.now() };
    return data;
  } catch {
    return null;
  }
}

async function saveToCache(stats: OnChainStats): Promise<void> {
  gState.__explorerStats = { data: stats, fetchedAt: Date.now() };
  const upstash = getUpstashClient();
  if (!upstash) return;
  try {
    await upstash.command([
      "SET", CACHE_KEY, JSON.stringify(stats), "EX", String(CACHE_TTL),
    ]);
  } catch { /* non-fatal */ }
}

export async function loadOnChainStats(): Promise<OnChainStats> {
  const cached = await loadFromCache();
  if (cached) return cached;

  try {
    const stats = await fetchAllLogs();
    await saveToCache(stats);
    return stats;
  } catch {
    return ZERO;
  }
}
