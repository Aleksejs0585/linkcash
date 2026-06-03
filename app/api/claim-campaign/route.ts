import { NextResponse } from "next/server";
import { z } from "zod";
import { isAddress } from "ethers";
import { campaignStore } from "@/lib/server/campaign-store";
import { submitClaim } from "@/entities/claim/server/claim-service";
import { parseClaimInput } from "@/entities/claim/server/claim-validation";
import { rateLimitedCheck } from "@/lib/server/simple-rate-limiter";

export const runtime = "nodejs";

const schema = z
  .object({
    campaignId: z.string().trim().regex(/^[0-9a-f]{24}$/),
    walletAddress: z.string().trim(),
    email: z.string().trim().email(),
  })
  .strict();

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // IP rate limit
  const rl = await rateLimitedCheck(`claim-campaign:${ip}`, 10, 60_000);
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
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { campaignId, walletAddress, email } = parsed.data;

  if (!isAddress(walletAddress)) {
    return NextResponse.json({ error: "walletAddress must be a valid address." }, { status: 400 });
  }

  // Load campaign
  const campaign = await campaignStore.get(campaignId);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  // Dedup: one claim per email + wallet
  const alreadyClaimed = await campaignStore.hasClaimed(campaignId, email, walletAddress);
  if (alreadyClaimed) {
    return NextResponse.json({ error: "You have already claimed a gift from this campaign." }, { status: 409 });
  }

  // Per-campaign+wallet rate limit to prevent race exploitation
  const claimRl = await rateLimitedCheck(`claim-campaign:${campaignId}:${walletAddress}`, 1, 300_000);
  if (claimRl.limited) {
    return NextResponse.json({ error: "Claim already in progress. Try again shortly." }, { status: 429 });
  }

  // Atomically pop one gift from pool
  const poolEntry = await campaignStore.popGift(campaignId);
  if (!poolEntry) {
    return NextResponse.json({ error: "This campaign is fully claimed. No gifts remaining." }, { status: 410 });
  }

  // Validate the pool entry and submit claim via relayer
  try {
    const claimInput = parseClaimInput({
      secret: poolEntry.secret,
      paymentIdHash: poolEntry.paymentIdHash,
      receiverAddress: walletAddress,
    });

    const result = await submitClaim({
      input: claimInput,
      requestId: crypto.randomUUID(),
      clientIp: ip,
      explicitIdempotencyKey: null,
    });

    // Record successful claim
    await campaignStore.recordClaim(campaignId, {
      email,
      paymentIdHash: poolEntry.paymentIdHash,
      txHash: result.txHash,
      claimedAt: new Date().toISOString(),
      walletAddress: walletAddress.toLowerCase(),
    });

    return NextResponse.json({
      ok: true,
      txHash: result.txHash,
      amountUsdc: campaign.amountPerGift,
    });
  } catch (error) {
    // If claim fails, push the gift back to the pool so it can be retried
    // We use a best-effort re-push; if it fails the gift is lost (acceptable on testnet)
    const upstash = (await import("@/lib/server/upstash-client")).getUpstashClient();
    if (upstash) {
      upstash.command(["LPUSH", `linkcash:camp:${campaignId}:pool`, JSON.stringify(poolEntry)]).catch(() => undefined);
    }

    const msg = error instanceof Error ? error.message : "Claim failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
