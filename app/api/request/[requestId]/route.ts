import { NextResponse } from "next/server";
import { requestStore } from "@/lib/server/request-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const { requestId } = await params;

  if (!requestId || !/^[0-9a-f]{24}$/.test(requestId)) {
    return NextResponse.json({ error: "Invalid request ID." }, { status: 400 });
  }

  const req = await requestStore.read(requestId);
  if (!req) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  return NextResponse.json({
    requestId: req.requestId,
    displayName: req.displayName,
    amountUsdc: req.amountUsdc,
    message: req.message ?? null,
    createdAt: req.createdAt,
  });
}
