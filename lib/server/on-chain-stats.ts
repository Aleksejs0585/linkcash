import { Contract, formatUnits } from "ethers";
import { createArcProviderWithContractCheck } from "./arc-chain";
import { getArcReadEnv } from "./env";

const ABI = [
  "event GiftFunded(bytes32 indexed paymentIdHash, address indexed funder, address indexed refundAddress, uint256 amount, uint64 expiresAt)",
  "event GiftClaimed(bytes32 indexed paymentIdHash, address indexed recipient, uint256 amount)",
];

const LOG_CHUNK = 8_000;
const MAX_CHUNKS = 50;
const STATS_TIMEOUT_MS = 15_000;

export type OnChainStats = {
  totalClaimed: number;
  totalUsdcClaimed: string;
  totalFunded: number;
};

async function loadOnChainStatsInner(): Promise<OnChainStats> {
  const { rpcUrl, contractAddress } = getArcReadEnv();
  const provider = await createArcProviderWithContractCheck(rpcUrl, contractAddress);
  const contract = new Contract(contractAddress, ABI, provider);
  const latest = await provider.getBlockNumber();

  async function fetchAllLogs(filter: ReturnType<Contract["filters"]["GiftFunded"]>) {
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
    } catch { /* skip malformed log */ }
  }

  return {
    totalClaimed: claimedLogs.length,
    totalUsdcClaimed: formatUnits(totalRaw, 6),
    totalFunded: fundedLogs.length,
  };
}

export async function loadOnChainStats(): Promise<OnChainStats> {
  try {
    return await Promise.race([
      loadOnChainStatsInner(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("stats timeout")), STATS_TIMEOUT_MS)
      ),
    ]);
  } catch {
    return { totalClaimed: 0, totalUsdcClaimed: "0", totalFunded: 0 };
  }
}
