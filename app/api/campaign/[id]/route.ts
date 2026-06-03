import { NextResponse } from "next/server";
import { campaignStore } from "@/lib/server/campaign-store";
import { rateLimitedCheck } from "@/lib/server/simple-rate-limiter";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimitedCheck(`campaign-info:${ip}`, 60, 60_000);
  if (rl.limited) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { id } = await params;
  if (!/^[0-9a-f]{24}$/.test(id)) {
    return NextResponse.json({ error: "Invalid campaign ID." }, { status: 400 });
  }

  const campaign = await campaignStore.get(id);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  const [remaining, claims] = await Promise.all([
    campaignStore.getRemainingCount(id),
    campaignStore.getClaims(id),
  ]);

  return NextResponse.json({
    ok: true,
    campaign: {
      campaignId: campaign.campaignId,
      title: campaign.title,
      amountPerGift: campaign.amountPerGift,
      totalGifts: campaign.totalGifts,
      senderDisplayName: campaign.senderDisplayName,
      giftMessage: campaign.giftMessage,
      createdAt: campaign.createdAt,
    },
    remaining,
    claimed: claims.length,
  });
}
