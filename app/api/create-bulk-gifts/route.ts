import { NextResponse } from "next/server";
import { z } from "zod";
import { isAddress, isHexString } from "ethers";
import { syncClientFundedGift } from "@/entities/gift/server/gift-service";
import { rateLimitedCheck } from "@/lib/server/simple-rate-limiter";
import { sanitizeSenderDisplayName, sanitizeGiftMessage } from "@/lib/server/gift-metadata";
import { HttpError } from "@/lib/server/http-errors";

export const runtime = "nodejs";

const giftItemSchema = z.object({
  paymentIdHash: z.string().trim(),
  amountUsdc: z.string().trim(),
});

const schema = z
  .object({
    gifts: z.array(giftItemSchema).min(1).max(50),
    refundAddress: z.string().trim(),
    expiresInHours: z.coerce.number().default(24),
    senderDisplayName: z.string().trim(),
    giftMessage: z.string().trim().optional(),
    senderEmail: z.string().trim().email().optional(),
  })
  .strict();

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimitedCheck(`create-bulk-gifts:${ip}`, 5, 60_000);
  if (rl.limited) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const { gifts, refundAddress, expiresInHours, senderDisplayName, giftMessage, senderEmail } =
    parsed.data;

  if (!isAddress(refundAddress)) {
    return NextResponse.json({ error: "refundAddress must be a valid address." }, { status: 400 });
  }
  if (!Number.isFinite(expiresInHours) || expiresInHours <= 0 || expiresInHours > 720) {
    return NextResponse.json({ error: "expiresInHours must be between 1 and 720." }, { status: 400 });
  }

  let cleanName: string;
  try {
    cleanName = sanitizeSenderDisplayName(senderDisplayName);
  } catch {
    return NextResponse.json({ error: "Invalid senderDisplayName." }, { status: 400 });
  }
  const cleanMessage = sanitizeGiftMessage(giftMessage);

  for (const g of gifts) {
    if (!isHexString(g.paymentIdHash, 32)) {
      return NextResponse.json({ error: `Invalid paymentIdHash: ${g.paymentIdHash}` }, { status: 400 });
    }
    const amt = Number(g.amountUsdc);
    if (!Number.isFinite(amt) || amt < 0.01 || amt > 10_000) {
      return NextResponse.json({ error: `Invalid amountUsdc: ${g.amountUsdc}` }, { status: 400 });
    }
  }

  const results = await Promise.all(
    gifts.map(async ({ paymentIdHash, amountUsdc }) => {
      try {
        const result = await syncClientFundedGift({
          paymentIdHash,
          amountUsdc,
          refundAddress,
          expiresInHours,
          senderDisplayName: cleanName,
          giftMessage: cleanMessage,
          senderEmail: senderEmail || undefined,
        });
        return { paymentIdHash, ok: true as const, txHash: result.txHash, expiresAt: result.expiresAt };
      } catch (err) {
        const message =
          err instanceof HttpError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to sync gift.";
        return { paymentIdHash, ok: false as const, error: message };
      }
    })
  );

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ ok: allOk, results }, { status: allOk ? 200 : 207 });
}
