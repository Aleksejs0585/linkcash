import { Contract, formatUnits } from "ethers";
import { createArcProviderWithContractCheck } from "./arc-chain";
import { getArcReadEnv } from "./env";
import { getUpstashClient } from "./upstash-client";

const ABI = [
  "event GiftFunded(bytes32 indexed paymentIdHash, address indexed funder, address indexed refundAddress, uint256 amount, uint64 expiresAt)",
  "event GiftClaimed(bytes32 indexed paymentIdHash, address indexed recipient, uint256 amount)",
];

const LOG_CHUNK = 8_000;
const MAX_CHUNKS = 30; // ~240k blocks ≈ last few days; full-range query tried first
const STATS_TIMEOUT_MS = 20_000;
const WATERMARK_KEY = "linkcash:stats-watermark";

export type OnChainStats = {
  totalClaimed: number;
  totalUsdcClaimed: string;
  totalFunded: number;
};

// In-process watermark so stats never go backward within a serverless instance
const gState = globalThis as typeof globalThis & {
  __statsWatermark?: OnChainStats;
};

async function loadWatermark(): Promise<OnChainStats | null> {
  // Memory first
  if (gState.__statsWatermark) return gState.__statsWatermark;
  // Redis
  const upstash = getUpstashClient();
  if (!upstash) return null;
  try {
    const raw = await upstash.command<string | null>(["GET", WATERMARK_KEY]);
    if (!raw) return null;
    return JSON.parse(raw) as OnChainStats;
  } catch { return null; }
}

async function saveWatermark(stats: OnChainStats): Promise<void> {
  gState.__statsWatermark = stats;
  const upstash = getUpstashClient();
  if (!upstash) return;
  try {
    await upstash.command(["SET", WATERMARK_KEY, JSON.stringify(stats), "EX", 30 * 24 * 60 * 60]);
  } catch { /* non-fatal */ }
}

async function loadOnChainStatsInner(): Promise<OnChainStats> {
  const { rpcUrl, contractAddress } = getArcReadEnv();
  const provider = await createArcProviderWithContractCheck(rpcUrl, contractAddress);
  const contract = new Contract(contractAddress, ABI, provider);
  const latest = await provider.getBlockNumber();

  async function fetchAllLogs(filter: ReturnType<Contract["filters"]["GiftFunded"]>) {
    // Full-history query first — fast when RPC supports it
    try {
      const all = await contract.queryFilter(filter, 0, latest);
      if (Array.isArray(all) && all.length >= 0) return all;
    } catch { /* fall through to chunked */ }

    // Chunked fallback: scan backward from latest
    const logs = [];
    let toBlock = latest;
    for (let i = 0; i < MAX_CHUNKS && toBlock >= 0; i++) {
      const fromBlock = Math.max(0, toBlock - LOG_CHUNK);
      const batch = await contract.queryFilter(filter, fromBlock, toBlock);
      logs.push(...batch);
      if (fromBlock === 0) break;
      toBlock = fromBlock - 1;
    }
    return logs;
  }

  const [fundedLogs, claimedLogs] = await Promise.all([
    fetchAllLogs(contract.filters.GiftFunded()),
    fetchAllLogs(contract.filters.GiftClaimed()),
  ]);

  let totalRaw = BigInt(0);
  for (const log of claimedLogs) {
    try {
      const amount = (log as { args?: { amount?: bigint } }).args?.amount;
      if (typeof amount === "bigint") totalRaw += amount;
    } catch { /* skip */ }
  }

  return {
    totalClaimed: claimedLogs.length,
    totalUsdcClaimed: formatUnits(totalRaw, 6),
    totalFunded: fundedLogs.length,
  };
}

export async function loadOnChainStats(): Promise<OnChainStats> {
  const watermark = await loadWatermark();

  try {
    const fresh = await Promise.race([
      loadOnChainStatsInner(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("stats timeout")), STATS_TIMEOUT_MS)
      ),
    ]);

    // Only update watermark if numbers are >= previous (testnet can't shrink)
    if (
      !watermark ||
      fresh.totalClaimed >= watermark.totalClaimed ||
      parseFloat(fresh.totalUsdcClaimed) >= parseFloat(watermark.totalUsdcClaimed)
    ) {
      void saveWatermark(fresh);
      return fresh;
    }

    // Fresh data looks wrong (RPC returned partial results) — use watermark
    return watermark;
  } catch {
    // Timeout or RPC error — return watermark if available
    return watermark ?? { totalClaimed: 0, totalUsdcClaimed: "0", totalFunded: 0 };
  }
}
