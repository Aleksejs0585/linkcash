import { NextResponse } from "next/server";
import { parseGiftHashInput } from "@/entities/gift/server/gift-validation";
import { getPublicGiftStatus } from "@/entities/gift/server/gift-status-service";
import { HttpError, errorMessage } from "@/lib/server/http-errors";
import { rateLimitedCheck } from "@/lib/server/simple-rate-limiter";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ hash: string }> }
) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimitedCheck(`gift-status:${ip}`, 30, 60_000);
  if (rl.limited) {
    return NextResponse.json(
      { ok: false, status: "not_found", error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }
  try {
    const { hash } = await context.params;
    const input = parseGiftHashInput(hash);
    const result = await getPublicGiftStatus(input.hash);

    if (!result.ok) {
      return NextResponse.json(result, { status: result.status === "not_found" ? 404 : 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        {
          ok: false,
          status: "not_found",
          error: error.message,
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        status: "not_found",
        error: errorMessage(error, "Failed to load status page data."),
      },
      { status: 500 }
    );
  }
}

