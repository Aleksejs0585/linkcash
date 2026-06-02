import { NextResponse } from "next/server";
import { getReceivedGifts } from "@/entities/gift/server/gift-service";
import { parseReceiverGiftsInput } from "@/entities/gift/server/gift-validation";
import { HttpError, errorMessage } from "@/lib/server/http-errors";
import { rateLimitedCheck } from "@/lib/server/simple-rate-limiter";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimitedCheck(`received-gifts:${ip}`, 20, 60_000);
  if (rl.limited) {
    return NextResponse.json(
      { ok: false, error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  try {
    const url = new URL(request.url);
    const input = parseReceiverGiftsInput(url.searchParams.get("receiverAddress"));
    const result = await getReceivedGifts(input);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { ok: false, error: errorMessage(error, "Failed to load received gifts.") },
      { status: 500 }
    );
  }
}
