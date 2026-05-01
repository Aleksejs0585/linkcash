import { isAddress, isHexString } from "ethers";
import { z } from "zod";
import { HttpError } from "@/lib/server/http-errors";

export type CreateGiftInput = {
  paymentIdHash: string;
  amountUsdc: string;
  refundAddress: string;
  expiresInHours: number;
};

export type ReclaimGiftInput = {
  paymentIdHash: string;
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
  })
  .strict();

const reclaimGiftSchema = z
  .object({
    paymentIdHash: z.string().trim(),
  })
  .strict();

export function parseCreateGiftInput(body: unknown): CreateGiftInput {
  const parsed = createGiftSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid create gift payload.");
  }
  const { paymentIdHash, amountUsdc, refundAddress, expiresInHours } = parsed.data;

  if (!isHexString(paymentIdHash, 32)) {
    throw new HttpError(400, "paymentIdHash must be a bytes32 hex string.");
  }
  const amount = Number(amountUsdc);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpError(400, "amountUsdc must be a positive number.");
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

  return { paymentIdHash, amountUsdc, refundAddress, expiresInHours };
}

export function parseReclaimGiftInput(body: unknown): ReclaimGiftInput {
  const parsed = reclaimGiftSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid reclaim payload.");
  }
  const { paymentIdHash } = parsed.data;
  if (!isHexString(paymentIdHash, 32)) {
    throw new HttpError(400, "paymentIdHash must be a bytes32 hex string.");
  }
  return { paymentIdHash };
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

