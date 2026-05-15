import { Contract } from "ethers";
import { createArcProviderWithContractCheck } from "./arc-chain";
import { getArcReadEnv } from "./env";
import type { LandingTxExample } from "./load-live-tx-examples";

const GIFT_EVENTS_ABI = [
  "event GiftFunded(bytes32 indexed paymentIdHash, address indexed funder, address indexed refundAddress, uint256 amount, uint64 expiresAt)",
  "event GiftClaimed(bytes32 indexed paymentIdHash, address indexed recipient, uint256 amount)",
  "event GiftReclaimed(bytes32 indexed paymentIdHash, address indexed refundAddress, uint256 amount)",
];

/** Arc RPC allows ~10k blocks per eth_getLogs request. */
const LOG_CHUNK_BLOCKS = 8_000;
const MAX_CHUNKS = 6;

async function queryLogsInChunks(
  gift: Contract,
  filter: ReturnType<Contract["filters"]["GiftFunded"]>,
  latest: number
) {
  const logs: Awaited<ReturnType<Contract["queryFilter"]>> = [];
  let toBlock = latest;

  for (let i = 0; i < MAX_CHUNKS && toBlock >= 0; i += 1) {
    const fromBlock = Math.max(0, toBlock - LOG_CHUNK_BLOCKS);
    const batch = await gift.queryFilter(filter, fromBlock, toBlock);
    logs.push(...batch);
    if (fromBlock === 0) break;
    toBlock = fromBlock - 1;
  }

  return logs;
}

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

    const funded: LandingTxExample[] = fundedLogs.map((log) => ({
      txHash: log.transactionHash,
      label: "Gift funded by sender",
      timestamp: new Date().toISOString(),
    }));

    const claimed: LandingTxExample[] = claimedLogs.map((log) => ({
      txHash: log.transactionHash,
      label: "Recipient claim settled",
      timestamp: new Date().toISOString(),
    }));

    const reclaimed: LandingTxExample[] = reclaimedLogs.map((log) => ({
      txHash: log.transactionHash,
      label: "Expired gift reclaimed",
      timestamp: new Date().toISOString(),
    }));

    const withTimestamps = await Promise.all(
      [...funded, ...claimed, ...reclaimed].map(async (item) => {
        try {
          const receipt = await provider.getTransactionReceipt(item.txHash);
          if (!receipt?.blockNumber) return item;
          const block = await provider.getBlock(receipt.blockNumber);
          if (!block?.timestamp) return item;
          return {
            ...item,
            timestamp: new Date(block.timestamp * 1000).toISOString(),
          };
        } catch {
          return item;
        }
      })
    );

    return withTimestamps;
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
