import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "../../../../lib/server/admin-auth";
import {
  type ClaimAuditEvent,
  resolveClaimAuditLogPath,
} from "../../../../lib/server/claim-audit-store";
import {
  getClaimRuntimeConfig,
  updateClaimRuntimeConfig,
} from "../../../../lib/server/claim-config-store";
import {
  type ProductAnalyticsEvent,
  productAnalyticsStore,
} from "../../../../lib/server/product-analytics-store";

type UpdateConfigBody = {
  rateLimitEnabled?: boolean;
  rateLimitPerMinute?: number;
};

const updateConfigSchema = z
  .object({
    rateLimitEnabled: z.boolean().optional(),
    rateLimitPerMinute: z.number().finite().positive().optional(),
  })
  .strict();

export const runtime = "nodejs";

type FunnelMetrics = {
  createOpen: number;
  giftFunded: number;
  statusOpen: number;
  claimSuccess: number;
  fundedRate: number;
  statusRate: number;
  claimRate: number;
};

type SourceMetrics = {
  source: string;
  createOpen: number;
  giftFunded: number;
  claimSuccess: number;
  claimRate: number;
};

type FunnelSummary = {
  last24h: FunnelMetrics;
  last7d: FunnelMetrics;
  bySource24h: SourceMetrics[];
  alerts: string[];
};

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

async function readRecentEvents(limit = 100): Promise<ClaimAuditEvent[]> {
  try {
    const raw = await readFile(resolveClaimAuditLogPath(), "utf8");
    const lines = raw.split("\n").filter(Boolean);
    const recent = lines.slice(-Math.max(1, limit));

    const events: ClaimAuditEvent[] = [];
    for (const line of recent) {
      try {
        events.push(JSON.parse(line) as ClaimAuditEvent);
      } catch {
        // Ignore malformed lines.
      }
    }

    return events.reverse();
  } catch {
    return [];
  }
}

function buildFunnelMetrics(events: ProductAnalyticsEvent[]): FunnelMetrics {
  const createOpen = events.filter((item) => item.event === "create_open").length;
  const giftFunded = events.filter((item) => item.event === "gift_funded").length;
  const statusOpen = events.filter((item) => item.event === "status_open").length;
  const claimSuccess = events.filter((item) => item.event === "claim_success").length;

  const fundedRate = createOpen > 0 ? giftFunded / createOpen : 0;
  const statusRate = giftFunded > 0 ? statusOpen / giftFunded : 0;
  const claimRate = giftFunded > 0 ? claimSuccess / giftFunded : 0;

  return {
    createOpen,
    giftFunded,
    statusOpen,
    claimSuccess,
    fundedRate,
    statusRate,
    claimRate,
  };
}

function buildSourceMetrics(events: ProductAnalyticsEvent[]): SourceMetrics[] {
  const map = new Map<string, ProductAnalyticsEvent[]>();
  for (const event of events) {
    const key = event.source?.trim() || "direct";
    const current = map.get(key);
    if (current) {
      current.push(event);
    } else {
      map.set(key, [event]);
    }
  }

  return Array.from(map.entries())
    .map(([source, rows]) => {
      const createOpen = rows.filter((item) => item.event === "create_open").length;
      const giftFunded = rows.filter((item) => item.event === "gift_funded").length;
      const claimSuccess = rows.filter((item) => item.event === "claim_success").length;
      return {
        source,
        createOpen,
        giftFunded,
        claimSuccess,
        claimRate: giftFunded > 0 ? claimSuccess / giftFunded : 0,
      };
    })
    .sort((a, b) => b.createOpen - a.createOpen)
    .slice(0, 6);
}

async function buildFunnelSummary(): Promise<FunnelSummary> {
  const events = await productAnalyticsStore.readRecent(5000);
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const events24h = events.filter((item) => {
    const ts = Date.parse(item.timestamp);
    return Number.isFinite(ts) && ts >= dayAgo;
  });
  const events7d = events.filter((item) => {
    const ts = Date.parse(item.timestamp);
    return Number.isFinite(ts) && ts >= weekAgo;
  });

  const last24h = buildFunnelMetrics(events24h);
  const last7d = buildFunnelMetrics(events7d);
  const bySource24h = buildSourceMetrics(events24h);

  const alerts: string[] = [];
  if (last24h.createOpen >= 20 && last24h.fundedRate < 0.25) {
    alerts.push(
      "High drop after create open: less than 25% reach funding in the last 24h."
    );
  }
  if (last24h.giftFunded >= 15 && last24h.claimRate < 0.35) {
    alerts.push(
      "Claim completion is low: less than 35% of funded gifts were claimed in the last 24h."
    );
  }
  if (last24h.createOpen > 0 && last24h.claimSuccess === 0) {
    alerts.push("No successful claims were recorded in the last 24h.");
  }

  return { last24h, last7d, bySource24h, alerts };
}

export async function GET() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) return unauthorized();

  const [events, config, funnel] = await Promise.all([
    readRecentEvents(120),
    Promise.resolve(getClaimRuntimeConfig()),
    buildFunnelSummary(),
  ]);

  return NextResponse.json({
    ok: true,
    config,
    events,
    funnel,
  });
}

export async function POST(request: Request) {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) return unauthorized();

  let body: UpdateConfigBody;
  try {
    const parsed = updateConfigSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid request body." },
        { status: 400 }
      );
    }
    body = parsed.data;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const next = updateClaimRuntimeConfig({
    rateLimitEnabled: body.rateLimitEnabled,
    rateLimitPerMinute: body.rateLimitPerMinute,
  });

  return NextResponse.json({
    ok: true,
    config: next,
  });
}
