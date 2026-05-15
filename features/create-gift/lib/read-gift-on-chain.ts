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
  refundAddress: string;
  expiresAt: number;
  claimed: boolean;
};

const FETCH_TIMEOUT_MS = 12_000;

/**
 * Poll the server `/api/gift` route instead of calling RPC from the browser.
 * Direct JsonRpcProvider to public Arc URLs often fails (CORS) or hangs without a timeout.
 */
export async function waitForClientFundedGift(params: {
  paymentIdHash: string;
  amountUsdc: string;
  refundAddress: string;
  maxAttempts?: number;
  delayMs?: number;
}): Promise<OnChainGiftRow> {
  const expectedRaw = parseUnits(params.amountUsdc, 6);
  const refund = getAddress(params.refundAddress);
  const max = params.maxAttempts ?? 60;
  const delayMs = params.delayMs ?? 2000;

  const hashSegment = encodeURIComponent(params.paymentIdHash);

  for (let i = 0; i < max; i++) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(`/api/gift/${hashSegment}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = (await res.json()) as OkGiftApi | { ok: false; error: string };

      if (res.ok && data.ok && !data.claimed) {
        const amountRaw = parseUnits(data.amountUsdc, 6);
        if (
          amountRaw === expectedRaw &&
          getAddress(data.refundAddress) === refund
        ) {
          return {
            amount: amountRaw,
            refundAddress: data.refundAddress,
            expiresAt: BigInt(data.expiresAt),
            claimed: data.claimed,
          };
        }
      }
    } catch {
      /* network / abort — retry */
    } finally {
      window.clearTimeout(timeoutId);
    }

    await new Promise((r) => setTimeout(r, delayMs));
  }

  throw new Error(
    "Timed out waiting for onchain funding. The transaction may still confirm—check ArcScan or try again."
  );
}
