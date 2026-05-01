import { NextResponse } from "next/server";
import { clearAdminSession } from "../../../../lib/server/admin-auth";
import { adminAuditStore } from "../../../../lib/server/admin-audit-store";

export const runtime = "nodejs";

export async function POST() {
  await clearAdminSession();
  await adminAuditStore.write({
    timestamp: new Date().toISOString(),
    event: "admin_logout",
  });
  return NextResponse.json({ ok: true });
}
