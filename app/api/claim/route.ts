import { NextResponse } from "next/server";
import { parseClaimInput } from "@/entities/claim/server/claim-validation";
import { getClientIp, submitClaim } from "@/entities/claim/server/claim-service";
import { claimAuditStore } from "../../../lib/server/claim-audit-store";
import { HttpError, errorMessage } from "@/lib/server/http-errors";

export const runtime = "nodejs";

type ClaimErrorCode =
  | "BAD_REQUEST"
  | "CONFIG_ERROR"
  | "RATE_LIMITED"
  | "IN_PROGRESS"
  | "RELAY_ERROR";

type ClaimErrorResponse = {
  ok: false;
  error: {
    code: ClaimErrorCode;
    message: string;
    retryable: boolean;
  };
};

type ClaimSuccessResponse = {
  ok: true;
  txHash: string;
  cached?: boolean;
};

function jsonError(
  code: ClaimErrorCode,
  message: string,
  status: number,
  retryable = false
) {
  const payload: ClaimErrorResponse = {
    ok: false,
    error: { code, message, retryable },
  };
  return payload;
}

export async function POST(request: Request) {
  let currentIdempotencyKey: string | null = null;
  let currentPaymentIdHash: string | null = null;
  const requestId = crypto.randomUUID();
  const clientIp = getClientIp(request);

  try {
    await claimAuditStore.write({
      requestId,
      timestamp: new Date().toISOString(),
      event: "claim_received",
      ip: clientIp,
    });

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      throw new HttpError(400, "Invalid JSON body.", {
        code: "BAD_REQUEST",
        retryable: false,
      });
    }

    const input = parseClaimInput(rawBody);
    currentPaymentIdHash = input.paymentIdHash;
    const idempotencyKey = request.headers.get("x-idempotency-key")?.trim() ?? null;
    currentIdempotencyKey = idempotencyKey;
    const result = await submitClaim({
      input,
      requestId,
      clientIp,
      explicitIdempotencyKey: idempotencyKey,
    });
    currentIdempotencyKey = result.idempotencyKey;
    const response: ClaimSuccessResponse = { ok: true, txHash: result.txHash };
    if (result.cached) response.cached = true;
    return NextResponse.json(response, {
      headers: { "X-Idempotency-Key": result.idempotencyKey },
    });
  } catch (error) {
    const message = errorMessage(error, "Failed to submit claim.");
    let status = 500;
    let code: ClaimErrorCode = "RELAY_ERROR";
    let retryable = true;
    if (error instanceof HttpError) {
      status = error.status;
      code = (error.code as ClaimErrorCode | undefined) ?? "RELAY_ERROR";
      retryable = error.retryable;
    }
    await claimAuditStore.write({
      requestId,
      timestamp: new Date().toISOString(),
      event: "claim_error",
      ip: clientIp,
      idempotencyKey: currentIdempotencyKey?.slice(0, 10),
      paymentIdHash: currentPaymentIdHash ?? undefined,
      errorCode: code,
      message,
    });
    const payload = jsonError(code, message, status, retryable);
    const headers =
      status === 429 ? { "Retry-After": "1" } : undefined;
    return NextResponse.json(payload, { status, headers });
  }
}
