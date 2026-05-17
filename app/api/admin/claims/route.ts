import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/server/admin-auth";
import {
  type ClaimAuditEvent,
  resolveClaimAuditLogPath,
} from "@/lib/server/claim-audit-store";
import {
  getClaimRuntimeConfig,
  updateClaimRuntimeConfig,
} from "@/lib/server/claim-config-store";
import { productAnalyticsStore } from "@/lib/server/product-analytics-store";
import { buildFunnelSummary } from "@/lib/server/funnel-metrics";

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

export async function GET() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) return unauthorized();

  const [events, config, analyticsEvents] = await Promise.all([
    readRecentEvents(120),
    Promise.resolve(getClaimRuntimeConfig()),
    productAnalyticsStore.readRecent(5000),
  ]);
  const funnel = buildFunnelSummary(analyticsEvents);

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
