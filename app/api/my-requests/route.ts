import { NextResponse } from "next/server";
import { isAddress } from "ethers";
import { requestStore } from "@/lib/server/request-store";
import { rateLimitedCheck } from "@/lib/server/simple-rate-limiter";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimitedCheck(`my-requests:${ip}`, 30, 60_000);
  if (rl.limited) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const url = new URL(request.url);
  const walletAddress = url.searchParams.get("walletAddress")?.trim();
  if (!walletAddress || !isAddress(walletAddress)) {
    return NextResponse.json(
      { error: "walletAddress must be a valid address." },
      { status: 400 }
    );
  }

  const requests = await requestStore.listByWallet(walletAddress);

  // Strip requesterEmail before sending to client
  const sanitized = requests.map(({ requesterEmail: _e, ...rest }) => rest);

  return NextResponse.json({ ok: true, requests: sanitized });
}
