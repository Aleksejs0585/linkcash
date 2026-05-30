import { Contract, Wallet } from "ethers";
import { buildClaimIdempotencyKey } from "@/utils";
import { createArcProviderWithContractCheck } from "@/lib/server/arc-chain";
import { getArcRelayerEnv } from "@/lib/server/env";
import { claimAuditStore } from "@/lib/server/claim-audit-store";
import { getClaimRuntimeConfig } from "@/lib/server/claim-config-store";
import { claimStateStore } from "@/lib/server/claim-state-store";
import { HttpError } from "@/lib/server/http-errors";
import type { ClaimInput } from "./claim-validation";

type ClaimSuccessResponse = {
  ok: true;
  txHash: string;
  cached?: boolean;
  idempotencyKey: string;
};

const CLAIM_ABI = ["function claim(bytes32 paymentIdHash,address receiver)"];
const IDEMPOTENCY_PROCESSING_TTL_MS = 2 * 60_000;
const IDEMPOTENCY_SUCCESS_TTL_MS = 24 * 60 * 60_000;
const TX_CONFIRMATION_TIMEOUT_MS = 90_000;

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export async function submitClaim(params: {
  input: ClaimInput;
  requestId: string;
  clientIp: string;
  explicitIdempotencyKey?: string | null;
}): Promise<ClaimSuccessResponse> {
  const { input, requestId, clientIp, explicitIdempotencyKey } = params;
  const runtimeConfig = getClaimRuntimeConfig();
  const limit = runtimeConfig.rateLimitEnabled
    ? await claimStateStore.enforceRateLimit(clientIp, runtimeConfig.rateLimitPerMinute)
    : { limited: false, retryAfter: 0 };

  if (limit.limited) {
    await claimAuditStore.write({
      requestId,
      timestamp: new Date().toISOString(),
      event: "claim_rate_limited",
      ip: clientIp,
      paymentIdHash: input.paymentIdHash,
      errorCode: "RATE_LIMITED",
      message: "Too many claim attempts.",
    });
    throw new HttpError(
      429,
      "Too many claim attempts. Please try again shortly.",
      { code: "RATE_LIMITED", retryable: true }
    );
  }

  const { rpcUrl, privateKey, contractAddress } = getArcRelayerEnv();
  const idempotencyKey =
    explicitIdempotencyKey?.trim() ||
    buildClaimIdempotencyKey(input.paymentIdHash, input.receiverAddress);

  const existing = await claimStateStore.getIdempotency(idempotencyKey);
  if (existing) {
    if (existing.status === "processing") {
      await claimAuditStore.write({
        requestId,
        timestamp: new Date().toISOString(),
        event: "claim_in_progress",
        ip: clientIp,
        idempotencyKey: idempotencyKey.slice(0, 10),
        paymentIdHash: input.paymentIdHash,
        receiverAddress: input.receiverAddress,
        errorCode: "IN_PROGRESS",
        message: "Claim is already processing.",
      });
      throw new HttpError(
        409,
        "Claim is already being processed. Retry in a few seconds.",
        { code: "IN_PROGRESS", retryable: true }
      );
    }

    await claimAuditStore.write({
      requestId,
      timestamp: new Date().toISOString(),
      event: "claim_cached",
      ip: clientIp,
      idempotencyKey: idempotencyKey.slice(0, 10),
      paymentIdHash: input.paymentIdHash,
      receiverAddress: input.receiverAddress,
      txHash: existing.txHash,
    });
    return {
      ok: true,
      txHash: existing.txHash,
      cached: true,
      idempotencyKey,
    };
  }

  const acquired = await claimStateStore.setProcessing(idempotencyKey, IDEMPOTENCY_PROCESSING_TTL_MS);
  if (!acquired) {
    await claimAuditStore.write({
      requestId,
      timestamp: new Date().toISOString(),
      event: "claim_in_progress",
      ip: clientIp,
      idempotencyKey: idempotencyKey.slice(0, 10),
      paymentIdHash: input.paymentIdHash,
      receiverAddress: input.receiverAddress,
      errorCode: "IN_PROGRESS",
      message: "Claim is already processing (race).",
    });
    throw new HttpError(
      409,
      "Claim is already being processed. Retry in a few seconds.",
      { code: "IN_PROGRESS", retryable: true }
    );
  }

  let txConfirmed = false;
  let txHash = "";
  try {
    const provider = await createArcProviderWithContractCheck(rpcUrl, contractAddress);
    const relayer = new Wallet(privateKey, provider);
    const contract = new Contract(contractAddress, CLAIM_ABI, relayer);

    const tx = await contract.claim(input.paymentIdHash, input.receiverAddress);
    const receipt = await Promise.race([
      tx.wait(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Transaction confirmation timeout after 90s")),
          TX_CONFIRMATION_TIMEOUT_MS
        )
      ),
    ]);
    txHash = receipt?.hash ?? (tx.hash as string);
    txConfirmed = true;

    await claimStateStore.setSuccess(idempotencyKey, txHash, IDEMPOTENCY_SUCCESS_TTL_MS);
    await claimAuditStore.write({
      requestId,
      timestamp: new Date().toISOString(),
      event: "claim_success",
      ip: clientIp,
      idempotencyKey: idempotencyKey.slice(0, 10),
      paymentIdHash: input.paymentIdHash,
      receiverAddress: input.receiverAddress,
      txHash,
    });

    return { ok: true, txHash, idempotencyKey };
  } catch (error) {
    // Don't delete the idempotency key if tx already confirmed — prevents double-spend on retry.
    if (!txConfirmed) {
      await claimStateStore.deleteIdempotency(idempotencyKey);
    }
    throw error;
  }
}

