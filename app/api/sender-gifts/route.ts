import { NextResponse } from "next/server";
import { getSenderGifts } from "@/entities/gift/server/gift-service";
import { parseSenderGiftsInput } from "@/entities/gift/server/gift-validation";
import { HttpError, errorMessage } from "@/lib/server/http-errors";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const input = parseSenderGiftsInput(url.searchParams.get("senderAddress"));
    const result = await getSenderGifts(input);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { ok: false, error: errorMessage(error, "Failed to load sender gifts.") },
      { status: 500 }
    );
  }
}
