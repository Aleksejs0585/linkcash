import { NextResponse } from "next/server";
import { reclaimGift } from "@/entities/gift/server/gift-service";
import { parseReclaimGiftInput } from "@/entities/gift/server/gift-validation";
import { HttpError, errorMessage } from "@/lib/server/http-errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
    return NextResponse.json(
      { error: errorMessage(error, "Failed to reclaim expired gift.") },
      { status: 500 }
    );
  }
}
