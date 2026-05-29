import { getAddress, isAddress, isHexString } from "ethers";
import { z } from "zod";
import { HttpError } from "@/lib/server/http-errors";
import {
  sanitizeGiftMessage,
  sanitizeSenderDisplayName,
} from "@/lib/server/gift-metadata";

export type CreateGiftInput = {
  paymentIdHash: string;
  amountUsdc: string;
  refundAddress: string;
  expiresInHours: number;
  senderDisplayName: string;
  giftMessage?: string;
  senderEmail?: string;
};

/** Parsed POST /api/create-gift body (optional on-chain sync path). */
export type CreateGiftParsed = CreateGiftInput & {
  syncClientFunding?: true;
};

export type ReclaimGiftInput = {
  paymentIdHash: string;
  callerAddress: string;
};

export type GiftHashInput = {
  hash: string;
};

export type SenderGiftsInput = {
  senderAddress: string;
};

const createGiftSchema = z
  .object({
    paymentIdHash: z.string().trim(),
    amountUsdc: z.string().trim(),
    refundAddress: z.string().trim(),
    expiresInHours: z.coerce.number().default(24),
    senderDisplayName: z.string().trim(),
    giftMessage: z.string().trim().optional(),
    senderEmail: z.string().trim().email().optional(),
    syncClientFunding: z.literal(true).optional(),
  })
  .strict();

const reclaimGiftSchema = z
  .object({
    paymentIdHash: z.string().trim(),
    callerAddress: z.string().trim(),
  })
  .strict();

export function parseCreateGiftInput(body: unknown): CreateGiftParsed {
  const parsed = createGiftSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid create gift payload.");
  }
  const {
    paymentIdHash,
    amountUsdc,
    refundAddress,
    expiresInHours,
    senderDisplayName,
    giftMessage,
    senderEmail,
    syncClientFunding,
  } = parsed.data;

  if (!isHexString(paymentIdHash, 32)) {
    throw new HttpError(400, "paymentIdHash must be a bytes32 hex string.");
  }
  const amount = Number(amountUsdc);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpError(400, "amountUsdc must be a positive number.");
  }
  if (amount < 0.01) {
    throw new HttpError(400, "amountUsdc must be at least 0.01 USDC.");
  }
  if (amount > 10_000) {
    throw new HttpError(400, "amountUsdc cannot exceed 10000 USDC.");
  }
  if (!isAddress(refundAddress)) {
    throw new HttpError(400, "refundAddress must be a valid address.");
  }
  if (
    !Number.isFinite(expiresInHours) ||
    expiresInHours <= 0 ||
    expiresInHours > 24 * 30
  ) {
    throw new HttpError(400, "expiresInHours must be between 1 and 720.");
  }

  const base: CreateGiftInput = {
    paymentIdHash,
    amountUsdc,
    refundAddress: getAddress(refundAddress),
    expiresInHours,
    senderDisplayName: sanitizeSenderDisplayName(senderDisplayName),
    giftMessage: sanitizeGiftMessage(giftMessage),
    senderEmail: senderEmail || undefined,
  };
  if (syncClientFunding === true) {
    return { ...base, syncClientFunding: true };
  }
  return base;
}

export function parseReclaimGiftInput(body: unknown): ReclaimGiftInput {
  const parsed = reclaimGiftSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid reclaim payload.");
  }
  const { paymentIdHash, callerAddress } = parsed.data;
  if (!isHexString(paymentIdHash, 32)) {
    throw new HttpError(400, "paymentIdHash must be a bytes32 hex string.");
  }
  if (!isAddress(callerAddress)) {
    throw new HttpError(400, "callerAddress must be a valid address.");
  }
  return { paymentIdHash, callerAddress };
}

export function parseGiftHashInput(hash: string): GiftHashInput {
  if (!isHexString(hash, 32)) {
    throw new HttpError(400, "Invalid gift hash.");
  }
  return { hash };
}

export function parseSenderGiftsInput(senderAddress: string | null): SenderGiftsInput {
  const value = senderAddress?.trim();
  if (!value || !isAddress(value)) {
    throw new HttpError(
      400,
      "senderAddress query param must be a valid address."
    );
  }
  return { senderAddress: value };
}

export type ReceiverGiftsInput = { receiverAddress: string };

export function parseReceiverGiftsInput(receiverAddress: string | null): ReceiverGiftsInput {
  const value = receiverAddress?.trim();
  if (!value || !isAddress(value)) {
    throw new HttpError(400, "receiverAddress query param must be a valid address.");
  }
  return { receiverAddress: value };
}

