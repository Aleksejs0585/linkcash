import { NextResponse } from "next/server";
import { z } from "zod";
import { productAnalyticsStore } from "@/lib/server/product-analytics-store";
import { buildFunnelSummary } from "@/lib/server/funnel-metrics";
import { dispatchFunnelAlerts } from "@/lib/server/funnel-alert-dispatcher";
import { rateLimitedCheck } from "@/lib/server/simple-rate-limiter";

export const runtime = "nodejs";

// Funnel check is expensive (reads 5000 events, builds summary, may call webhook).
// Run at most once per 60 seconds across all serverless instances.
const gState = globalThis as typeof globalThis & {
  __lastFunnelMs?: number;
  __funnelPending?: boolean;
};

function scheduleFunnelCheck() {
  if (gState.__funnelPending) return;
  const now = Date.now();
  if (gState.__lastFunnelMs && now - gState.__lastFunnelMs < 60_000) return;

  gState.__funnelPending = true;
  void (async () => {
    try {
      const recent = await productAnalyticsStore.readRecent(5000);
      const summary = buildFunnelSummary(recent);
      await dispatchFunnelAlerts(summary);
      gState.__lastFunnelMs = Date.now();
    } finally {
      gState.__funnelPending = false;
    }
  })();
}

function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

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
  const rl = await rateLimitedCheck(`analytics:${getClientIp(request)}`, 60, 60_000);
  if (rl.limited) {
    return NextResponse.json(
      { ok: false, error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  try {
    const parsed = analyticsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid analytics payload." }, { status: 400 });
    }

    // Fast path: just write the event
    await productAnalyticsStore.write({
      ...parsed.data,
      timestamp: new Date().toISOString(),
    });

    // Slow path: funnel + alerts — throttled to once per 60s, non-blocking
    scheduleFunnelCheck();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to ingest analytics event." }, { status: 500 });
  }
}
