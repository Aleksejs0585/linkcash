"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { isAddress } from "ethers";
import AppShell from "@/components/ui/app-shell";
import GlassCard from "@/components/ui/glass-card";
import MainMenu from "@/components/ui/main-menu";
import { HelpTrigger } from "@/components/ui/help-manual";
import OAuthNavHint from "@/components/ui/oauth-nav-hint";
import { isCircleWalletConfigured } from "@/features/circle-wallet/config/circle-env";
import { useCircleWallet } from "@/features/circle-wallet/model/circle-wallet-provider";
import { ARC_TESTNET, getArcExplorerTxUrl } from "@/utils";

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
  | { ok: true; gifts: SenderGiftItem[] }
  | { ok: false; error: string };

type ReceivedGiftItem = {
  paymentIdHash: string;
  amountUsdc: string;
  txHash: string;
  senderDisplayName: string | null;
  giftMessage: string | null;
  claimedAt: string | null;
};

type ReceivedGiftsResponse =
  | { ok: true; gifts: ReceivedGiftItem[] }
  | { ok: false; error: string };

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function expiryLabel(expiresAt: number, status: SenderGiftStatus): string {
  const date = new Date(expiresAt * 1000);
  const now = Date.now() / 1000;
  if (status === "active") {
    const rem = expiresAt - Math.floor(now);
    if (rem <= 0) return "Expiring...";
    const h = Math.floor(rem / 3600);
    const m = Math.floor((rem % 3600) / 60);
    return h > 0 ? `Expires in ${h}h ${m}m` : `Expires in ${m}m`;
  }
  if (status === "expired") return `Expired ${timeAgo(date)}`;
  if (status === "claimed") return `Expired ${date.toLocaleDateString()}`;
  return date.toLocaleDateString();
}

const STATUS_LABEL: Record<SenderGiftStatus, string> = {
  active: "Active",
  expired: "Expired",
  claimed: "Claimed",
  reclaimed: "Reclaimed",
};

const STATUS_ICON: Record<SenderGiftStatus, string> = {
  active: "●",
  expired: "⚠",
  claimed: "✓",
  reclaimed: "↩",
};

export default function SenderDashboardPage() {
  if (!isCircleWalletConfigured()) {
    return (
      <AppShell className="flex items-center justify-center px-5 py-10">
        <GlassCard className="relative z-[1] w-full max-w-[520px] space-y-3 p-8 text-center">
          <div className="flex items-center justify-between">
            <MainMenu />
            <HelpTrigger />
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

type Tab = "sent" | "received";

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
  const [tab, setTab] = useState<Tab>("sent");
  const [loading, setLoading] = useState(false);
  const [reclaimingHash, setReclaimingHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [gifts, setGifts] = useState<SenderGiftItem[]>([]);
  const [receivedGifts, setReceivedGifts] = useState<ReceivedGiftItem[]>([]);

  const loadGifts = useCallback(async () => {
    if (!senderWalletAddress || !isAddress(senderWalletAddress)) {
      setGifts([]);
      setReceivedGifts([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [sentRes, receivedRes] = await Promise.all([
        fetch(`/api/sender-gifts?senderAddress=${senderWalletAddress}`),
        fetch(`/api/received-gifts?receiverAddress=${senderWalletAddress}`),
      ]);
      const sentData = (await sentRes.json()) as SenderGiftsResponse;
      const receivedData = (await receivedRes.json()) as ReceivedGiftsResponse;
      if (!sentRes.ok || !sentData.ok) throw new Error(sentData.ok ? "Failed to load sent gifts." : sentData.error);
      if (!receivedRes.ok || !receivedData.ok) throw new Error(receivedData.ok ? "Failed to load received gifts." : receivedData.error);
      setGifts(sentData.gifts);
      setReceivedGifts(receivedData.gifts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load gifts.");
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
      setStatus(`Reclaimed. Tx: ${data.txHash}`);
      await loadGifts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reclaim gift.");
    } finally {
      setReclaimingHash(null);
    }
  };

  const expiredUnclaimed = gifts.filter((g) => g.status === "expired");

  return (
    <AppShell className="px-4 py-8 sm:px-5 sm:py-10" glow="top">
      <div className="relative z-[1] mx-auto w-full max-w-3xl space-y-4 sm:space-y-5">

        {/* Header card */}
        <GlassCard className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="app-section-label">{ARC_TESTNET.chainName}</p>
              <h1 className="app-heading mt-1 text-2xl sm:text-3xl">Sender Dashboard</h1>
              <p className="soft-text mt-1 text-sm">All gifts you funded on-chain.</p>
            </div>
            <div className="flex items-center gap-2">
              <MainMenu />
              <HelpTrigger />
              <button
                type="button"
                onClick={() => loadGifts().catch(() => undefined)}
                disabled={loading}
                className="app-btn-secondary px-3 py-2 text-sm disabled:opacity-60"
              >
                {loading ? "Loading…" : "Refresh"}
              </button>
            </div>
          </div>

          {bootstrapError && (
            <p className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">
              {bootstrapError}
            </p>
          )}

          {!ready ? (
            <div className="animate-pulse space-y-3" aria-hidden>
              <div className="h-9 w-full rounded-[var(--radius-sm)] bg-white/8" />
              <div className="h-14 w-full rounded-[var(--radius)] bg-white/6" />
              <div className="h-9 w-3/4 rounded-[var(--radius-sm)] bg-white/8" />
            </div>
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
              {authError && <p className="text-sm text-rose-400">{authError}</p>}
            </div>
          ) : !senderWalletAddress ? (
            <p className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-amber-300">
              {walletSyncing
                ? "Circle wallet is finishing setup..."
                : "No wallet address for this session yet."}
            </p>
          ) : (
            <p className="break-all text-xs text-white/40">
              {senderWalletAddress}
            </p>
          )}

          {status && <p className="break-all text-sm text-emerald-300">{status}</p>}
          {error && <p className="text-sm text-rose-400">{error}</p>}
        </GlassCard>

        {/* Gifts list */}
        <GlassCard className="p-4 sm:p-6">
          {/* Tabs */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex gap-1 rounded-lg border border-white/10 bg-white/4 p-1">
              {(["sent", "received"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    tab === t
                      ? "bg-white/12 text-white"
                      : "text-white/50 hover:text-white/75"
                  }`}
                >
                  {t === "sent" ? "Sent" : "Received"}
                  {t === "sent" && gifts.length > 0 && (
                    <span className="ml-1.5 text-xs text-white/40">{gifts.length}</span>
                  )}
                  {t === "received" && receivedGifts.length > 0 && (
                    <span className="ml-1.5 text-xs text-white/40">{receivedGifts.length}</span>
                  )}
                </button>
              ))}
            </div>
            {tab === "sent" && expiredUnclaimed.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  expiredUnclaimed.forEach((g) => void onReclaim(g.paymentIdHash))
                }
                disabled={reclaimingHash !== null}
                className="accent-gradient rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium disabled:opacity-60"
              >
                Reclaim all ({expiredUnclaimed.length})
              </button>
            )}
          </div>

          {loading && gifts.length === 0 && receivedGifts.length === 0 ? (
            <div className="animate-pulse space-y-3" aria-hidden>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 rounded-[var(--radius)] bg-white/6" />
              ))}
            </div>
          ) : tab === "received" ? (
            receivedGifts.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-2xl">📭</p>
                <p className="mt-2 text-sm text-white/60">No received gifts yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {receivedGifts.map((gift) => (
                  <div key={gift.paymentIdHash} className="app-panel p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xl font-bold tracking-tight">
                        {gift.amountUsdc}{" "}
                        <span className="text-base font-normal text-white/60">USDC</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-300">
                        ✓ Claimed
                      </span>
                    </div>
                    {gift.senderDisplayName && (
                      <p className="mt-2 text-sm text-white/70">
                        From <span className="text-white/90">{gift.senderDisplayName}</span>
                      </p>
                    )}
                    {gift.giftMessage && (
                      <p className="mt-1 text-sm italic text-white/55">"{gift.giftMessage}"</p>
                    )}
                    <div className="mt-3">
                      <a
                        href={`/status/${gift.paymentIdHash}`}
                        className="app-btn-secondary px-3 py-1.5 text-xs"
                      >
                        View details
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : gifts.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-2xl">🎁</p>
              <p className="mt-2 text-sm text-white/60">No gifts yet.</p>
              <Link
                href="/create"
                className="mt-3 inline-block text-sm text-[var(--accent)] underline-offset-2 hover:underline"
              >
                Create your first gift →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {gifts.map((gift) => (
                <div
                  key={gift.paymentIdHash}
                  className="app-panel p-4"
                >
                  {/* Top row: amount + status */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xl font-bold tracking-tight">
                      {gift.amountUsdc}{" "}
                      <span className="text-base font-normal text-white/60">USDC</span>
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] status-pill-${gift.status}`}
                    >
                      <span aria-hidden>{STATUS_ICON[gift.status]}</span>
                      {STATUS_LABEL[gift.status]}
                    </span>
                  </div>

                  {/* Dates row */}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
                    <span>Sent {timeAgo(new Date(gift.createdAt))}</span>
                    <span
                      className={
                        gift.status === "expired" ? "text-amber-400" :
                        gift.status === "active" ? "text-emerald-400/80" :
                        ""
                      }
                    >
                      {expiryLabel(gift.expiresAt, gift.status)}
                    </span>
                  </div>

                  {/* Actions row */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/status/${gift.paymentIdHash}`}
                      className="app-btn-secondary px-3 py-1.5 text-xs"
                    >
                      Track status
                    </Link>
                    <a
                      href={getArcExplorerTxUrl(gift.fundedTxHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="app-btn-secondary px-3 py-1.5 text-xs"
                    >
                      Funding tx ↗
                    </a>
                    {gift.reclaimTxHash && (
                      <a
                        href={getArcExplorerTxUrl(gift.reclaimTxHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="app-btn-secondary px-3 py-1.5 text-xs"
                      >
                        Reclaim tx ↗
                      </a>
                    )}

                    {gift.status === "expired" && (
                      <button
                        type="button"
                        onClick={() => void onReclaim(gift.paymentIdHash)}
                        disabled={reclaimingHash !== null}
                        className="accent-gradient rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium disabled:opacity-60"
                      >
                        {reclaimingHash === gift.paymentIdHash
                          ? "Reclaiming…"
                          : "↩ Reclaim"}
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
