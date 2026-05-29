import { NextResponse } from "next/server";
import { reclaimGift } from "@/entities/gift/server/gift-service";
import { parseReclaimGiftInput } from "@/entities/gift/server/gift-validation";
import { HttpError } from "@/lib/server/http-errors";
import { rateLimitedCheck } from "@/lib/server/simple-rate-limiter";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimitedCheck(`reclaim-gift:${ip}`, 5, 60_000);
  if (rl.limited) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      throw new HttpError(400, "Invalid JSON body.");
    }
    const input = parseReclaimGiftInput(rawBody);
    const result = await reclaimGift(input);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(
      JSON.stringify({
        event: "reclaim_gift_error",
        message: error instanceof Error ? error.message : "unknown",
      })
    );
    return NextResponse.json(
      { error: "Failed to reclaim expired gift." },
      { status: 500 }
    );
  }
}
