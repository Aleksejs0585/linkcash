import { NextResponse } from "next/server";
import { Contract, formatUnits, isAddress } from "ethers";
import { createArcProviderWithContractCheck } from "../../../lib/server/arc-chain";
import { getArcReadEnv } from "../../../lib/server/env";
import { senderGiftStore } from "../../../lib/server/sender-gift-store";

const GIFT_ABI = [
  "function gifts(bytes32 paymentIdHash) view returns (uint256 amount,address refundAddress,uint64 expiresAt,bool claimed)",
];

type SenderGiftStatus = "active" | "expired" | "claimed" | "reclaimed";

type SenderGiftItem = {
  paymentIdHash: string;
  status: SenderGiftStatus;
  amountUsdc: string;
  refundAddress: string;
  expiresAt: number;
  createdAt: string;
  fundedTxHash: string;
  reclaimTxHash?: string;
};

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const senderAddress = url.searchParams.get("senderAddress")?.trim();

    if (!senderAddress || !isAddress(senderAddress)) {
      return NextResponse.json(
        { ok: false, error: "senderAddress query param must be a valid address." },
        { status: 400 }
      );
    }

    const { rpcUrl, contractAddress } = getArcReadEnv();

    const normalizedSender = senderAddress.toLowerCase();
    const events = await senderGiftStore.readRecent(1000);
    const fundedEvents = events
      .filter(
        (entry) =>
          entry.event === "gift_funded" &&
          entry.refundAddress.toLowerCase() === normalizedSender
      )
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

    if (fundedEvents.length === 0) {
      return NextResponse.json({ ok: true, gifts: [] satisfies SenderGiftItem[] });
    }

    const latestFundedByHash = new Map<string, (typeof fundedEvents)[number]>();
    for (const funded of fundedEvents) {
      if (!latestFundedByHash.has(funded.paymentIdHash)) {
        latestFundedByHash.set(funded.paymentIdHash, funded);
      }
    }

    const reclaimByHash = new Map<string, string>();
    for (const entry of events) {
      if (
        entry.event === "gift_reclaimed" &&
        entry.refundAddress.toLowerCase() === normalizedSender
      ) {
        reclaimByHash.set(entry.paymentIdHash, entry.txHash);
      }
    }

    const provider = await createArcProviderWithContractCheck(
      rpcUrl,
      contractAddress
    );

    const contract = new Contract(contractAddress, GIFT_ABI, provider);
    const gifts = await Promise.all(
      Array.from(latestFundedByHash.values()).map(async (entry) => {
        const state = (await contract.gifts(entry.paymentIdHash)) as {
          amount: bigint;
          refundAddress: string;
          expiresAt: bigint;
          claimed: boolean;
        };

        const expiresAt = Number(state.expiresAt);
        const reclaimedTxHash = reclaimByHash.get(entry.paymentIdHash);
        const nowSec = Math.floor(Date.now() / 1000);

        let status: SenderGiftStatus = "active";
        if (state.claimed) {
          status = reclaimedTxHash ? "reclaimed" : "claimed";
        } else if (nowSec >= expiresAt) {
          status = "expired";
        }

        return {
          paymentIdHash: entry.paymentIdHash,
          status,
          amountUsdc: formatUnits(state.amount, 6),
          refundAddress: state.refundAddress,
          expiresAt,
          createdAt: entry.timestamp,
          fundedTxHash: entry.txHash,
          reclaimTxHash: reclaimedTxHash,
        } satisfies SenderGiftItem;
      })
    );

    return NextResponse.json({ ok: true, gifts });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load sender gifts.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
