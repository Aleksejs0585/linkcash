import { NextResponse } from "next/server";
import { Contract, JsonRpcProvider, Wallet, isHexString } from "ethers";
import { ARC_TESTNET } from "../../../utils";

type ReclaimGiftBody = {
  paymentIdHash?: string;
};

const GIFT_ABI = ["function reclaimExpiredGift(bytes32 paymentIdHash)"];

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

    const rpcUrl = process.env.RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;
    const contractAddress = process.env.CONTRACT_ADDRESS;

    if (!rpcUrl || !privateKey || !contractAddress) {
      return NextResponse.json(
        { error: "Missing RPC_URL, PRIVATE_KEY or CONTRACT_ADDRESS." },
        { status: 500 }
      );
    }

    const provider = new JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== ARC_TESTNET.chainId) {
      return NextResponse.json(
        { error: `RPC_URL must point to Arc Testnet (${ARC_TESTNET.chainId}).` },
        { status: 500 }
      );
    }

    const contractCode = await provider.getCode(contractAddress);
    if (!contractCode || contractCode === "0x") {
      return NextResponse.json(
        {
          error:
            "CONTRACT_ADDRESS is not a deployed contract on the configured network.",
        },
        { status: 500 }
      );
    }

    const relayer = new Wallet(privateKey, provider);
    const gift = new Contract(contractAddress, GIFT_ABI, relayer);

    const tx = await gift.reclaimExpiredGift(paymentIdHash);
    const receipt = await tx.wait();

    return NextResponse.json({
      ok: true,
      txHash: receipt?.hash ?? tx.hash,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reclaim expired gift.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
