import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { loadOnChainStats } from "@/lib/server/on-chain-stats";

export const runtime = "nodejs";

const getCachedStats = unstable_cache(
  async () => loadOnChainStats(),
  ["api-onchain-stats-v1"],
  { revalidate: 60 }
);

export async function GET() {
  const stats = await getCachedStats();
  return NextResponse.json(stats, {
    headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
  });
}
