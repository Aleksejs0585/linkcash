import { NextResponse } from "next/server";
import { Contract, JsonRpcProvider, formatUnits, isHexString } from "ethers";
import { ARC_TESTNET } from "../../../../utils";

const GIFT_ABI = [
  "function gifts(bytes32 paymentIdHash) view returns (uint256 amount,address refundAddress,uint64 expiresAt,bool claimed)",
];

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await context.params;
    if (!isHexString(hash, 32)) {
      return NextResponse.json(
        { ok: false, error: "Invalid gift hash." },
        { status: 400 }
      );
    }

    const rpcUrl = process.env.RPC_URL;
    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!rpcUrl || !contractAddress) {
      return NextResponse.json(
        { ok: false, error: "Missing RPC_URL or CONTRACT_ADDRESS." },
        { status: 500 }
      );
    }

    const provider = new JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== ARC_TESTNET.chainId) {
      return NextResponse.json(
        { ok: false, error: `RPC_URL must point to Arc Testnet (${ARC_TESTNET.chainId}).` },
        { status: 500 }
      );
    }

    const contract = new Contract(contractAddress, GIFT_ABI, provider);
    const gift = (await contract.gifts(hash)) as {
      amount: bigint;
      refundAddress: string;
      expiresAt: bigint;
      claimed: boolean;
    };

    if (gift.amount <= 0n) {
      return NextResponse.json(
        { ok: false, error: "Gift not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      amountUsdc: formatUnits(gift.amount, 6),
      expiresAt: Number(gift.expiresAt),
      claimed: gift.claimed,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load gift details.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
