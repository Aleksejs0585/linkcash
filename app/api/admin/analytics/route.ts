import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/server/admin-auth";
import { buildAnalyticsSnapshot } from "@/lib/server/analytics-aggregator";

export const runtime = "nodejs";

export async function GET() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await buildAnalyticsSnapshot();
  return NextResponse.json({ ok: true, ...snapshot });
}
