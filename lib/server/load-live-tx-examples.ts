import { claimAuditStore } from "./claim-audit-store";
import {
  liveActivityStore,
  liveActivityToLandingRow,
} from "./live-activity-store";
import { loadLiveTxExamplesFromChain } from "./live-tx-from-chain";
import { senderGiftStore } from "./sender-gift-store";

export type LandingTxExample = {
  txHash: string;
  label: string;
  timestamp: string;
};

function mergeTxExamples(items: LandingTxExample[]): LandingTxExample[] {
  const seen = new Set<string>();
  return items
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .filter((item) => {
      const key = item.txHash.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

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

  return mergeTxExamples([...claimed, ...funded, ...reclaimed]);
}

export async function loadLiveTxExamples(): Promise<LandingTxExample[]> {
  const fromRedis = (await liveActivityStore.readRecent(80)).map(
    liveActivityToLandingRow
  );
  if (fromRedis.length > 0) {
    return mergeTxExamples(fromRedis);
  }

  const fromFiles = await loadFromLogFiles();
  if (fromFiles.length > 0) {
    return fromFiles;
  }

  const fromChain = await loadLiveTxExamplesFromChain();
  return mergeTxExamples(fromChain);
}
