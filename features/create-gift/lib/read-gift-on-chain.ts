import { Contract, JsonRpcProvider, getAddress, parseUnits } from "ethers";
import { ARC_TESTNET } from "@/utils";
import { getPublicGiftContractAddress } from "./gift-usdc";

const GIFT_ABI = [
  "function gifts(bytes32 paymentIdHash) view returns (uint256 amount,address refundAddress,uint64 expiresAt,bool claimed)",
] as const;

export type OnChainGiftRow = {
  amount: bigint;
  refundAddress: string;
  expiresAt: bigint;
  claimed: boolean;
};

export async function readGiftOnChain(
  paymentIdHash: string
): Promise<OnChainGiftRow | null> {
  const addr = getPublicGiftContractAddress();
  if (!addr) return null;
  const provider = new JsonRpcProvider(ARC_TESTNET.rpcUrl);
  const gift = new Contract(addr, GIFT_ABI, provider);
  const row = (await gift.gifts(paymentIdHash)) as OnChainGiftRow;
  return row;
}

export async function waitForClientFundedGift(params: {
  paymentIdHash: string;
  amountUsdc: string;
  refundAddress: string;
  maxAttempts?: number;
  delayMs?: number;
}): Promise<OnChainGiftRow> {
  const expectedRaw = parseUnits(params.amountUsdc, 6);
  const refund = getAddress(params.refundAddress);
  const max = params.maxAttempts ?? 45;
  const delayMs = params.delayMs ?? 1000;

  for (let i = 0; i < max; i++) {
    const row = await readGiftOnChain(params.paymentIdHash);
    if (
      row &&
      row.amount === expectedRaw &&
      getAddress(row.refundAddress) === refund &&
      !row.claimed
    ) {
      return row;
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }

  throw new Error(
    "Timed out waiting for onchain funding. Check the explorer or try again."
  );
}
