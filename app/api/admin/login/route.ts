import { NextResponse } from "next/server";
import {
  createAdminSession,
  isAdminConfigured,
  validateAdminPassword,
} from "../../../../lib/server/admin-auth";

type LoginBody = {
  password?: string;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
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
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body.",
      },
      { status: 400 }
    );
  }

  if (!body.password || !validateAdminPassword(body.password)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid credentials.",
      },
      { status: 401 }
    );
  }

  await createAdminSession();
  return NextResponse.json({ ok: true });
}
