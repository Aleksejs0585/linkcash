import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { loadOnChainStats } from "@/lib/server/on-chain-stats";
import { rateLimitedCheck } from "@/lib/server/simple-rate-limiter";

export const runtime = "nodejs";

const getCachedStats = unstable_cache(
  async () => loadOnChainStats(),
  ["api-onchain-stats-v1"],
  { revalidate: 60 }
);

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  );
}

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const rl = await rateLimitedCheck(`stats:${ip}`, 60, 60_000);
  if (rl.limited) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const stats = await getCachedStats();
  return NextResponse.json(stats, {
    headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
  });
}
