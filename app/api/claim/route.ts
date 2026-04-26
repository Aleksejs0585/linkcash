import { NextResponse } from "next/server";
import { Contract, JsonRpcProvider, Wallet, isAddress, isHexString } from "ethers";

type ClaimBody = {
  secret?: string;
  receiverAddress?: string;
};

const CLAIM_ABI = ["function claim(bytes32 secret,address receiver)"];

export async function POST(request: Request) {
  try {
    const { secret, receiverAddress } = (await request.json()) as ClaimBody;

    if (!secret || !receiverAddress) {
      return NextResponse.json(
        { error: "secret and receiverAddress are required" },
        { status: 400 }
      );
    }

    if (!isHexString(secret, 32)) {
      return NextResponse.json(
        { error: "secret must be a bytes32 hex string" },
        { status: 400 }
      );
    }

    if (!isAddress(receiverAddress)) {
      return NextResponse.json(
        { error: "receiverAddress must be a valid address" },
        { status: 400 }
      );
    }

    const rpcUrl = process.env.RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;
    const contractAddress = process.env.CONTRACT_ADDRESS;

    if (!rpcUrl || !privateKey || !contractAddress) {
      return NextResponse.json(
        { error: "Missing RPC_URL, PRIVATE_KEY or CONTRACT_ADDRESS" },
        { status: 500 }
      );
    }

    const provider = new JsonRpcProvider(rpcUrl);
    const relayer = new Wallet(privateKey, provider);
    const contract = new Contract(contractAddress, CLAIM_ABI, relayer);

    const tx = await contract.claim(secret, receiverAddress);
    const receipt = await tx.wait();

    return NextResponse.json({
      txHash: receipt?.hash ?? tx.hash,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
