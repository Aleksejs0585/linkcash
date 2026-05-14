import { Contract, JsonRpcProvider, isAddress, parseUnits } from "ethers";
import { ARC_TESTNET } from "@/utils";

const ERC20_ALLOWANCE_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
];

export function getPublicGiftContractAddress(): string | null {
  const raw = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim();
  if (!raw || !isAddress(raw)) return null;
  return raw;
}

export async function readUsdcAllowanceToGift(
  ownerAddress: string,
  giftContractAddress: string,
  amountUsdc: string
): Promise<{ allowance: bigint; required: bigint }> {
  const provider = new JsonRpcProvider(ARC_TESTNET.rpcUrl);
  const usdc = new Contract(
    ARC_TESTNET.usdcErc20Address,
    ERC20_ALLOWANCE_ABI,
    provider
  );
  const allowance = (await usdc.allowance(
    ownerAddress,
    giftContractAddress
  )) as bigint;
  const required = parseUnits(amountUsdc, 6);
  return { allowance, required };
}
