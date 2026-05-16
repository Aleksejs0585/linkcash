import { Contract, type EventLog, type Log } from "ethers";
import { createArcProviderWithContractCheck } from "./arc-chain";
import { getArcReadEnv } from "./env";
import type { LandingTxExample } from "./live-tx-merge";

const GIFT_EVENTS_ABI = [
  "event GiftFunded(bytes32 indexed paymentIdHash, address indexed funder, address indexed refundAddress, uint256 amount, uint64 expiresAt)",
  "event GiftClaimed(bytes32 indexed paymentIdHash, address indexed recipient, uint256 amount)",
  "event GiftReclaimed(bytes32 indexed paymentIdHash, address indexed refundAddress, uint256 amount)",
];

/** Arc RPC allows ~10k blocks per eth_getLogs request. */
const LOG_CHUNK_BLOCKS = 8_000;
const MAX_CHUNKS = 20;
const ENRICH_CANDIDATE_LIMIT = 40;

type ScoredContractEvent = LandingTxExample & {
  blockNumber: number;
  logIndex: number;
};

function isEventLog(log: Log | EventLog): log is EventLog {
  return (log as EventLog).blockNumber != null;
}

async function queryLogsInChunks(
  gift: Contract,
  filter: ReturnType<Contract["filters"]["GiftFunded"]>,
  latest: number
) {
  const logs: EventLog[] = [];
  let toBlock = latest;

  for (let i = 0; i < MAX_CHUNKS && toBlock >= 0; i += 1) {
    const fromBlock = Math.max(0, toBlock - LOG_CHUNK_BLOCKS);
    const batch = await gift.queryFilter(filter, fromBlock, toBlock);
    for (const log of batch) {
      if (isEventLog(log)) logs.push(log);
    }
    if (fromBlock === 0) break;
    toBlock = fromBlock - 1;
  }

  return logs;
}

function mapContractLogs(
  logs: EventLog[],
  label: string
): ScoredContractEvent[] {
  return logs.map((log) => ({
    txHash: log.transactionHash,
    label,
    timestamp: new Date().toISOString(),
    blockNumber: log.blockNumber,
    logIndex: log.index,
  }));
}

function pickNewestUniqueEvents(
  items: ScoredContractEvent[],
  limit: number
): ScoredContractEvent[] {
  const sorted = [...items].sort((a, b) => {
    if (b.blockNumber !== a.blockNumber) return b.blockNumber - a.blockNumber;
    return b.logIndex - a.logIndex;
  });

  const seen = new Set<string>();
  const picked: ScoredContractEvent[] = [];
  for (const item of sorted) {
    const key = item.txHash.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(item);
    if (picked.length >= limit) break;
  }
  return picked;
}

async function attachBlockTimestamps(
  provider: Awaited<ReturnType<typeof createArcProviderWithContractCheck>>,
  items: ScoredContractEvent[]
): Promise<LandingTxExample[]> {
  const blockNumbers = [...new Set(items.map((item) => item.blockNumber))];
  const timestamps = new Map<number, string>();

  await Promise.all(
    blockNumbers.map(async (blockNumber) => {
      try {
        const block = await provider.getBlock(blockNumber);
        if (block?.timestamp) {
          timestamps.set(
            blockNumber,
            new Date(block.timestamp * 1000).toISOString()
          );
        }
      } catch {
        /* keep fallback timestamp */
      }
    })
  );

  return items.map(({ txHash, label, timestamp, blockNumber }) => ({
    txHash,
    label,
    timestamp: timestamps.get(blockNumber) ?? timestamp,
  }));
}

/** Last gift-contract events from chain logs (newest first, before global merge cap). */
export async function loadLiveTxExamplesFromChain(): Promise<LandingTxExample[]> {
  try {
    const { rpcUrl, contractAddress } = getArcReadEnv();
    const provider = await createArcProviderWithContractCheck(
      rpcUrl,
      contractAddress
    );
    const gift = new Contract(contractAddress, GIFT_EVENTS_ABI, provider);
    const latest = await provider.getBlockNumber();

    const [fundedLogs, claimedLogs, reclaimedLogs] = await Promise.all([
      queryLogsInChunks(gift, gift.filters.GiftFunded(), latest),
      queryLogsInChunks(gift, gift.filters.GiftClaimed(), latest),
      queryLogsInChunks(gift, gift.filters.GiftReclaimed(), latest),
    ]);

    const allEvents = [
      ...mapContractLogs(fundedLogs, "Gift funded by sender"),
      ...mapContractLogs(claimedLogs, "Recipient claim settled"),
      ...mapContractLogs(reclaimedLogs, "Expired gift reclaimed"),
    ];

    const candidates = pickNewestUniqueEvents(allEvents, ENRICH_CANDIDATE_LIMIT);
    return attachBlockTimestamps(provider, candidates);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "live_tx_chain_fallback_error",
        message: error instanceof Error ? error.message : "unknown",
      })
    );
    return [];
  }
}
