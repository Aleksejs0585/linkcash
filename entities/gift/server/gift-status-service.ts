import { getArcExplorerTxUrl } from "@/utils";
import { claimAuditStore } from "@/lib/server/claim-audit-store";
import { senderGiftStore } from "@/lib/server/sender-gift-store";
import { getGiftByHash } from "./gift-service";

// In-process cache: avoids re-reading 3000 log entries on every status poll.
// Terminal states (claimed/reclaimed) are cached for 1 hour; active for 15s.
type CacheEntry = { result: PublicGiftStatusResult; expiresAt: number };
const gState = globalThis as typeof globalThis & { __statusCache?: Map<string, CacheEntry> };
function statusCache(): Map<string, CacheEntry> {
  if (!gState.__statusCache) gState.__statusCache = new Map();
  return gState.__statusCache;
}
function pruneCache() {
  const cache = statusCache();
  if (cache.size < 500) return;
  const now = Date.now();
  for (const [k, v] of cache) {
    if (v.expiresAt <= now) cache.delete(k);
  }
}
function getCached(hash: string): PublicGiftStatusResult | null {
  const entry = statusCache().get(hash);
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return entry.result;
}
function setCached(hash: string, result: PublicGiftStatusResult) {
  const isTerminal = result.status === "claimed" || result.status === "reclaimed";
  const ttl = isTerminal ? 3_600_000 : 15_000;
  statusCache().set(hash, { result, expiresAt: Date.now() + ttl });
  pruneCache();
}

export type PublicGiftStatus =
  | "active"
  | "claimed"
  | "expired"
  | "reclaimed"
  | "not_found";

export type PublicGiftTimelineStep = {
  id: string;
  title: string;
  description: string;
  state: "completed" | "pending" | "unavailable";
  timestamp?: string;
  txHash?: string;
  explorerUrl?: string;
};

export type PublicGiftStatusResult = {
  ok: boolean;
  paymentIdHash: string;
  status: PublicGiftStatus;
  amountUsdc?: string;
  expiresAt?: number;
  claimed?: boolean;
  whereFunds: string;
  tx: {
    fundingTxHash?: string;
    claimTxHash?: string;
    reclaimTxHash?: string;
  };
  timeline: PublicGiftTimelineStep[];
  error?: string;
};

function toTxRef(txHash?: string) {
  if (!txHash) return {};
  return {
    txHash,
    explorerUrl: getArcExplorerTxUrl(txHash),
  };
}

export async function getPublicGiftStatus(
  paymentIdHash: string,
): Promise<PublicGiftStatusResult> {
  const cached = getCached(paymentIdHash);
  if (cached) return cached;

  const [giftResult, senderEvents, claimEvents] = await Promise.all([
    getGiftByHash({ hash: paymentIdHash }),
    senderGiftStore.readRecent(1000),
    claimAuditStore.readRecent(2000),
  ]);

  if (!giftResult.ok) {
    return {
      ok: false,
      paymentIdHash,
      status: "not_found",
      whereFunds: "Gift was not found onchain for this hash.",
      tx: {},
      timeline: [],
      error: giftResult.error,
    };
  }

  const relatedSenderEvents = senderEvents.filter(
    (event) => event.paymentIdHash.toLowerCase() === paymentIdHash.toLowerCase()
  );
  const fundedEvent = relatedSenderEvents.find((event) => event.event === "gift_funded");
  const reclaimedEvent = [...relatedSenderEvents]
    .reverse()
    .find((event) => event.event === "gift_reclaimed");

  const claimSuccessEvent = [...claimEvents]
    .reverse()
    .find(
      (event) =>
        event.event === "claim_success" &&
        event.paymentIdHash?.toLowerCase() === paymentIdHash.toLowerCase() &&
        Boolean(event.txHash)
    );

  const nowSec = Math.floor(Date.now() / 1000);
  let status: PublicGiftStatus = "active";
  if (reclaimedEvent) {
    status = "reclaimed";
  } else if (giftResult.claimed) {
    status = "claimed";
  } else if ((giftResult.expiresAt ?? 0) <= nowSec) {
    status = "expired";
  }

  const whereFundsByStatus: Record<Exclude<PublicGiftStatus, "not_found">, string> = {
    active: "Funds are locked in the gift contract and ready to be claimed.",
    claimed: "Funds were transferred to the recipient wallet.",
    expired: "Gift expired. Funds remain reclaimable by the sender wallet.",
    reclaimed: "Funds were reclaimed and returned to the sender wallet.",
  };

  const timeline: PublicGiftTimelineStep[] = [
    {
      id: "funded",
      title: "Gift funded",
      description: fundedEvent
        ? "Sender deposited USDC into gift contract."
        : "Gift exists onchain but funding log was not found locally.",
      state: fundedEvent ? "completed" : "unavailable",
      timestamp: fundedEvent?.timestamp,
      ...toTxRef(fundedEvent?.txHash),
    },
    {
      id: "claim-submitted",
      title: "Claim transaction",
      description:
        status === "reclaimed"
          ? "Claim was not finalized because sender reclaimed after expiry."
          : claimSuccessEvent
            ? "Claim was submitted and settled onchain."
            : "Waiting for recipient claim execution.",
      state:
        status === "reclaimed"
          ? "unavailable"
          : claimSuccessEvent
            ? "completed"
            : "pending",
      timestamp: claimSuccessEvent?.timestamp,
      ...toTxRef(claimSuccessEvent?.txHash),
    },
    {
      id: "destination",
      title: "Final funds destination",
      description:
        status === "claimed"
          ? "Recipient wallet received USDC."
          : status === "reclaimed"
            ? "Sender wallet received reclaimed USDC."
            : status === "expired"
              ? "Awaiting sender reclaim transaction."
              : "Awaiting recipient claim transaction.",
      state:
        status === "claimed" || status === "reclaimed"
          ? "completed"
          : "pending",
      timestamp: reclaimedEvent?.timestamp,
      ...toTxRef(reclaimedEvent?.txHash),
    },
  ];

  const result: PublicGiftStatusResult = {
    ok: true,
    paymentIdHash,
    status,
    amountUsdc: giftResult.amountUsdc,
    expiresAt: giftResult.expiresAt,
    claimed: giftResult.claimed,
    whereFunds: whereFundsByStatus[status],
    tx: {
      fundingTxHash: fundedEvent?.txHash,
      claimTxHash: claimSuccessEvent?.txHash,
      reclaimTxHash: reclaimedEvent?.txHash,
    },
    timeline,
  };
  setCached(paymentIdHash, result);
  return result;
}

