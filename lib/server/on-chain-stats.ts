import { Contract, formatUnits } from "ethers";
import { createArcProviderWithContractCheck } from "./arc-chain";
import { getArcReadEnv } from "./env";
import { getUpstashClient } from "./upstash-client";

const ABI = [
  "event GiftFunded(bytes32 indexed paymentIdHash, address indexed funder, address indexed refundAddress, uint256 amount, uint64 expiresAt)",
  "event GiftClaimed(bytes32 indexed paymentIdHash, address indexed recipient, uint256 amount)",
];

// Arc testnet limits eth_getLogs to 10,000 block range
const CHUNK = 9_000;
// Max chunks per call — aggressive to catch up from block 0 quickly
const MAX_CHUNKS_PER_CALL = 30;
const CURSOR_KEY = "linkcash:stats-cursor-v3";
const TIMEOUT_MS = 18_000;

export type OnChainStats = {
  totalClaimed: number;
  totalUsdcClaimed: string;
  totalFunded: number;
};

type Cursor = {
  stats: OnChainStats;
  nextBlock: number; // next block to scan forward from
};

const ZERO: OnChainStats = {
  totalClaimed: 0,
  totalUsdcClaimed: "0",
  totalFunded: 0,
};

const gState = globalThis as typeof globalThis & {
  __statsCursor?: Cursor;
};

async function loadCursor(): Promise<Cursor | null> {
  if (gState.__statsCursor) return gState.__statsCursor;
  const upstash = getUpstashClient();
  if (!upstash) return null;
  try {
    const raw = await upstash.command<string | null>(["GET", CURSOR_KEY]);
    if (!raw) return null;
    const c = JSON.parse(raw) as Cursor;
    gState.__statsCursor = c;
    return c;
  } catch { return null; }
}

async function saveCursor(cursor: Cursor): Promise<void> {
  gState.__statsCursor = cursor;
  const upstash = getUpstashClient();
  if (!upstash) return;
  try {
    await upstash.command(["SET", CURSOR_KEY, JSON.stringify(cursor), "EX", 30 * 24 * 60 * 60]);
  } catch { /* non-fatal */ }
}

async function scanForward(
  contract: Contract,
  from: number,
  to: number,
  base: OnChainStats
): Promise<{ stats: OnChainStats; scannedTo: number }> {
  let funded = base.totalFunded;
  let claimed = base.totalClaimed;
  let totalRaw = BigInt(Math.round(parseFloat(base.totalUsdcClaimed) * 1_000_000));
  let scannedTo = from - 1;
  let chunks = 0;

  for (let start = from; start <= to && chunks < MAX_CHUNKS_PER_CALL; start += CHUNK, chunks++) {
    const end = Math.min(start + CHUNK - 1, to);
    const [fundedLogs, claimedLogs] = await Promise.all([
      contract.queryFilter(contract.filters.GiftFunded(), start, end),
      contract.queryFilter(contract.filters.GiftClaimed(), start, end),
    ]);
    funded += fundedLogs.length;
    claimed += claimedLogs.length;
    for (const log of claimedLogs) {
      try {
        const amount = (log as { args?: { amount?: bigint } }).args?.amount;
        if (typeof amount === "bigint") totalRaw += amount;
      } catch { /* skip */ }
    }
    scannedTo = end;
  }

  return {
    stats: { totalFunded: funded, totalClaimed: claimed, totalUsdcClaimed: formatUnits(totalRaw, 6) },
    scannedTo,
  };
}

async function loadOnChainStatsInner(): Promise<OnChainStats> {
  const { rpcUrl, contractAddress } = getArcReadEnv();
  const provider = await createArcProviderWithContractCheck(rpcUrl, contractAddress);
  const contract = new Contract(contractAddress, ABI, provider);
  const latest = await provider.getBlockNumber();

  const cursor = await loadCursor();

  if (!cursor) {
    // First run: full scan from block 0
    const { stats, scannedTo } = await scanForward(contract, 0, latest, ZERO);
    const newCursor: Cursor = { stats, nextBlock: scannedTo + 1 };
    await saveCursor(newCursor);
    return stats;
  }

  if (cursor.nextBlock > latest) {
    // No new blocks since last scan
    return cursor.stats;
  }

  // Scan new blocks since last cursor
  const { stats: updated, scannedTo } = await scanForward(
    contract,
    cursor.nextBlock,
    latest,
    cursor.stats
  );

  const newCursor: Cursor = { stats: updated, nextBlock: scannedTo + 1 };
  await saveCursor(newCursor);
  return updated;
}

export async function loadOnChainStats(): Promise<OnChainStats> {
  const cursor = await loadCursor();
  const fallback = cursor?.stats ?? ZERO;

  try {
    return await Promise.race([
      loadOnChainStatsInner(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("stats timeout")), TIMEOUT_MS)
      ),
    ]);
  } catch {
    return fallback;
  }
}
