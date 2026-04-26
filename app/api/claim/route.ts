import { NextResponse } from "next/server";
import {
  Contract,
  JsonRpcProvider,
  Wallet,
  isAddress,
  isHexString,
  keccak256,
} from "ethers";
import { ARC_TESTNET, buildClaimIdempotencyKey } from "../../../utils";
import { claimAuditStore } from "../../../lib/server/claim-audit-store";
import { getClaimRuntimeConfig } from "../../../lib/server/claim-config-store";

export const runtime = "nodejs";

type ClaimBody = {
  secret?: string;
  paymentIdHash?: string;
  receiverAddress?: string;
};

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

type RateLimitEntry = {
  count: number;
  windowStartMs: number;
};

type IdempotencyEntry =
  | { status: "processing"; expiresAt: number }
  | { status: "success"; txHash: string; expiresAt: number };

const CLAIM_ABI = ["function claim(bytes32 paymentIdHash,address receiver)"];
const ERC20_ABI = ["function balanceOf(address account) view returns (uint256)"];
const RATE_LIMIT_WINDOW_MS = 60_000;
const IDEMPOTENCY_PROCESSING_TTL_MS = 2 * 60_000;
const IDEMPOTENCY_SUCCESS_TTL_MS = 24 * 60 * 60_000;

const globalState = globalThis as typeof globalThis & {
  __claimRateLimitStore?: Map<string, RateLimitEntry>;
  __claimIdempotencyStore?: Map<string, IdempotencyEntry>;
};

const rateLimitStore =
  globalState.__claimRateLimitStore ?? new Map<string, RateLimitEntry>();
const idempotencyStore =
  globalState.__claimIdempotencyStore ?? new Map<string, IdempotencyEntry>();

globalState.__claimRateLimitStore = rateLimitStore;
globalState.__claimIdempotencyStore = idempotencyStore;

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
  return NextResponse.json(payload, { status });
}

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

function enforceRateLimit(
  clientIp: string,
  maxRequests: number
): { limited: boolean; retryAfter: number } {
  const now = Date.now();
  const current = rateLimitStore.get(clientIp);

  if (!current || now - current.windowStartMs >= RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(clientIp, { count: 1, windowStartMs: now });
    return { limited: false, retryAfter: 0 };
  }

  current.count += 1;
  rateLimitStore.set(clientIp, current);

  if (current.count > maxRequests) {
    const retryAfter = Math.ceil(
      (RATE_LIMIT_WINDOW_MS - (now - current.windowStartMs)) / 1000
    );
    return { limited: true, retryAfter: Math.max(1, retryAfter) };
  }

  return { limited: false, retryAfter: 0 };
}

function cleanupExpiredCaches() {
  const now = Date.now();

  for (const [key, value] of idempotencyStore.entries()) {
    if (value.expiresAt <= now) {
      idempotencyStore.delete(key);
    }
  }
}

export async function POST(request: Request) {
  cleanupExpiredCaches();
  let currentIdempotencyKey: string | null = null;
  const requestId = crypto.randomUUID();
  const clientIp = getClientIp(request);

  try {
    await claimAuditStore.write({
      requestId,
      timestamp: new Date().toISOString(),
      event: "claim_received",
      ip: clientIp,
    });

    const runtimeConfig = getClaimRuntimeConfig();
    const limit = runtimeConfig.rateLimitEnabled
      ? enforceRateLimit(clientIp, runtimeConfig.rateLimitPerMinute)
      : { limited: false, retryAfter: 0 };
    if (limit.limited) {
      await claimAuditStore.write({
        requestId,
        timestamp: new Date().toISOString(),
        event: "claim_rate_limited",
        ip: clientIp,
        errorCode: "RATE_LIMITED",
        message: "Too many claim attempts.",
      });

      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many claim attempts. Please try again shortly.",
            retryable: true,
          },
        } satisfies ClaimErrorResponse,
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfter) },
        }
      );
    }

    let payload: ClaimBody;
    try {
      payload = (await request.json()) as ClaimBody;
    } catch {
      return jsonError("BAD_REQUEST", "Invalid JSON body.", 400, false);
    }
    const { secret, paymentIdHash, receiverAddress } = payload;

    if (!secret || !paymentIdHash || !receiverAddress) {
      return jsonError(
        "BAD_REQUEST",
        "secret, paymentIdHash and receiverAddress are required.",
        400
      );
    }

    if (!isHexString(secret, 32)) {
      return jsonError(
        "BAD_REQUEST",
        "secret must be a bytes32 hex string.",
        400
      );
    }

    if (!isAddress(receiverAddress)) {
      return jsonError(
        "BAD_REQUEST",
        "receiverAddress must be a valid address.",
        400
      );
    }

    if (!isHexString(paymentIdHash, 32)) {
      return jsonError(
        "BAD_REQUEST",
        "paymentIdHash must be a bytes32 hex string.",
        400
      );
    }

    const derivedPaymentIdHash = keccak256(secret);
    if (derivedPaymentIdHash.toLowerCase() !== paymentIdHash.toLowerCase()) {
      return jsonError(
        "BAD_REQUEST",
        "paymentIdHash does not match the provided secret.",
        400
      );
    }

    const rpcUrl = process.env.RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const usdcAddress =
      process.env.USDC_CONTRACT_ADDRESS || ARC_TESTNET.usdcErc20Address;

    if (!rpcUrl || !privateKey || !contractAddress) {
      return jsonError(
        "CONFIG_ERROR",
        "Missing RPC_URL, PRIVATE_KEY or CONTRACT_ADDRESS.",
        500
      );
    }

    const explicitKey = request.headers.get("x-idempotency-key")?.trim();
    const idempotencyKey =
      explicitKey || buildClaimIdempotencyKey(paymentIdHash, receiverAddress);
    currentIdempotencyKey = idempotencyKey;

    const existing = idempotencyStore.get(idempotencyKey);
    if (existing) {
      if (existing.status === "processing") {
        await claimAuditStore.write({
          requestId,
          timestamp: new Date().toISOString(),
          event: "claim_in_progress",
          ip: clientIp,
          idempotencyKey: idempotencyKey.slice(0, 10),
          receiverAddress,
          errorCode: "IN_PROGRESS",
          message: "Claim is already processing.",
        });

        return jsonError(
          "IN_PROGRESS",
          "Claim is already being processed. Retry in a few seconds.",
          409,
          true
        );
      }

      const cached: ClaimSuccessResponse = {
        ok: true,
        txHash: existing.txHash,
        cached: true,
      };

      await claimAuditStore.write({
        requestId,
        timestamp: new Date().toISOString(),
        event: "claim_cached",
        ip: clientIp,
        idempotencyKey: idempotencyKey.slice(0, 10),
        receiverAddress,
        txHash: existing.txHash,
      });

      return NextResponse.json(cached, {
        status: 200,
        headers: { "X-Idempotency-Key": idempotencyKey },
      });
    }

    idempotencyStore.set(idempotencyKey, {
      status: "processing",
      expiresAt: Date.now() + IDEMPOTENCY_PROCESSING_TTL_MS,
    });

    const provider = new JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== ARC_TESTNET.chainId) {
      idempotencyStore.delete(idempotencyKey);
      return jsonError(
        "CONFIG_ERROR",
        `RPC_URL must point to Arc Testnet (${ARC_TESTNET.chainId}).`,
        500
      );
    }

    const contractCode = await provider.getCode(contractAddress);
    if (!contractCode || contractCode === "0x") {
      idempotencyStore.delete(idempotencyKey);
      return jsonError(
        "CONFIG_ERROR",
        "CONTRACT_ADDRESS is not a deployed contract on the configured network.",
        500,
        false
      );
    }

    const relayer = new Wallet(privateKey, provider);
    const contract = new Contract(contractAddress, CLAIM_ABI, relayer);
    const usdc = new Contract(usdcAddress, ERC20_ABI, provider);
    const receiverBalanceBefore = (await usdc.balanceOf(
      receiverAddress
    )) as bigint;

    const tx = await contract.claim(paymentIdHash, receiverAddress);
    const receipt = await tx.wait();
    const txHash = receipt?.hash ?? tx.hash;
    const receiverBalanceAfter = (await usdc.balanceOf(
      receiverAddress
    )) as bigint;

    if (receiverBalanceAfter <= receiverBalanceBefore) {
      idempotencyStore.delete(idempotencyKey);
      const noTransferMessage =
        "Claim transaction confirmed, but receiver balance did not increase. Check claim contract payout logic.";

      await claimAuditStore.write({
        requestId,
        timestamp: new Date().toISOString(),
        event: "claim_error",
        ip: clientIp,
        idempotencyKey: idempotencyKey.slice(0, 10),
        receiverAddress,
        txHash,
        errorCode: "RELAY_ERROR",
        message: noTransferMessage,
      });

      return jsonError(
        "RELAY_ERROR",
        `${noTransferMessage} Tx: ${txHash}`,
        500,
        false
      );
    }

    idempotencyStore.set(idempotencyKey, {
      status: "success",
      txHash,
      expiresAt: Date.now() + IDEMPOTENCY_SUCCESS_TTL_MS,
    });

    console.info(
      JSON.stringify({
        event: "claim_success",
        idempotencyKey: idempotencyKey.slice(0, 10),
        receiverAddress,
        txHash,
      })
    );
    await claimAuditStore.write({
      requestId,
      timestamp: new Date().toISOString(),
      event: "claim_success",
      ip: clientIp,
      idempotencyKey: idempotencyKey.slice(0, 10),
      receiverAddress,
      txHash,
    });

    const response: ClaimSuccessResponse = {
      ok: true,
      txHash,
    };

    return NextResponse.json(response, {
      headers: { "X-Idempotency-Key": idempotencyKey },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit claim.";

    console.error(
      JSON.stringify({
        event: "claim_error",
        idempotencyKey: currentIdempotencyKey?.slice(0, 10) ?? "unknown",
        message,
      })
    );

    if (currentIdempotencyKey) {
      idempotencyStore.delete(currentIdempotencyKey);
    }
    await claimAuditStore.write({
      requestId,
      timestamp: new Date().toISOString(),
      event: "claim_error",
      ip: clientIp,
      idempotencyKey: currentIdempotencyKey?.slice(0, 10),
      errorCode: "RELAY_ERROR",
      message,
    });

    return jsonError("RELAY_ERROR", message, 500, true);
  }
}
