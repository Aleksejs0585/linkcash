import { Contract, type EventLog, type Log, Wallet, formatUnits, getAddress, parseUnits } from "ethers";
import { createArcProviderWithContractCheck } from "@/lib/server/arc-chain";
import { getArcReadEnv, getArcRelayerEnv } from "@/lib/server/env";
import { HttpError } from "@/lib/server/http-errors";
import { giftMetadataStore } from "@/lib/server/gift-metadata-store";
import { buildGiftMetadata } from "@/lib/server/gift-metadata";
import { senderGiftStore } from "@/lib/server/sender-gift-store";
import type {
  CreateGiftInput,
  GiftHashInput,
  ReclaimGiftInput,
  ReceiverGiftsInput,
  SenderGiftsInput,
} from "./gift-validation";

const GIFT_ABI = [
  "function fundGift(bytes32 paymentIdHash,uint256 amount,address refundAddress,uint64 expiresAt)",
  "function reclaimExpiredGift(bytes32 paymentIdHash)",
  "function gifts(bytes32 paymentIdHash) view returns (uint256 amount,address refundAddress,uint64 expiresAt,bool claimed)",
];
const ERC20_ABI = [
  "function allowance(address owner,address spender) view returns (uint256)",
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

async function persistGiftMetadata(input: CreateGiftInput): Promise<void> {
  const metadata = buildGiftMetadata(
    input.senderDisplayName,
    input.giftMessage
  );
  await giftMetadataStore.set(input.paymentIdHash, metadata);
}

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
    input.refundAddress,
    contractAddress
  )) as bigint;
  if (allowance < amountRaw) {
    throw new HttpError(
      400,
      "Insufficient USDC allowance for the gift contract. Approve USDC in your wallet, then try again."
    );
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

  await persistGiftMetadata(input);

  return {
    ok: true as const,
    txHash,
    refundAddress: input.refundAddress,
    expiresAt: Number(expiresAt),
  };
}

const GIFT_EVENTS_ABI = [
  ...GIFT_ABI,
  "event GiftFunded(bytes32 indexed paymentIdHash,address indexed funder,address indexed refundAddress,uint256 amount,uint64 expiresAt)",
] as const;

async function findFundGiftTxHash(
  gift: Contract,
  paymentIdHash: string,
  latestBlock: number
): Promise<string | null> {
  try {
    const filter = gift.filters.GiftFunded(paymentIdHash);
    const window = 9_000;
    let to = latestBlock;
    for (let wave = 0; wave < 8; wave++) {
      const from = Math.max(0, to - window);
      const logs = await gift.queryFilter(filter, from, to);
      if (logs.length > 0) {
        const last = logs[logs.length - 1];
        return last.transactionHash;
      }
      if (from === 0) break;
      to = from - 1;
    }
  } catch {
    /* ignore explorer/RPC limitations */
  }
  return null;
}

export async function syncClientFundedGift(input: CreateGiftInput) {
  const { rpcUrl, contractAddress } = getArcReadEnv();
  const provider = await createArcProviderWithContractCheck(rpcUrl, contractAddress);
  const gift = new Contract(contractAddress, GIFT_EVENTS_ABI, provider);

  const existingEvents = await senderGiftStore.readRecent(2500);
  const already = existingEvents.find(
    (entry) =>
      entry.event === "gift_funded" &&
      entry.paymentIdHash.toLowerCase() === input.paymentIdHash.toLowerCase()
  );
  if (already) {
    const state = (await gift.gifts(input.paymentIdHash)) as {
      expiresAt: bigint;
    };
    await persistGiftMetadata(input);
    return {
      ok: true as const,
      txHash: already.txHash,
      refundAddress: input.refundAddress,
      expiresAt: Number(state.expiresAt),
      cached: true as const,
    };
  }

  const expectedRaw = parseUnits(input.amountUsdc, 6);
  const state = (await gift.gifts(input.paymentIdHash)) as {
    amount: bigint;
    refundAddress: string;
    expiresAt: bigint;
    claimed: boolean;
  };

  if (state.amount <= BigInt(0)) {
    throw new HttpError(
      400,
      "Gift is not visible onchain yet. Confirm the wallet transaction, then try again."
    );
  }
  if (state.amount !== expectedRaw) {
    throw new HttpError(400, "Onchain gift amount does not match this request.");
  }
  if (state.claimed) {
    throw new HttpError(400, "This gift is already finalized onchain.");
  }
  if (getAddress(state.refundAddress) !== getAddress(input.refundAddress)) {
    throw new HttpError(400, "Onchain refund wallet does not match.");
  }

  const expiresAtNum = Number(state.expiresAt);
  const nowSec = Math.floor(Date.now() / 1000);
  if (expiresAtNum <= nowSec) {
    throw new HttpError(400, "This gift is already expired onchain.");
  }

  const latestBlock = await provider.getBlockNumber();
  let txHash = await findFundGiftTxHash(gift, input.paymentIdHash, latestBlock);
  if (!txHash) {
    txHash = `client-funded:${input.paymentIdHash.slice(2, 18)}`;
  }

  await senderGiftStore.write({
    event: "gift_funded",
    timestamp: new Date().toISOString(),
    paymentIdHash: input.paymentIdHash,
    refundAddress: input.refundAddress.toLowerCase(),
    amountRaw: expectedRaw.toString(),
    expiresAt: expiresAtNum,
    txHash,
  });

  await persistGiftMetadata(input);

  return {
    ok: true as const,
    txHash,
    refundAddress: input.refundAddress,
    expiresAt: expiresAtNum,
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

  if (giftState.amount === BigInt(0)) {
    throw new HttpError(404, "No gift found for this payment id.");
  }
  if (giftState.claimed) {
    throw new HttpError(400, "This gift was already claimed or reclaimed.");
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec < Number(giftState.expiresAt)) {
    throw new HttpError(
      400,
      "Gift is still active. Reclaim is available only after the expiry time."
    );
  }

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
  const gift = await Promise.race([
    contract.gifts(input.hash) as Promise<{
      amount: bigint;
      refundAddress: string;
      expiresAt: bigint;
      claimed: boolean;
    }>,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Arc RPC timeout")), 8_000)
    ),
  ]);

  if (gift.amount <= BigInt(0)) {
    return { ok: false as const, error: "Gift not found.", status: 404 };
  }

  const metadata = await giftMetadataStore.get(input.hash);

  return {
    ok: true as const,
    amountUsdc: formatUnits(gift.amount, 6),
    refundAddress: getAddress(gift.refundAddress),
    expiresAt: Number(gift.expiresAt),
    claimed: gift.claimed,
    senderDisplayName: metadata?.senderDisplayName,
    giftMessage: metadata?.giftMessage,
    createdAt: metadata?.createdAt ?? null,
  };
}

const GIFT_FUNDED_ABI = [
  ...GIFT_ABI,
  "event GiftFunded(bytes32 indexed paymentIdHash, address indexed funder, address indexed refundAddress, uint256 amount, uint64 expiresAt)",
] as const;

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
  const nowSec = Math.floor(Date.now() / 1000);

  // Store-based path
  if (fundedEvents.length > 0) {
    const latestFundedByHash = new Map<string, (typeof fundedEvents)[number]>();
    for (const funded of fundedEvents) {
      if (!latestFundedByHash.has(funded.paymentIdHash)) {
        latestFundedByHash.set(funded.paymentIdHash, funded);
      }
    }

    const gifts = await Promise.all(
      Array.from(latestFundedByHash.values()).map(async (entry) => {
        const state = (await contract.gifts(entry.paymentIdHash)) as {
          amount: bigint;
          refundAddress: string;
          expiresAt: bigint;
          claimed: boolean;
        };
        // After reclaimExpiredGift the contract may zero the struct (gas refund).
        // Trust the Redis reclaim record over on-chain state for status + display.
        const reclaimedTxHash = reclaimByHash.get(entry.paymentIdHash);
        const expiresAt = Number(state.expiresAt) || Number(entry.expiresAt) || 0;
        const amountUsdc =
          reclaimedTxHash && state.amount === BigInt(0) && entry.amountRaw
            ? formatUnits(BigInt(entry.amountRaw), 6)
            : formatUnits(state.amount, 6);

        let status: SenderGiftStatus = "active";
        if (reclaimedTxHash) {
          status = "reclaimed";
        } else if (state.claimed) {
          status = "claimed";
        } else if (nowSec >= expiresAt) {
          status = "expired";
        }

        return {
          paymentIdHash: entry.paymentIdHash,
          status,
          amountUsdc,
          refundAddress: state.refundAddress || entry.refundAddress,
          expiresAt,
          createdAt: entry.timestamp,
          fundedTxHash: entry.txHash,
          reclaimTxHash: reclaimedTxHash,
        } satisfies SenderGiftItem;
      })
    );

    return { ok: true as const, gifts };
  }

  // Blockchain fallback — store has no entries for this address (pre-store gifts).
  // Wrap in try/catch: a new user has no on-chain events so RPC errors here
  // should surface as an empty list, not a 500.
  let allLogs: EventLog[];
  try {
    const eventContract = new Contract(contractAddress, GIFT_FUNDED_ABI, provider);
    const latestBlock = await provider.getBlockNumber();
    const filter = eventContract.filters.GiftFunded(null, null, input.senderAddress);

    const LOG_CHUNK = 9_000;
    const MAX_CHUNKS = 80;
    allLogs = [];
    let toBlock = latestBlock;

    for (let i = 0; i < MAX_CHUNKS && toBlock >= 0; i++) {
      const fromBlock = Math.max(0, toBlock - LOG_CHUNK);
      const batch = await eventContract.queryFilter(filter, fromBlock, toBlock);
      for (const log of batch) {
        if ((log as EventLog).args) allLogs.push(log as EventLog);
      }
      if (fromBlock === 0) break;
      toBlock = fromBlock - 1;
    }
  } catch {
    return { ok: true as const, gifts: [] as SenderGiftItem[] };
  }

  if (allLogs.length === 0) {
    return { ok: true as const, gifts: [] as SenderGiftItem[] };
  }

  // Deduplicate — keep first occurrence per paymentIdHash
  const seenHashes = new Set<string>();
  const uniqueLogs = allLogs.filter((log) => {
    const h = log.args[0] as string;
    if (seenHashes.has(h)) return false;
    seenHashes.add(h);
    return true;
  });

  const gifts = await Promise.all(
    uniqueLogs.map(async (log) => {
      const paymentIdHash = log.args[0] as string;
      const [state, block] = await Promise.all([
        contract.gifts(paymentIdHash) as Promise<{
          amount: bigint;
          refundAddress: string;
          expiresAt: bigint;
          claimed: boolean;
        }>,
        provider.getBlock(log.blockNumber),
      ]);
      const reclaimedTxHash = reclaimByHash.get(paymentIdHash);
      // Fallback to event args if contract struct was zeroed after reclaim.
      const logExpiresAt = typeof log.args[4] === "bigint" ? Number(log.args[4]) : 0;
      const logAmount = typeof log.args[3] === "bigint" ? log.args[3] : BigInt(0);
      const expiresAt = Number(state.expiresAt) || logExpiresAt || 0;
      const amountUsdc =
        reclaimedTxHash && state.amount === BigInt(0)
          ? formatUnits(logAmount, 6)
          : formatUnits(state.amount, 6);
      const createdAt = block?.timestamp
        ? new Date(block.timestamp * 1000).toISOString()
        : new Date().toISOString();

      let status: SenderGiftStatus = "active";
      if (reclaimedTxHash) {
        status = "reclaimed";
      } else if (state.claimed) {
        status = "claimed";
      } else if (nowSec >= expiresAt) {
        status = "expired";
      }

      return {
        paymentIdHash,
        status,
        amountUsdc,
        refundAddress: state.refundAddress || (log.args[2] as string),
        expiresAt,
        createdAt,
        fundedTxHash: log.transactionHash,
        reclaimTxHash: reclaimedTxHash,
      } satisfies SenderGiftItem;
    })
  );

  return { ok: true as const, gifts };
}

const GIFT_CLAIMED_ABI = [
  "event GiftClaimed(bytes32 indexed paymentIdHash, address indexed recipient, uint256 amount)",
];

export async function getReceivedGifts(input: ReceiverGiftsInput) {
  const { rpcUrl, contractAddress } = getArcReadEnv();
  const provider = await createArcProviderWithContractCheck(rpcUrl, contractAddress);
  const contract = new Contract(contractAddress, GIFT_CLAIMED_ABI, provider);

  let logs: EventLog[];
  try {
    const latestBlock = await provider.getBlockNumber();
    const filter = contract.filters.GiftClaimed(null, input.receiverAddress);

    const LOG_CHUNK = 9_000;
    const MAX_CHUNKS = 80;
    let toBlock = latestBlock;
    logs = [];

    for (let i = 0; i < MAX_CHUNKS && toBlock >= 0; i++) {
      const fromBlock = Math.max(0, toBlock - LOG_CHUNK);
      const batch = await contract.queryFilter(filter, fromBlock, toBlock);
      for (const log of batch) {
        if ((log as EventLog).args) logs.push(log as EventLog);
      }
      if (fromBlock === 0) break;
      toBlock = fromBlock - 1;
    }
  } catch {
    return { ok: true as const, gifts: [] };
  }

  logs.sort((a, b) => b.blockNumber - a.blockNumber);

  const gifts = await Promise.all(
    logs.map(async (log) => {
      const paymentIdHash = log.args[0] as string;
      const amount = log.args[2] as bigint;
      const metadata = await giftMetadataStore.get(paymentIdHash);
      return {
        paymentIdHash,
        amountUsdc: formatUnits(amount, 6),
        txHash: log.transactionHash,
        senderDisplayName: metadata?.senderDisplayName ?? null,
        giftMessage: metadata?.giftMessage ?? null,
        claimedAt: metadata?.createdAt ?? null,
      };
    })
  );

  return { ok: true as const, gifts };
}

