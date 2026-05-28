import { NextResponse } from "next/server";
import { clearAdminSession, isAdminAuthenticated } from "@/lib/server/admin-auth";
import { adminAuditStore } from "@/lib/server/admin-audit-store";

export const runtime = "nodejs";

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  await clearAdminSession();
  await adminAuditStore.write({
    timestamp: new Date().toISOString(),
    event: "admin_logout",
  });
  return NextResponse.json({ ok: true });
}
