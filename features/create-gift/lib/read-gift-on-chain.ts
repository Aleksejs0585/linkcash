import { getAddress, parseUnits } from "ethers";

export type OnChainGiftRow = {
  amount: bigint;
  refundAddress: string;
  expiresAt: bigint;
  claimed: boolean;
};

type OkGiftApi = {
  ok: true;
  amountUsdc: string;
  refundAddress?: string;
  expiresAt: number;
  claimed: boolean;
};

const FETCH_TIMEOUT_MS = 12_000;

/** When chain confirms quickly, short early intervals feel like "a few seconds" again. */
function pauseBeforeNextPoll(attempt: number, overrideMs?: number): Promise<void> {
  const ms =
    overrideMs ??
    (attempt <= 24 ? 500 : attempt <= 48 ? 1000 : 2000);
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Poll the server `/api/gift` route instead of calling RPC from the browser.
 * Direct JsonRpcProvider to public Arc URLs often fails (CORS) or hangs without a timeout.
 *
 * We only require gift exists + not claimed for this paymentIdHash. Hash is unique per gift;
 * strict refund/amount checks caused endless waits when UI wallet ≠ on-chain refund checksum path.
 * POST /api/create-gift still validates amounts and refund against chain.
 */
export async function waitForClientFundedGift(params: {
  paymentIdHash: string;
  amountUsdc: string;
  refundAddress: string;
  maxAttempts?: number;
  /** Fixed delay between polls (ms). Omit for adaptive pacing (500ms → 1s → 2s). */
  delayMs?: number;
  /** Called each attempt so the UI does not look frozen */
  onProgress?: (attempt: number, max: number, detail: string) => void;
}): Promise<OnChainGiftRow> {
  const max = params.maxAttempts ?? 90;
  const hashSegment = encodeURIComponent(params.paymentIdHash);
  const started = Date.now();

  for (let i = 0; i < max; i++) {
    const attempt = i + 1;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(`/api/gift/${hashSegment}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = (await res.json()) as OkGiftApi | { ok: false; error: string };

      if (res.ok && data.ok && !data.claimed && typeof data.amountUsdc === "string") {
        let amountRaw: bigint;
        try {
          amountRaw = parseUnits(data.amountUsdc, 6);
        } catch {
          params.onProgress?.(
            attempt,
            max,
            "Invalid amount from API, retrying…"
          );
          await pauseBeforeNextPoll(attempt, params.delayMs);
          continue;
        }

        const refundAddress =
          data.refundAddress && data.refundAddress.length > 0
            ? getAddress(data.refundAddress)
            : params.refundAddress;

        params.onProgress?.(attempt, max, "Confirmed on Arc.");
        return {
          amount: amountRaw,
          refundAddress,
          expiresAt: BigInt(data.expiresAt),
          claimed: data.claimed,
        };
      }

      if (res.status === 404 || (!res.ok && "ok" in data && data.ok === false)) {
        const sec = Math.floor((Date.now() - started) / 1000);
        const hint =
          attempt > 28
            ? "Still waiting—tx may be slow, or CONTRACT_ADDRESS / NEXT_PUBLIC_CONTRACT_ADDRESS mismatch on the server."
            : "Waiting for your transaction to appear onchain…";
        params.onProgress?.(attempt, max, `${hint} (${sec}s)`);
      } else {
        params.onProgress?.(
          attempt,
          max,
          `Checking… HTTP ${res.status}`
        );
      }
    } catch {
      params.onProgress?.(
        attempt,
        max,
        "Network/RPC timeout, retrying…"
      );
    } finally {
      window.clearTimeout(timeoutId);
    }

    await pauseBeforeNextPoll(attempt, params.delayMs);
  }

  throw new Error(
    "Timed out waiting for onchain funding. Open ArcScan for your wallet, or verify CONTRACT_ADDRESS matches NEXT_PUBLIC_CONTRACT_ADDRESS."
  );
}
