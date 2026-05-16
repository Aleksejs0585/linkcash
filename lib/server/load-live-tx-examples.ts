import { claimAuditStore } from "./claim-audit-store";
import {
  liveActivityStore,
  liveActivityToLandingRow,
} from "./live-activity-store";
import { loadLiveTxExamplesFromChain } from "./live-tx-from-chain";
import {
  LANDING_LIVE_TX_LIMIT,
  mergeTxExamples,
  type LandingTxExample,
} from "./live-tx-merge";
import { senderGiftStore } from "./sender-gift-store";

export { LANDING_LIVE_TX_LIMIT, mergeTxExamples, type LandingTxExample };

async function loadFromLogFiles(): Promise<LandingTxExample[]> {
  const [senderEvents, claimEvents] = await Promise.all([
    senderGiftStore.readRecent(120),
    claimAuditStore.readRecent(240),
  ]);

  const funded = senderEvents
    .filter((event) => event.event === "gift_funded")
    .map((event) => ({
      txHash: event.txHash,
      label: "Gift funded by sender",
      timestamp: event.timestamp,
    }));

  const reclaimed = senderEvents
    .filter((event) => event.event === "gift_reclaimed")
    .map((event) => ({
      txHash: event.txHash,
      label: "Expired gift reclaimed",
      timestamp: event.timestamp,
    }));

  const claimed = claimEvents
    .filter((event) => event.event === "claim_success" && event.txHash)
    .map((event) => ({
      txHash: event.txHash!,
      label: "Recipient claim settled",
      timestamp: event.timestamp,
    }));

  return [...claimed, ...funded, ...reclaimed];
}

/**
 * Landing feed: prefer on-chain gift-contract events, then merge Redis/logs.
 */
export async function loadLiveTxExamples(): Promise<LandingTxExample[]> {
  const [fromChain, fromRedis, fromFiles] = await Promise.all([
    loadLiveTxExamplesFromChain(),
    liveActivityStore.readRecent(120).then((rows) =>
      rows.map(liveActivityToLandingRow)
    ),
    loadFromLogFiles(),
  ]);

  return mergeTxExamples([...fromChain, ...fromRedis, ...fromFiles]);
}
