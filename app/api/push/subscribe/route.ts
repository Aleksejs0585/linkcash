import { NextResponse } from "next/server";
import { z } from "zod";
import { isAddress } from "ethers";
import { pushStore } from "@/lib/server/push-store";
import { rateLimitedCheck } from "@/lib/server/simple-rate-limiter";

export const runtime = "nodejs";

const schema = z.object({
  walletAddress: z.string().trim(),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
}).strict();

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimitedCheck(`push-subscribe:${ip}`, 10, 60_000);
  if (rl.limited) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success || !isAddress(parsed.data.walletAddress)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { walletAddress, subscription } = parsed.data;
  await pushStore.save(walletAddress, subscription);

  return NextResponse.json({ ok: true });
}
