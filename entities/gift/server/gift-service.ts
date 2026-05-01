import { Contract, Wallet, formatUnits, parseUnits } from "ethers";
import { createArcProviderWithContractCheck } from "@/lib/server/arc-chain";
import { getArcReadEnv, getArcRelayerEnv } from "@/lib/server/env";
import { senderGiftStore } from "@/lib/server/sender-gift-store";
import type {
  CreateGiftInput,
  GiftHashInput,
  ReclaimGiftInput,
  SenderGiftsInput,
} from "./gift-validation";

const GIFT_ABI = [
  "function fundGift(bytes32 paymentIdHash,uint256 amount,address refundAddress,uint64 expiresAt)",
  "function reclaimExpiredGift(bytes32 paymentIdHash)",
  "function gifts(bytes32 paymentIdHash) view returns (uint256 amount,address refundAddress,uint64 expiresAt,bool claimed)",
];
const ERC20_ABI = [
  "function allowance(address owner,address spender) view returns (uint256)",
  "function approve(address spender,uint256 amount) returns (bool)",
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

export async function createGift(input: CreateGiftInput) {
  const { rpcUrl, privateKey, contractAddress, usdcAddress } = getArcRelayerEnv();
  const provider = await createArcProviderWithContractCheck(rpcUrl, contractAddress);
  const relayer = new Wallet(privateKey, provider);
  const usdc = new Contract(usdcAddress, ERC20_ABI, relayer);
  const gift = new Contract(contractAddress, GIFT_ABI, relayer);

  const amountRaw = parseUnits(input.amountUsdc, 6);
  const expiresAt = BigInt(
    Math.floor(Date.now() / 1000) + Math.floor(input.expiresInHours * 60 * 60)
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
    input.paymentIdHash,
    amountRaw,
    input.refundAddress,
    expiresAt
  );
  const receipt = await tx.wait();
  const txHash = receipt?.hash ?? tx.hash;

  await senderGiftStore.write({
    event: "gift_funded",
    timestamp: new Date().toISOString(),
    paymentIdHash: input.paymentIdHash,
    refundAddress: input.refundAddress.toLowerCase(),
    amountRaw: amountRaw.toString(),
    expiresAt: Number(expiresAt),
    txHash,
  });

  return {
    ok: true as const,
    txHash,
    refundAddress: input.refundAddress,
    expiresAt: Number(expiresAt),
  };
}

export async function reclaimGift(input: ReclaimGiftInput) {
  const { rpcUrl, privateKey, contractAddress } = getArcRelayerEnv();
  const provider = await createArcProviderWithContractCheck(rpcUrl, contractAddress);
  const relayer = new Wallet(privateKey, provider);
  const gift = new Contract(contractAddress, GIFT_ABI, relayer);
  const giftState = (await gift.gifts(input.paymentIdHash)) as {
    amount: bigint;
    refundAddress: string;
    expiresAt: bigint;
    claimed: boolean;
  };

  const tx = await gift.reclaimExpiredGift(input.paymentIdHash);
  const receipt = await tx.wait();
  const txHash = receipt?.hash ?? tx.hash;

  await senderGiftStore.write({
    event: "gift_reclaimed",
    timestamp: new Date().toISOString(),
    paymentIdHash: input.paymentIdHash,
    refundAddress: giftState.refundAddress.toLowerCase(),
    txHash,
  });

  return { ok: true as const, txHash };
}

export async function getGiftByHash(input: GiftHashInput) {
  const { rpcUrl, contractAddress } = getArcReadEnv();
  const provider = await createArcProviderWithContractCheck(rpcUrl, contractAddress);
  const contract = new Contract(contractAddress, GIFT_ABI, provider);
  const gift = (await contract.gifts(input.hash)) as {
    amount: bigint;
    refundAddress: string;
    expiresAt: bigint;
    claimed: boolean;
  };

  if (gift.amount <= BigInt(0)) {
    return { ok: false as const, error: "Gift not found.", status: 404 };
  }

  return {
    ok: true as const,
    amountUsdc: formatUnits(gift.amount, 6),
    expiresAt: Number(gift.expiresAt),
    claimed: gift.claimed,
  };
}

export async function getSenderGifts(input: SenderGiftsInput) {
  const { rpcUrl, contractAddress } = getArcReadEnv();
  const normalizedSender = input.senderAddress.toLowerCase();
  const events = await senderGiftStore.readRecent(1000);
  const fundedEvents = events
    .filter(
      (entry) =>
        entry.event === "gift_funded" &&
        entry.refundAddress.toLowerCase() === normalizedSender
    )
    .sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

  if (fundedEvents.length === 0) {
    return { ok: true as const, gifts: [] as SenderGiftItem[] };
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

  const provider = await createArcProviderWithContractCheck(rpcUrl, contractAddress);
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

  return { ok: true as const, gifts };
}

