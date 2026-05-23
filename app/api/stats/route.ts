import { NextResponse } from "next/server";
import { loadOnChainStats } from "@/lib/server/on-chain-stats";

export const runtime = "nodejs";

export async function GET() {
  const stats = await loadOnChainStats();
  return NextResponse.json(stats, {
    headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
  });
}
