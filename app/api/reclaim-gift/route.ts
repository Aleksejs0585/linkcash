import { NextResponse } from "next/server";
import { Contract, Wallet, isHexString } from "ethers";
import { createArcProviderWithContractCheck } from "../../../lib/server/arc-chain";
import { getArcRelayerEnv } from "../../../lib/server/env";
import { senderGiftStore } from "../../../lib/server/sender-gift-store";

type ReclaimGiftBody = {
  paymentIdHash?: string;
};

const GIFT_ABI = [
  "function reclaimExpiredGift(bytes32 paymentIdHash)",
  "function gifts(bytes32 paymentIdHash) view returns (uint256 amount,address refundAddress,uint64 expiresAt,bool claimed)",
];

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReclaimGiftBody;
    const paymentIdHash = body.paymentIdHash;

    if (!paymentIdHash) {
      return NextResponse.json(
        { error: "paymentIdHash is required." },
        { status: 400 }
      );
    }

    if (!isHexString(paymentIdHash, 32)) {
      return NextResponse.json(
        { error: "paymentIdHash must be a bytes32 hex string." },
        { status: 400 }
      );
    }

    const { rpcUrl, privateKey, contractAddress } = getArcRelayerEnv();
    const provider = await createArcProviderWithContractCheck(
      rpcUrl,
      contractAddress
    );

    const relayer = new Wallet(privateKey, provider);
    const gift = new Contract(contractAddress, GIFT_ABI, relayer);

    const giftState = (await gift.gifts(paymentIdHash)) as {
      amount: bigint;
      refundAddress: string;
      expiresAt: bigint;
      claimed: boolean;
    };

    const tx = await gift.reclaimExpiredGift(paymentIdHash);
    const receipt = await tx.wait();
    const txHash = receipt?.hash ?? tx.hash;

    await senderGiftStore.write({
      event: "gift_reclaimed",
      timestamp: new Date().toISOString(),
      paymentIdHash,
      refundAddress: giftState.refundAddress.toLowerCase(),
      txHash,
    });

    return NextResponse.json({
      ok: true,
      txHash,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reclaim expired gift.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
