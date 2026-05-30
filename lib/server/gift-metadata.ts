import {
  GIFT_MESSAGE_MAX,
  SENDER_DISPLAY_NAME_MAX,
} from "../gift-metadata-limits";
import { HttpError } from "./http-errors";

export { GIFT_MESSAGE_MAX, SENDER_DISPLAY_NAME_MAX };

export type GiftMetadata = {
  senderDisplayName: string;
  giftMessage?: string;
  createdAt: string;
  senderEmail?: string;
  amountUsdc?: string;
};

function stripControls(value: string): string {
  // ASCII controls + Unicode bidi-override/embedding chars that can reverse or
  // reorder displayed text (zero-width U+200B-U+200F, bidi U+202A-U+202E,
  // bidi isolates U+2066-U+2069, BOM U+FEFF).
  return value.replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "");
}

export function sanitizeSenderDisplayName(raw: unknown): string {
  if (typeof raw !== "string") {
    throw new HttpError(400, "senderDisplayName must be a string.");
  }
  const normalized = stripControls(raw).trim().replace(/\s+/g, " ");
  if (!normalized) {
    throw new HttpError(400, "senderDisplayName cannot be empty.");
  }
  return normalized.slice(0, SENDER_DISPLAY_NAME_MAX);
}

export function sanitizeGiftMessage(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "string") {
    throw new HttpError(400, "giftMessage must be a string.");
  }
  const normalized = stripControls(raw).trim().replace(/\s+/g, " ");
  if (!normalized) return undefined;
  return normalized.slice(0, GIFT_MESSAGE_MAX);
}

export function buildGiftMetadata(
  senderDisplayName: unknown,
  giftMessage: unknown,
  senderEmail?: string,
  amountUsdc?: string
): GiftMetadata {
  return {
    senderDisplayName: sanitizeSenderDisplayName(senderDisplayName),
    giftMessage: sanitizeGiftMessage(giftMessage),
    createdAt: new Date().toISOString(),
    senderEmail: senderEmail || undefined,
    amountUsdc: amountUsdc || undefined,
  };
}
