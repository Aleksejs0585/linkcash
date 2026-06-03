import { NextResponse } from "next/server";
import { z } from "zod";
import { isAddress } from "ethers";
import { identityStore } from "@/lib/server/identity-store";
import { rateLimitedCheck } from "@/lib/server/simple-rate-limiter";

export const runtime = "nodejs";

const schema = z
  .object({
    walletAddress: z.string().trim(),
    email: z.string().trim().email(),
  })
  .strict();

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimitedCheck(`identify:${ip}`, 20, 60_000);
  if (rl.limited) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: true }); // silent — don't leak validation errors
  }

  const { walletAddress, email } = parsed.data;
  if (!isAddress(walletAddress)) {
    return NextResponse.json({ ok: true });
  }

  void identityStore.upsert(walletAddress, email);
  return NextResponse.json({ ok: true });
}
