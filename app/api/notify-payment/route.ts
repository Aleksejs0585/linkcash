import { NextResponse } from "next/server";
import { z } from "zod";
import { requestStore } from "@/lib/server/request-store";
import { sendPaymentReceivedEmail } from "@/lib/server/email";
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

  // Per-requestId rate limit: send at most 1 notification per request per hour
  const perReq = await rateLimitedCheck(`notify-payment:req:${requestId}`, 1, 3_600_000);
  if (perReq.limited) {
    return NextResponse.json({ ok: true }); // silent — already notified recently
  }

  const req = await requestStore.read(requestId);
  if (!req?.requesterEmail) {
    return NextResponse.json({ ok: true }); // no email stored — nothing to send
  }

  await sendPaymentReceivedEmail({
    to: req.requesterEmail,
    payerName,
    amountUsdc,
    requesterDisplayName: req.displayName,
  });

  return NextResponse.json({ ok: true });
}
