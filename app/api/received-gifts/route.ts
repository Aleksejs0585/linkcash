import { NextResponse } from "next/server";
import { getReceivedGifts } from "@/entities/gift/server/gift-service";
import { parseReceiverGiftsInput } from "@/entities/gift/server/gift-validation";
import { HttpError, errorMessage } from "@/lib/server/http-errors";

export const runtime = "nodejs";

export async function GET(request: Request) {
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
