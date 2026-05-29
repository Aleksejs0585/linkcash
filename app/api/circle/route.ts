import { NextResponse } from "next/server";
import { Contract, formatUnits, getAddress, Interface, isAddress, isHexString, JsonRpcProvider, parseUnits } from "ethers";
import { ARC_TESTNET } from "@/utils";
import { getArcReadEnv } from "@/lib/server/env";
import { rateLimitedCheck } from "@/lib/server/simple-rate-limiter";

const CIRCLE_BASE_URL =
  process.env.NEXT_PUBLIC_CIRCLE_BASE_URL ?? "https://api.circle.com";
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;

type CircleWalletRow = {
  id?: string;
  walletId?: string;
  address?: string;
  walletAddress?: string;
  blockchain?: string;
};

function parseCircleWalletRow(row: unknown): {
  id: string;
  address: string;
  blockchain: string;
} | null {
  if (!row || typeof row !== "object") return null;
  const w = row as CircleWalletRow;
  const id =
    typeof w.id === "string"
      ? w.id
      : typeof w.walletId === "string"
        ? w.walletId
        : "";
  const rawAddress =
    typeof w.address === "string"
      ? w.address
      : typeof w.walletAddress === "string"
        ? w.walletAddress
        : "";
  const blockchain = typeof w.blockchain === "string" ? w.blockchain : "";
  if (!id || !rawAddress || !isAddress(rawAddress)) return null;
  return { id, address: getAddress(rawAddress), blockchain };
}

async function fetchCircleWallets(userToken: string): Promise<unknown[]> {
  const response = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/wallets`, {
    method: "GET",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      Authorization: `Bearer ${CIRCLE_API_KEY}`,
      "X-User-Token": userToken,
    },
  });
  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : `Circle wallets error (${response.status})`
    );
  }
  const inner = data.data as { wallets?: unknown[] } | undefined;
  return inner?.wallets ?? [];
}

const ACTION_LIMITS: Record<string, number> = {
  createDeviceToken: 10,
  initializeUser: 5,
  giftFundingBatchChallenge: 8,
  refreshUserToken: 20,
  listWallets: 30,
  contractExecutionChallenge: 8,
  sendEmailOtp: 5,
};

const USDC_MAX_AMOUNT = 10_000;

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function POST(request: Request) {
  if (!CIRCLE_API_KEY) {
    return NextResponse.json(
      { error: "CIRCLE_API_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = (body.action as string | undefined)?.trim();
  if (!action) {
    return NextResponse.json({ error: "Missing action." }, { status: 400 });
  }
  if (!Object.prototype.hasOwnProperty.call(ACTION_LIMITS, action)) {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  // Rate limit per IP+action
  const ip = getClientIp(request);
  const limit = ACTION_LIMITS[action];
  const rl = await rateLimitedCheck(`circle:${ip}:${action}`, limit);
  if (rl.limited) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  try {
    const params = { ...body };
    delete params.action;

    switch (action) {
      case "createDeviceToken": {
        const deviceId = params.deviceId as string | undefined;
        if (!deviceId) {
          return NextResponse.json(
            { error: "Missing deviceId" },
            { status: 400 }
          );
        }

        const response = await fetch(
          `${CIRCLE_BASE_URL}/v1/w3s/users/social/token`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${CIRCLE_API_KEY}`,
            },
            body: JSON.stringify({
              idempotencyKey: crypto.randomUUID(),
              deviceId,
            }),
          }
        );

        const data = (await response.json()) as Record<string, unknown>;

        if (!response.ok) {
          const msg = typeof data.message === "string" ? data.message : `Request failed (${response.status})`;
          return NextResponse.json({ error: msg }, { status: response.status });
        }

        const inner = data.data as {
          deviceToken: string;
          deviceEncryptionKey: string;
        };
        return NextResponse.json(inner, { status: 200 });
      }

      case "initializeUser": {
        const userToken = params.userToken as string | undefined;
        if (!userToken) {
          return NextResponse.json(
            { error: "Missing userToken" },
            { status: 400 }
          );
        }

        const response = await fetch(
          `${CIRCLE_BASE_URL}/v1/w3s/user/initialize`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${CIRCLE_API_KEY}`,
              "X-User-Token": userToken,
            },
            body: JSON.stringify({
              idempotencyKey: crypto.randomUUID(),
              accountType: "EOA",
              blockchains: ["ARC-TESTNET"],
            }),
          }
        );

        const data = (await response.json()) as Record<string, unknown>;

        if (!response.ok) {
          const msg = typeof data.message === "string" ? data.message : `Request failed (${response.status})`;
          return NextResponse.json({ error: msg }, { status: response.status });
        }

        const inner = data.data as { challengeId: string };
        return NextResponse.json(inner, { status: 200 });
      }

      case "listWallets": {
        const userToken = params.userToken as string | undefined;
        if (!userToken) {
          return NextResponse.json(
            { error: "Missing userToken" },
            { status: 400 }
          );
        }

        const response = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/wallets`, {
          method: "GET",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            Authorization: `Bearer ${CIRCLE_API_KEY}`,
            "X-User-Token": userToken,
          },
        });

        const data = (await response.json()) as Record<string, unknown>;

        if (!response.ok) {
          const msg = typeof data.message === "string" ? data.message : `Request failed (${response.status})`;
          return NextResponse.json({ error: msg }, { status: response.status });
        }

        const inner = data.data as { wallets: unknown[] };
        return NextResponse.json(inner, { status: 200 });
      }

      case "contractExecutionChallenge": {
        const userToken = params.userToken as string | undefined;
        const walletId = params.walletId as string | undefined;
        const contractAddress = (params.contractAddress as string | undefined)?.trim();
        const abiFunctionSignature = (
          params.abiFunctionSignature as string | undefined
        )?.trim();
        const abiParameters = params.abiParameters as unknown[] | undefined;

        if (!userToken || !walletId) {
          return NextResponse.json(
            { error: "Missing userToken or walletId" },
            { status: 400 }
          );
        }

        let arc: { usdcAddress: string; contractAddress: string };
        try {
          arc = getArcReadEnv();
        } catch {
          return NextResponse.json(
            { error: "Arc contract env is not configured on the server." },
            { status: 503 }
          );
        }

        if (!contractAddress || !isAddress(contractAddress)) {
          return NextResponse.json(
            { error: "Invalid contractAddress" },
            { status: 400 }
          );
        }

        if (
          contractAddress.toLowerCase() !== arc.usdcAddress.toLowerCase()
        ) {
          return NextResponse.json(
            { error: "Contract execution is only allowed for USDC." },
            { status: 400 }
          );
        }

        if (abiFunctionSignature !== "approve(address,uint256)") {
          return NextResponse.json(
            { error: "Unsupported contract call." },
            { status: 400 }
          );
        }

        if (!Array.isArray(abiParameters) || abiParameters.length !== 2) {
          return NextResponse.json(
            { error: "approve requires two ABI parameters." },
            { status: 400 }
          );
        }

        const spenderRaw = String(abiParameters[0]).trim();
        const amountRaw = String(abiParameters[1]).trim();
        if (!isAddress(spenderRaw)) {
          return NextResponse.json(
            { error: "Invalid approve spender address." },
            { status: 400 }
          );
        }
        if (!/^\d+$/.test(amountRaw)) {
          return NextResponse.json(
            { error: "Invalid approve amount." },
            { status: 400 }
          );
        }

        if (BigInt(amountRaw) > parseUnits(String(USDC_MAX_AMOUNT), 6)) {
          return NextResponse.json(
            { error: `Approve amount cannot exceed ${USDC_MAX_AMOUNT} USDC.` },
            { status: 400 }
          );
        }

        if (
          getAddress(spenderRaw).toLowerCase() !==
          getAddress(arc.contractAddress).toLowerCase()
        ) {
          return NextResponse.json(
            { error: "Approve spender must be the gift contract address." },
            { status: 400 }
          );
        }

        const response = await fetch(
          `${CIRCLE_BASE_URL}/v1/w3s/user/transactions/contractExecution`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${CIRCLE_API_KEY}`,
              "X-User-Token": userToken,
              "X-Request-Id": crypto.randomUUID(),
            },
            body: JSON.stringify({
              idempotencyKey: crypto.randomUUID(),
              walletId,
              contractAddress: arc.usdcAddress,
              abiFunctionSignature: "approve(address,uint256)",
              abiParameters: [getAddress(spenderRaw), amountRaw],
              feeLevel: "MEDIUM",
            }),
          }
        );

        const data = (await response.json()) as Record<string, unknown>;

        if (!response.ok) {
          const msg = typeof data.message === "string" ? data.message : `Request failed (${response.status})`;
          return NextResponse.json({ error: msg }, { status: response.status });
        }

        const inner = data.data as { challengeId: string };
        return NextResponse.json(inner, { status: 200 });
      }

      case "giftFundingBatchChallenge": {
        const userToken = params.userToken as string | undefined;
        const walletId = params.walletId as string | undefined;
        const paymentIdHash = (params.paymentIdHash as string | undefined)?.trim();
        const amountUsdc = (params.amountUsdc as string | undefined)?.trim();
        const expiresInHoursRaw = params.expiresInHours;

        if (!userToken || !walletId || !paymentIdHash || !amountUsdc) {
          return NextResponse.json(
            {
              error:
                "Missing userToken, walletId, paymentIdHash, or amountUsdc.",
            },
            { status: 400 }
          );
        }

        if (!isHexString(paymentIdHash, 32)) {
          return NextResponse.json(
            { error: "paymentIdHash must be a bytes32 hex string." },
            { status: 400 }
          );
        }

        const expiresInHours = Number(expiresInHoursRaw);
        if (
          !Number.isFinite(expiresInHours) ||
          expiresInHours <= 0 ||
          expiresInHours > 720
        ) {
          return NextResponse.json(
            { error: "expiresInHours must be between 1 and 720." },
            { status: 400 }
          );
        }

        const amountNum = Number(amountUsdc);
        if (!Number.isFinite(amountNum) || amountNum < 0.01) {
          return NextResponse.json(
            { error: "amountUsdc must be at least 0.01 USDC." },
            { status: 400 }
          );
        }
        if (amountNum > USDC_MAX_AMOUNT) {
          return NextResponse.json(
            { error: `amountUsdc cannot exceed ${USDC_MAX_AMOUNT} USDC.` },
            { status: 400 }
          );
        }

        let arc: { rpcUrl: string; contractAddress: string; usdcAddress: string };
        try {
          arc = getArcReadEnv();
        } catch {
          return NextResponse.json(
            { error: "Arc contract env is not configured on the server." },
            { status: 503 }
          );
        }

        let walletsRaw: unknown[];
        try {
          walletsRaw = await fetchCircleWallets(userToken);
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : "Failed to list wallets.";
          return NextResponse.json({ error: msg }, { status: 502 });
        }

        let scaAddress: string | null = null;
        for (const row of walletsRaw) {
          const w = parseCircleWalletRow(row);
          if (w && w.id === walletId && w.blockchain === "ARC-TESTNET") {
            scaAddress = w.address;
            break;
          }
        }

        if (!scaAddress) {
          return NextResponse.json(
            {
              error:
                "ARC-TESTNET wallet not found for this walletId.",
            },
            { status: 400 }
          );
        }

        let amountRaw: bigint;
        try {
          amountRaw = parseUnits(amountUsdc, 6);
        } catch {
          return NextResponse.json(
            { error: "Invalid USDC amount format." },
            { status: 400 }
          );
        }

        try {
          const balanceProvider = new JsonRpcProvider(arc.rpcUrl, ARC_TESTNET.chainId);
          const usdcRead = new Contract(
            arc.usdcAddress,
            ["function balanceOf(address) view returns (uint256)"],
            balanceProvider
          );
          const balance = await Promise.race([
            usdcRead.balanceOf(scaAddress) as Promise<bigint>,
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("timeout")), 5_000)
            ),
          ]);
          if (balance < amountRaw) {
            const has = formatUnits(balance, 6);
            return NextResponse.json(
              {
                error: `Insufficient USDC balance. Your wallet has ${has} USDC but the gift requires ${amountUsdc} USDC. Top up at the faucet and try again.`,
              },
              { status: 400 }
            );
          }
        } catch (balanceErr) {
          console.warn("[createGift] balance pre-check skipped:", balanceErr);
        }

        const expiresAt = BigInt(
          Math.floor(Date.now() / 1000) + Math.floor(expiresInHours * 3600)
        );

        const approveIface = new Interface(["function approve(address,uint256)"]);
        const approveData = approveIface.encodeFunctionData("approve", [
          getAddress(arc.contractAddress),
          amountRaw,
        ]);

        const giftIface = new Interface([
          "function fundGift(bytes32,uint256,address,uint64)",
        ]);
        const fundData = giftIface.encodeFunctionData("fundGift", [
          paymentIdHash,
          amountRaw,
          getAddress(scaAddress),
          expiresAt,
        ]);

        const usdcAddr = getAddress(arc.usdcAddress);
        const giftAddr = getAddress(arc.contractAddress);

        const batchParameter: [string, string, string][] = [
          [usdcAddr, "0", approveData],
          [giftAddr, "0", fundData],
        ];

        const response = await fetch(
          `${CIRCLE_BASE_URL}/v1/w3s/user/transactions/contractExecution`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${CIRCLE_API_KEY}`,
              "X-User-Token": userToken,
              "X-Request-Id": crypto.randomUUID(),
            },
            body: JSON.stringify({
              idempotencyKey: crypto.randomUUID(),
              walletId,
              contractAddress: getAddress(scaAddress),
              abiFunctionSignature:
                "executeBatch((address, uint256, bytes)[])",
              abiParameters: [batchParameter],
              feeLevel: "MEDIUM",
            }),
          }
        );

        const data = (await response.json()) as Record<string, unknown>;

        if (!response.ok) {
          const msg = typeof data.message === "string" ? data.message : `Request failed (${response.status})`;
          return NextResponse.json({ error: msg }, { status: response.status });
        }

        const inner = data.data as { challengeId: string };
        return NextResponse.json(inner, { status: 200 });
      }

      case "sendEmailOtp": {
        const email = (params.email as string | undefined)?.trim().toLowerCase();
        const deviceId = (params.deviceId as string | undefined)?.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
        }
        if (!deviceId) {
          return NextResponse.json({ error: "Missing deviceId." }, { status: 400 });
        }

        const response = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/users/email/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${CIRCLE_API_KEY}`,
          },
          body: JSON.stringify({
            idempotencyKey: crypto.randomUUID(),
            deviceId,
            email,
          }),
        });

        const data = (await response.json()) as Record<string, unknown>;
        if (!response.ok) {
          const msg = typeof data.message === "string" ? data.message : `Request failed (${response.status})`;
          return NextResponse.json({ error: msg }, { status: response.status });
        }

        const inner = data.data as { otpToken: string };
        return NextResponse.json(inner, { status: 200 });
      }

      case "refreshUserToken": {
        const refreshToken = params.refreshToken as string | undefined;
        if (!refreshToken) {
          return NextResponse.json(
            { error: "Missing refreshToken" },
            { status: 400 }
          );
        }

        const response = await fetch(
          `${CIRCLE_BASE_URL}/v1/w3s/users/social/token`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${CIRCLE_API_KEY}`,
            },
            body: JSON.stringify({
              idempotencyKey: crypto.randomUUID(),
              refreshToken,
            }),
          }
        );

        const data = (await response.json()) as Record<string, unknown>;

        if (!response.ok) {
          const msg = typeof data.message === "string" ? data.message : `Request failed (${response.status})`;
          return NextResponse.json({ error: msg }, { status: response.status });
        }

        const inner = data.data as {
          userToken?: string;
          encryptionKey?: string;
          refreshToken?: string;
        };
        return NextResponse.json(inner, { status: 200 });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unexpected error.";
    console.error("Error in /api/circle:", msg);
    return NextResponse.json(
      { error: "Failed to process wallet request. Please try again." },
      { status: 500 }
    );
  }
}
