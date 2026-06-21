import { NextResponse } from "next/server";
import { buildAnalyticsSnapshot } from "@/lib/server/analytics-aggregator";

export const runtime = "nodejs";

export async function GET() {
  const snapshot = await buildAnalyticsSnapshot();

  const recentActivity = snapshot.recentActivity.map((item) => ({
    kind: item.kind,
    timestamp: item.timestamp,
    txHash:
      item.txHash.length >= 16
        ? `${item.txHash.slice(0, 10)}…${item.txHash.slice(-6)}`
        : item.txHash,
  }));

  return NextResponse.json(
    { ok: true, ...snapshot, recentActivity },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}
