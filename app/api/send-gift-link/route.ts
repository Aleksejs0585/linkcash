import { NextResponse } from "next/server";
import { z } from "zod";
import { sendGiftLinkEmail } from "@/lib/server/email";
import { rateLimitedCheck } from "@/lib/server/simple-rate-limiter";

export const runtime = "nodejs";

const schema = z
  .object({
    recipientEmail: z.string().trim().email(),
    senderDisplayName: z.string().trim().min(1).max(40),
    amountUsdc: z.string().trim().regex(/^\d+(\.\d+)?$/, "Invalid amount"),
    claimLink: z.string().trim().url(),
  })
  .strict();

function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = await rateLimitedCheck(`send-gift-link:${ip}`, 5, 60_000);
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

  const { recipientEmail, senderDisplayName, amountUsdc, claimLink } = parsed.data;

  // Only allow linkcash.app gift links to prevent this becoming an open email relay.
  const allowedOrigins = [
    "https://linkcash.app/gift/",
    "https://www.linkcash.app/gift/",
    "http://localhost:3000/gift/",
  ];
  if (!allowedOrigins.some((origin) => claimLink.startsWith(origin))) {
    return NextResponse.json({ error: "Invalid claim link." }, { status: 400 });
  }

  await sendGiftLinkEmail({ to: recipientEmail, senderDisplayName, amountUsdc, claimLink });

  return NextResponse.json({ ok: true });
}
