import { NextResponse } from "next/server";
import { isAddress } from "ethers";
import { campaignStore } from "@/lib/server/campaign-store";
import { rateLimitedCheck } from "@/lib/server/simple-rate-limiter";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimitedCheck(`my-campaigns:${ip}`, 30, 60_000);
  if (rl.limited) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const url = new URL(request.url);
  const walletAddress = url.searchParams.get("walletAddress")?.trim();
  if (!walletAddress || !isAddress(walletAddress)) {
    return NextResponse.json({ error: "walletAddress must be a valid address." }, { status: 400 });
  }

  const campaigns = await campaignStore.listByCreator(walletAddress);

  // Enrich each with remaining + claimed counts
  const enriched = await Promise.all(
    campaigns.map(async (c) => {
      const [remaining, claims] = await Promise.all([
        campaignStore.getRemainingCount(c.campaignId),
        campaignStore.getClaims(c.campaignId),
      ]);
      return {
        campaignId: c.campaignId,
        title: c.title,
        amountPerGift: c.amountPerGift,
        totalGifts: c.totalGifts,
        createdAt: c.createdAt,
        remaining,
        claimed: claims.length,
      };
    })
  );

  return NextResponse.json({ ok: true, campaigns: enriched });
}
