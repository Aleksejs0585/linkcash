"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isAddress } from "ethers";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import GlassCard from "../../components/ui/glass-card";
import { ARC_TESTNET, getArcExplorerTxUrl } from "../../utils";

type SenderGiftStatus = "active" | "expired" | "claimed" | "reclaimed";

type SenderGiftItem = {
  paymentIdHash: string;
  status: SenderGiftStatus;
  amountUsdc: string;
  refundAddress: string;
  expiresAt: number;
  createdAt: string;
  fundedTxHash: string;
  reclaimTxHash?: string;
};

type SenderGiftsResponse =
  | {
      ok: true;
      gifts: SenderGiftItem[];
    }
  | {
      ok: false;
      error: string;
    };

export default function SenderDashboardPage() {
  const hasPrivyAppId = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
  if (!hasPrivyAppId) {
    return (
      <main className="relative flex min-h-screen items-center justify-center px-5 py-10 text-white">
        <GlassCard className="w-full max-w-[520px] space-y-3 p-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Sender Dashboard</h1>
          <p className="soft-text text-sm">
            Set <code>NEXT_PUBLIC_PRIVY_APP_ID</code> to view sender gifts.
          </p>
        </GlassCard>
      </main>
    );
  }

  return <SenderDashboardContent />;
}

function SenderDashboardContent() {
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const [loading, setLoading] = useState(false);
  const [reclaimingHash, setReclaimingHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [gifts, setGifts] = useState<SenderGiftItem[]>([]);

  const senderWalletAddress = useMemo(
    () =>
      wallets.find(
        (wallet) =>
          wallet.walletClientType === "privy" ||
          wallet.walletClientType === "privy-v2"
      )?.address ?? null,
    [wallets]
  );

  const loadGifts = useCallback(async () => {
    if (!senderWalletAddress || !isAddress(senderWalletAddress)) {
      setGifts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/sender-gifts?senderAddress=${senderWalletAddress}`,
        { method: "GET" }
      );
      const data = (await response.json()) as SenderGiftsResponse;
      if (!response.ok || !data.ok) {
        throw new Error(data.ok ? "Failed to load sender gifts." : data.error);
      }

      setGifts(data.gifts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sender gifts.");
    } finally {
      setLoading(false);
    }
  }, [senderWalletAddress]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      loadGifts().catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [loadGifts]);

  const onReclaim = async (paymentIdHash: string) => {
    setReclaimingHash(paymentIdHash);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/reclaim-gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIdHash }),
      });
      const data = (await response.json()) as
        | { ok: true; txHash: string }
        | { error: string };

      if (!response.ok || !("txHash" in data)) {
        throw new Error("error" in data ? data.error : "Failed to reclaim gift.");
      }

      setStatus(`Reclaim submitted. Tx: ${data.txHash}`);
      await loadGifts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reclaim gift.");
    } finally {
      setReclaimingHash(null);
    }
  };

  const statusClassByType: Record<SenderGiftStatus, string> = {
    active: "text-emerald-300 border-emerald-300/30 bg-emerald-400/10",
    expired: "text-amber-300 border-amber-300/30 bg-amber-400/10",
    claimed: "text-blue-300 border-blue-300/30 bg-blue-400/10",
    reclaimed: "text-violet-300 border-violet-300/30 bg-violet-400/10",
  };

  return (
    <main className="relative min-h-screen px-5 py-10 text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(139,92,246,0.2)_0%,_rgba(59,130,246,0.12)_40%,_transparent_75%)] blur-3xl" />
      <div className="relative mx-auto w-full max-w-4xl space-y-5">
        <GlassCard className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                {ARC_TESTNET.chainName}
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                Sender Dashboard
              </h1>
              <p className="soft-text mt-2 text-sm">
                Track all funded gifts and reclaim expired ones.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadGifts().catch(() => undefined)}
              className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/85 transition hover:bg-white/5"
            >
              Refresh
            </button>
          </div>

          {!ready ? (
            <p className="text-sm text-white/70">Loading wallet...</p>
          ) : !authenticated ? (
            <button
              type="button"
              onClick={login}
              className="accent-gradient w-full rounded-xl px-4 py-3 text-sm font-semibold"
            >
              Sign in to view sender dashboard
            </button>
          ) : !senderWalletAddress ? (
            <p className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-amber-300">
              No embedded wallet found for this account.
            </p>
          ) : (
            <p className="break-all rounded-xl border border-white/10 bg-black/25 p-3 text-xs text-white/70">
              Sender wallet: {senderWalletAddress}
            </p>
          )}

          {status && <p className="text-sm text-emerald-300 break-all">{status}</p>}
          {error && <p className="text-sm text-rose-400">{error}</p>}
        </GlassCard>

        <GlassCard className="space-y-3 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Created gifts</h2>
            <p className="text-xs text-white/60">{gifts.length} total</p>
          </div>

          {loading ? (
            <p className="text-sm text-white/65">Loading gifts...</p>
          ) : gifts.length === 0 ? (
            <p className="text-sm text-white/60">
              No gifts yet. Create your first one from the create page.
            </p>
          ) : (
            <div className="space-y-2">
              {gifts.map((gift) => (
                <div
                  key={gift.paymentIdHash}
                  className="rounded-xl border border-white/10 bg-black/25 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-base font-semibold">{gift.amountUsdc} USDC</p>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.1em] ${statusClassByType[gift.status]}`}
                    >
                      {gift.status}
                    </span>
                  </div>

                  <p className="mt-2 break-all text-xs text-white/60">
                    hash: {gift.paymentIdHash}
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    created: {new Date(gift.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    expires: {new Date(gift.expiresAt * 1000).toLocaleString()}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/status/${gift.paymentIdHash}`}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-violet-300 transition hover:bg-white/5"
                    >
                      Track status
                    </Link>
                    <a
                      href={getArcExplorerTxUrl(gift.fundedTxHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-blue-300 transition hover:bg-white/5"
                    >
                      Funding tx
                    </a>

                    {gift.reclaimTxHash && (
                      <a
                        href={getArcExplorerTxUrl(gift.reclaimTxHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-violet-300 transition hover:bg-white/5"
                      >
                        Reclaim tx
                      </a>
                    )}

                    {gift.status === "expired" && (
                      <button
                        type="button"
                        onClick={() => onReclaim(gift.paymentIdHash)}
                        disabled={reclaimingHash === gift.paymentIdHash}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/85 transition hover:bg-white/5 disabled:opacity-60"
                      >
                        {reclaimingHash === gift.paymentIdHash
                          ? "Reclaiming..."
                          : "Reclaim"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <div className="text-center">
          <Link
            href="/create"
            className="text-sm text-white/70 underline decoration-white/25 underline-offset-4"
          >
            Back to create gift
          </Link>
        </div>
      </div>
    </main>
  );
}
