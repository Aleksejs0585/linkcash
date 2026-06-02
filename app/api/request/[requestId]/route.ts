import { NextResponse } from "next/server";
import { requestStore } from "@/lib/server/request-store";
import { rateLimitedCheck } from "@/lib/server/simple-rate-limiter";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimitedCheck(`get-request:${ip}`, 60, 60_000);
  if (rl.limited) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const { requestId } = await params;

  if (!requestId || !/^[0-9a-f]{24}$/.test(requestId)) {
    return NextResponse.json({ error: "Invalid request ID." }, { status: 400 });
  }

  const req = await requestStore.read(requestId);
  if (!req) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  return NextResponse.json({
    requestId: req.requestId,
    displayName: req.displayName,
    amountUsdc: req.amountUsdc,
    message: req.message ?? null,
    createdAt: req.createdAt,
    requesterWalletAddress: req.requesterWalletAddress,
  });
}
