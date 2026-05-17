"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { isAddress } from "ethers";
import AppShell from "@/components/ui/app-shell";
import GlassCard from "../../components/ui/glass-card";
import MainMenu from "../../components/ui/main-menu";
import OAuthNavHint from "../../components/ui/oauth-nav-hint";
import { isCircleWalletConfigured } from "../../features/circle-wallet/config/circle-env";
import { useCircleWallet } from "../../features/circle-wallet/model/circle-wallet-provider";
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
  if (!isCircleWalletConfigured()) {
    return (
      <AppShell className="flex items-center justify-center px-5 py-10">
        <GlassCard className="relative z-[1] w-full max-w-[520px] space-y-3 p-8 text-center">
          <div className="flex justify-start">
            <MainMenu />
          </div>
          <h1 className="app-heading text-3xl">Sender Dashboard</h1>
          <p className="soft-text text-sm">
            Set <code>NEXT_PUBLIC_CIRCLE_APP_ID</code>,{" "}
            <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>, and server{" "}
            <code>CIRCLE_API_KEY</code> to view the sender dashboard.
          </p>
        </GlassCard>
      </AppShell>
    );
  }

  return <SenderDashboardContent />;
}

function SenderDashboardContent() {
  const {
    ready,
    authenticated,
    login,
    walletAddress: senderWalletAddress,
    authError,
    bootstrapError,
    walletSyncing,
  } = useCircleWallet();
  const [loading, setLoading] = useState(false);
  const [reclaimingHash, setReclaimingHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [gifts, setGifts] = useState<SenderGiftItem[]>([]);

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
    active: "status-pill-active",
    expired: "status-pill-expired",
    claimed: "status-pill-claimed",
    reclaimed: "status-pill-reclaimed",
  };

  return (
    <AppShell className="px-4 py-8 sm:px-5 sm:py-10" glow="top">
      <div className="relative z-[1] mx-auto w-full max-w-4xl space-y-4 sm:space-y-5">
        <GlassCard className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="app-section-label">{ARC_TESTNET.chainName}</p>
              <h1 className="app-heading mt-1 text-2xl sm:text-3xl">
                Sender Dashboard
              </h1>
              <p className="soft-text mt-2 text-sm">
                Track funded gifts and reclaim expired gifts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <MainMenu />
              <button
                type="button"
                onClick={() => loadGifts().catch(() => undefined)}
                className="app-btn-secondary px-3 py-2 text-sm"
              >
                Refresh
              </button>
            </div>
          </div>

          {bootstrapError && (
            <p className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">
              {bootstrapError}
            </p>
          )}

          {!ready ? (
            <p className="text-sm text-white/70">Loading wallet...</p>
          ) : !authenticated ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void login()}
                className="accent-gradient w-full rounded-[var(--radius-sm)] px-4 py-3 text-sm"
              >
                Sign in with Google
              </button>
              <OAuthNavHint className="text-left text-xs leading-relaxed text-white/55" />
              {authError && (
                <p className="text-sm text-rose-400">{authError}</p>
              )}
            </div>
          ) : !senderWalletAddress ? (
            <p className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-amber-300">
              {walletSyncing
                ? "Circle wallet is finishing setup..."
                : "No wallet address for this session yet."}
            </p>
          ) : (
            <p className="app-panel break-all p-3 text-xs text-[var(--muted)]">
              Sender wallet: {senderWalletAddress}
            </p>
          )}

          {status && <p className="break-all text-sm text-emerald-300">{status}</p>}
          {error && <p className="text-sm text-rose-400">{error}</p>}
        </GlassCard>

        <GlassCard className="space-y-3 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Created gifts</h2>
            <p className="text-xs text-white/60">{gifts.length} total</p>
          </div>

          {loading ? (
            <p className="text-sm text-white/65">Loading gifts...</p>
          ) : gifts.length === 0 ? (
            <p className="text-sm text-white/60">
              No gifts yet. Create your first gift from the create page.
            </p>
          ) : (
            <div className="space-y-2">
              {gifts.map((gift) => (
                <div
                  key={gift.paymentIdHash}
                  className="app-panel p-3 sm:p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-base font-semibold">{gift.amountUsdc} USDC</p>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.1em] ${statusClassByType[gift.status]}`}
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
                      className="app-btn-secondary px-3 py-1.5 text-xs app-link"
                    >
                      Track status
                    </Link>
                    <a
                      href={getArcExplorerTxUrl(gift.fundedTxHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="app-btn-secondary px-3 py-1.5 text-xs app-link"
                    >
                      Funding tx
                    </a>

                    {gift.reclaimTxHash && (
                      <a
                        href={getArcExplorerTxUrl(gift.reclaimTxHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="app-btn-secondary px-3 py-1.5 text-xs app-link"
                      >
                        Reclaim tx
                      </a>
                    )}

                    {gift.status === "expired" && (
                      <button
                        type="button"
                        onClick={() => void onReclaim(gift.paymentIdHash)}
                        disabled={reclaimingHash === gift.paymentIdHash}
                        className="app-btn-secondary px-3 py-1.5 text-xs disabled:opacity-60"
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
      </div>
    </AppShell>
  );
}
