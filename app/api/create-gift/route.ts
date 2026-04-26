import { NextResponse } from "next/server";
import {
  Contract,
  JsonRpcProvider,
  Wallet,
  isAddress,
  isHexString,
  parseUnits,
} from "ethers";
import { ARC_TESTNET } from "../../../utils";
import { senderGiftStore } from "../../../lib/server/sender-gift-store";

type CreateGiftBody = {
  paymentIdHash?: string;
  amountUsdc?: string;
  refundAddress?: string;
  expiresInHours?: number;
};

const GIFT_ABI = [
  "function fundGift(bytes32 paymentIdHash,uint256 amount,address refundAddress,uint64 expiresAt)",
];
const ERC20_ABI = [
  "function allowance(address owner,address spender) view returns (uint256)",
  "function approve(address spender,uint256 amount) returns (bool)",
];

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateGiftBody;
    const paymentIdHash = body.paymentIdHash;
    const amountUsdc = body.amountUsdc;
    const refundAddress = body.refundAddress;
    const expiresInHours = Number(body.expiresInHours ?? 24);

    if (!paymentIdHash || !amountUsdc || !refundAddress) {
      return NextResponse.json(
        { error: "paymentIdHash, amountUsdc and refundAddress are required." },
        { status: 400 }
      );
    }

    if (!isHexString(paymentIdHash, 32)) {
      return NextResponse.json(
        { error: "paymentIdHash must be a bytes32 hex string." },
        { status: 400 }
      );
    }

    const amount = Number(amountUsdc);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "amountUsdc must be a positive number." },
        { status: 400 }
      );
    }

    if (!isAddress(refundAddress)) {
      return NextResponse.json(
        { error: "refundAddress must be a valid address." },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(expiresInHours) ||
      expiresInHours <= 0 ||
      expiresInHours > 24 * 30
    ) {
      return NextResponse.json(
        { error: "expiresInHours must be between 1 and 720." },
        { status: 400 }
      );
    }

    const rpcUrl = process.env.RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const usdcAddress =
      process.env.USDC_CONTRACT_ADDRESS || ARC_TESTNET.usdcErc20Address;

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
    const usdc = new Contract(usdcAddress, ERC20_ABI, relayer);
    const gift = new Contract(contractAddress, GIFT_ABI, relayer);

    const amountRaw = parseUnits(amountUsdc, 6);
    const expiresAt = BigInt(
      Math.floor(Date.now() / 1000) + Math.floor(expiresInHours * 60 * 60)
    );
    const allowance = (await usdc.allowance(
      relayer.address,
      contractAddress
    )) as bigint;

    if (allowance < amountRaw) {
      const approveTx = await usdc.approve(contractAddress, amountRaw);
      await approveTx.wait();
    }

    const tx = await gift.fundGift(
      paymentIdHash,
      amountRaw,
      refundAddress,
      expiresAt
    );
    const receipt = await tx.wait();
    const txHash = receipt?.hash ?? tx.hash;

    await senderGiftStore.write({
      event: "gift_funded",
      timestamp: new Date().toISOString(),
      paymentIdHash,
      refundAddress: refundAddress.toLowerCase(),
      amountRaw: amountRaw.toString(),
      expiresAt: Number(expiresAt),
      txHash,
    });

    return NextResponse.json({
      ok: true,
      txHash,
      refundAddress,
      expiresAt: Number(expiresAt),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fund gift.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
