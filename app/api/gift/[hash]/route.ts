import { NextResponse } from "next/server";
import { getGiftByHash } from "@/entities/gift/server/gift-service";
import { parseGiftHashInput } from "@/entities/gift/server/gift-validation";
import { HttpError, errorMessage } from "@/lib/server/http-errors";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ hash: string }> }
) {
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
