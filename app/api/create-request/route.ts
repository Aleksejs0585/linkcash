import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAddress } from "ethers";
import { requestStore } from "@/lib/server/request-store";
import { rateLimitedCheck } from "@/lib/server/simple-rate-limiter";
import { HttpError, errorMessage } from "@/lib/server/http-errors";

export const runtime = "nodejs";

const schema = z
  .object({
    displayName: z.string().trim().min(1).max(40),
    amountUsdc: z.string().trim(),
    message: z.string().trim().max(200).optional(),
    requesterWalletAddress: z.string().trim(),
  })
  .strict();

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimitedCheck(`create-request:${ip}`, 5);
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

    const parsed = schema.safeParse(rawBody);
    if (!parsed.success) {
      throw new HttpError(400, "Invalid request payload.");
    }

    const { displayName, amountUsdc, message, requesterWalletAddress } = parsed.data;

    const amount = Number(amountUsdc);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new HttpError(400, "amountUsdc must be a positive number.");
    }
    if (amount > 10_000) {
      throw new HttpError(400, "amountUsdc cannot exceed 10000 USDC.");
    }
    if (!isAddress(requesterWalletAddress)) {
      throw new HttpError(400, "requesterWalletAddress must be a valid address.");
    }

    const requestId = randomBytes(12).toString("hex");

    await requestStore.write({
      requestId,
      displayName,
      amountUsdc,
      message: message || undefined,
      createdAt: new Date().toISOString(),
      requesterWalletAddress,
    });

    return NextResponse.json({ requestId });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: errorMessage(error, "Failed to create request.") },
      { status: 500 }
    );
  }
}
