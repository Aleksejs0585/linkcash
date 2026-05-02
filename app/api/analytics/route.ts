import { NextResponse } from "next/server";
import { z } from "zod";
import { productAnalyticsStore } from "@/lib/server/product-analytics-store";
import { buildFunnelSummary } from "@/lib/server/funnel-metrics";
import { dispatchFunnelAlerts } from "@/lib/server/funnel-alert-dispatcher";

export const runtime = "nodejs";

const analyticsSchema = z
  .object({
    event: z.enum([
      "create_open",
      "gift_funded",
      "status_open",
      "claim_success",
      "wallet_open",
      "claim_error",
      "reclaim_click",
    ]),
    path: z.string().trim().optional(),
    paymentIdHash: z.string().trim().optional(),
    status: z.string().trim().optional(),
    txHash: z.string().trim().optional(),
    source: z.string().trim().optional(),
    campaign: z.string().trim().optional(),
    referrer: z.string().trim().optional(),
    variant: z.string().trim().optional(),
    detail: z.string().trim().optional(),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const parsed = analyticsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid analytics payload." }, { status: 400 });
    }

    await productAnalyticsStore.write({
      ...parsed.data,
      timestamp: new Date().toISOString(),
    });

    const recent = await productAnalyticsStore.readRecent(5000);
    const summary = buildFunnelSummary(recent);
    await dispatchFunnelAlerts(summary);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to ingest analytics event." }, { status: 500 });
  }
}

