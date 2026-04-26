import { NextResponse } from "next/server";
import {
  Contract,
  JsonRpcProvider,
  Wallet,
  isHexString,
  parseUnits,
} from "ethers";
import { ARC_TESTNET } from "../../../utils";

type CreateGiftBody = {
  paymentIdHash?: string;
  amountUsdc?: string;
};

const GIFT_ABI = ["function fundGift(bytes32 paymentIdHash,uint256 amount)"];
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

    if (!paymentIdHash || !amountUsdc) {
      return NextResponse.json(
        { error: "paymentIdHash and amountUsdc are required." },
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
    const allowance = (await usdc.allowance(
      relayer.address,
      contractAddress
    )) as bigint;

    if (allowance < amountRaw) {
      const approveTx = await usdc.approve(contractAddress, amountRaw);
      await approveTx.wait();
    }

    const tx = await gift.fundGift(paymentIdHash, amountRaw);
    const receipt = await tx.wait();

    return NextResponse.json({
      ok: true,
      txHash: receipt?.hash ?? tx.hash,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fund gift.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
