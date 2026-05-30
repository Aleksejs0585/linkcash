import { NextResponse } from "next/server";
import { getGiftByHash } from "@/entities/gift/server/gift-service";
import { parseGiftHashInput } from "@/entities/gift/server/gift-validation";
import { HttpError, errorMessage } from "@/lib/server/http-errors";
import { rateLimitedCheck } from "@/lib/server/simple-rate-limiter";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ hash: string }> }
) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimitedCheck(`gift-details:${ip}`, 60);
  if (rl.limited) {
    return NextResponse.json(
      { ok: false, error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }
  try {
    const { hash } = await context.params;
    const input = parseGiftHashInput(hash);
    const result = await getGiftByHash(input);
    if (!result.ok && result.status) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { ok: false, error: errorMessage(error, "Failed to load gift details.") },
      { status: 500 }
    );
  }
}
