import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAddress, isHexString, keccak256 } from "ethers";
import { campaignStore } from "@/lib/server/campaign-store";
import { sanitizeSenderDisplayName, sanitizeGiftMessage } from "@/lib/server/gift-metadata";
import { rateLimitedCheck } from "@/lib/server/simple-rate-limiter";
import { HttpError } from "@/lib/server/http-errors";

export const runtime = "nodejs";

const poolEntrySchema = z.object({
  paymentIdHash: z.string().trim(),
  secret: z.string().trim(),
  amountUsdc: z.string().trim(),
});

const schema = z
  .object({
    gifts: z.array(poolEntrySchema).min(1).max(50),
    createdBy: z.string().trim(),
    senderDisplayName: z.string().trim(),
    giftMessage: z.string().trim().optional(),
    title: z.string().trim().max(80).optional(),
  })
  .strict();

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimitedCheck(`create-campaign:${ip}`, 5, 60_000);
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

  const { gifts, createdBy, senderDisplayName, giftMessage, title } = parsed.data;

  if (!isAddress(createdBy)) {
    return NextResponse.json({ error: "createdBy must be a valid address." }, { status: 400 });
  }

  let cleanName: string;
  try {
    cleanName = sanitizeSenderDisplayName(senderDisplayName);
  } catch {
    return NextResponse.json({ error: "Invalid senderDisplayName." }, { status: 400 });
  }
  const cleanMessage = sanitizeGiftMessage(giftMessage);

  // Validate each entry: paymentIdHash must equal keccak256(secret)
  for (const g of gifts) {
    if (!isHexString(g.paymentIdHash, 32)) {
      return NextResponse.json({ error: `Invalid paymentIdHash: ${g.paymentIdHash}` }, { status: 400 });
    }
    if (!isHexString(g.secret, 32)) {
      return NextResponse.json({ error: "Each secret must be a bytes32 hex string." }, { status: 400 });
    }
    const derived = keccak256(g.secret);
    if (derived.toLowerCase() !== g.paymentIdHash.toLowerCase()) {
      return NextResponse.json({ error: "secret does not match paymentIdHash." }, { status: 400 });
    }
    const amt = Number(g.amountUsdc);
    if (!Number.isFinite(amt) || amt < 0.01 || amt > 10_000) {
      return NextResponse.json({ error: `Invalid amountUsdc: ${g.amountUsdc}` }, { status: 400 });
    }
  }

  const amountPerGift = gifts[0].amountUsdc;
  const campaignId = randomBytes(12).toString("hex");

  try {
    await campaignStore.create(
      {
        campaignId,
        title: title?.trim() || `${cleanName}'s campaign`,
        createdAt: new Date().toISOString(),
        createdBy: createdBy.toLowerCase(),
        amountPerGift,
        totalGifts: gifts.length,
        senderDisplayName: cleanName,
        giftMessage: cleanMessage,
      },
      gifts.map(({ paymentIdHash, secret }) => ({ paymentIdHash, secret }))
    );
  } catch (error) {
    console.error(JSON.stringify({ event: "create_campaign_error", message: error instanceof Error ? error.message : "unknown" }));
    return NextResponse.json({ error: "Failed to create campaign." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, campaignId });
}
