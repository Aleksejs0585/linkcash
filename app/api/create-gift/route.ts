import { NextResponse } from "next/server";
import { createGift, syncClientFundedGift } from "@/entities/gift/server/gift-service";
import { parseCreateGiftInput } from "@/entities/gift/server/gift-validation";
import { HttpError } from "@/lib/server/http-errors";
import { rateLimitedCheck } from "@/lib/server/simple-rate-limiter";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimitedCheck(`create-gift:${ip}`, 10);
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
    const parsed = parseCreateGiftInput(rawBody);
    const { syncClientFunding, ...relayInput } = parsed;
    const result =
      syncClientFunding === true
        ? await syncClientFundedGift(relayInput)
        : await createGift(relayInput);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(
      JSON.stringify({
        event: "create_gift_error",
        message: error instanceof Error ? error.message : "unknown",
      })
    );
    return NextResponse.json({ error: "Failed to fund gift." }, { status: 500 });
  }
}
