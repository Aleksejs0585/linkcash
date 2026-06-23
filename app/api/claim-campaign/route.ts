import { NextResponse } from "next/server";
import { z } from "zod";
import { isAddress } from "ethers";
import { campaignStore } from "@/lib/server/campaign-store";
import { submitClaim } from "@/entities/claim/server/claim-service";
import { parseClaimInput } from "@/entities/claim/server/claim-validation";
import { rateLimitedCheck, releaseRateLimit } from "@/lib/server/simple-rate-limiter";
import { sendPushToWallet } from "@/lib/server/push-sender";
import { errorMessage } from "@/lib/server/http-errors";

export const runtime = "nodejs";

const schema = z
  .object({
    campaignId: z.string().trim().regex(/^[0-9a-f]{24}$/),
    walletAddress: z.string().trim(),
    email: z.string().trim().min(1).max(200),
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

  // Require a real verified email — reject wallet-based fallback identifiers
  if (!email.includes("@") || email.endsWith("@wallet") || !email.includes(".")) {
    return NextResponse.json({ error: "Please sign in with Google or email to claim." }, { status: 400 });
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
  const claimLockKey = `claim-campaign:${campaignId}:${walletAddress}`;
  const claimRl = await rateLimitedCheck(claimLockKey, 1, 300_000);
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

    // Push to campaign creator: someone claimed
    void sendPushToWallet(campaign.createdBy, {
      title: "Gift claimed!",
      body: `Someone claimed ${campaign.amountPerGift} USDC from "${campaign.title}"`,
      url: `/campaign/${campaignId}/admin`,
    });

    return NextResponse.json({
      ok: true,
      txHash: result.txHash,
      amountUsdc: campaign.amountPerGift,
    });
  } catch (error) {
    const rawMsg = error instanceof Error ? error.message : "";

    const giftClaimed = rawMsg.includes("gift claimed");
    const giftMissing = rawMsg.includes("gift missing");
    const giftExpired = rawMsg.includes("gift expired");
    const onChainFinal = giftClaimed || giftMissing || giftExpired;

    if (!onChainFinal) {
      // Transient error — push slot back + release lock for retry
      const upstash = (await import("@/lib/server/upstash-client")).getUpstashClient();
      if (upstash) {
        upstash.command(["LPUSH", `linkcash:camp:${campaignId}:pool`, JSON.stringify(poolEntry)]).catch(() => undefined);
      }
      void releaseRateLimit(claimLockKey);
    }

    const friendly = giftClaimed
      ? "This gift was already claimed. Please try again."
      : giftExpired
        ? "This campaign's gifts have expired. Contact the organiser."
        : giftMissing
          ? "Gift not found on chain. Contact the organiser."
          : errorMessage(error, "Claim failed. Please try again.");

    const status = giftClaimed ? 409 : giftExpired ? 410 : 500;
    return NextResponse.json({ error: friendly }, { status });
  }
}
