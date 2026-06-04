import { NextResponse } from "next/server";
import { z } from "zod";
import { requestStore } from "@/lib/server/request-store";
import { sendPaymentReceivedEmail } from "@/lib/server/email";
import { sendPushToWallet } from "@/lib/server/push-sender";
import { rateLimitedCheck } from "@/lib/server/simple-rate-limiter";

export const runtime = "nodejs";

const schema = z
  .object({
    requestId: z.string().trim().regex(/^[0-9a-f]{24}$/),
    payerName: z.string().trim().min(1).max(60),
    amountUsdc: z.string().trim().regex(/^\d+(\.\d+)?$/),
  })
  .strict();

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimitedCheck(`notify-payment:${ip}`, 10, 60_000);
  if (rl.limited) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { requestId, payerName, amountUsdc } = parsed.data;

  const req = await requestStore.read(requestId);
  if (!req) return NextResponse.json({ ok: true });

  // Always mark as paid — even if no email is configured
  void requestStore.markPaid(requestId);

  // Push notification to the requester
  void sendPushToWallet(req.requesterWalletAddress, {
    title: "Payment received!",
    body: `${payerName} sent you ${amountUsdc} USDC`,
    url: "/wallet",
  });

  if (!req.requesterEmail) {
    return NextResponse.json({ ok: true });
  }

  // Per-requestId rate limit: send at most 1 email per request per hour
  const perReq = await rateLimitedCheck(`notify-payment:req:${requestId}`, 1, 3_600_000);
  if (perReq.limited) {
    return NextResponse.json({ ok: true });
  }

  await sendPaymentReceivedEmail({
    to: req.requesterEmail,
    payerName,
    amountUsdc,
    requesterDisplayName: req.displayName,
  });

  return NextResponse.json({ ok: true });
}
