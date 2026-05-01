import { getArcExplorerTxUrl } from "@/utils";
import { claimAuditStore } from "@/lib/server/claim-audit-store";
import { senderGiftStore } from "@/lib/server/sender-gift-store";
import { getGiftByHash } from "./gift-service";

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
  paymentIdHash: string
): Promise<PublicGiftStatusResult> {
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

  return {
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
}

