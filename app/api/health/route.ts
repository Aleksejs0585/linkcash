import { NextResponse } from "next/server";
import { getArcReadEnv } from "@/lib/server/env";
import { createArcProvider } from "@/lib/server/arc-chain";
import { rateLimitedCheck } from "@/lib/server/simple-rate-limiter";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimitedCheck(`health:${ip}`, 20, 60_000);
  if (rl.limited) {
    return NextResponse.json(
      { ok: false, error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }
  const checks: Record<string, { ok: boolean; message?: string }> = {
    env: { ok: true },
    rpc: { ok: false },
    redis: { ok: true },
  };

  try {
    const { rpcUrl } = getArcReadEnv();
    const provider = await createArcProvider(rpcUrl);
    await provider.getBlockNumber();
    checks.rpc = { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "RPC check failed.";
    checks.rpc = { ok: false, message };
    if (message.includes("env var") || message.includes("valid EVM address")) {
      checks.env = { ok: false, message };
    }
  }

  const hasUpstash =
    Boolean(process.env.UPSTASH_REDIS_REST_URL?.trim()) &&
    Boolean(process.env.UPSTASH_REDIS_REST_TOKEN?.trim());
  if (!hasUpstash) {
    checks.redis = {
      ok: false,
      message:
        "UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing. Fallback memory store is active.",
    };
  }

  const ok = checks.rpc.ok && checks.env.ok;
  return NextResponse.json(
    {
      ok,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: ok ? 200 : 503 }
  );
}

