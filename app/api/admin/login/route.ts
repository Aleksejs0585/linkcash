import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createAdminSession,
  isAdminConfigured,
  validateAdminPassword,
} from "@/lib/server/admin-auth";
import {
  canAttemptAdminLogin,
  clearAdminLoginFailures,
  markAdminLoginFailure,
} from "@/lib/server/admin-login-guard";
import { adminAuditStore } from "@/lib/server/admin-audit-store";

type LoginBody = {
  password: string;
};

const loginSchema = z
  .object({
    password: z.string().trim().min(1),
  })
  .strict();

export const runtime = "nodejs";

export async function POST(request: Request) {
  const lockout = canAttemptAdminLogin(request);
  if (!lockout.allowed) {
    await adminAuditStore.write({
      timestamp: new Date().toISOString(),
      event: "admin_login_blocked",
      message: "Too many login attempts.",
    });
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(lockout.retryAfterSeconds) } }
    );
  }

  if (!isAdminConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "ADMIN_DASHBOARD_PASSWORD is not configured.",
      },
      { status: 500 }
    );
  }

  let body: LoginBody;
  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid JSON body.",
        },
        { status: 400 }
      );
    }
    body = parsed.data;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body.",
      },
      { status: 400 }
    );
  }

  if (!validateAdminPassword(body.password)) {
    markAdminLoginFailure(request);
    await adminAuditStore.write({
      timestamp: new Date().toISOString(),
      event: "admin_login_failure",
      message: "Invalid credentials.",
    });
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid credentials.",
      },
      { status: 401 }
    );
  }

  clearAdminLoginFailures(request);
  await createAdminSession();
  await adminAuditStore.write({
    timestamp: new Date().toISOString(),
    event: "admin_login_success",
  });
  return NextResponse.json({ ok: true });
}
