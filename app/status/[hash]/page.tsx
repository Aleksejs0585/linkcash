"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/ui/app-shell";
import GlassCard from "@/components/ui/glass-card";
import MainMenu from "@/components/ui/main-menu";
import { ARC_TESTNET, getArcExplorerTxUrl } from "@/utils";
import { trackEvent } from "@/lib/client/analytics";

const statusStyles = {
  active: "status-pill-active",
  claimed: "status-pill-claimed",
  expired: "status-pill-expired",
  reclaimed: "status-pill-reclaimed",
  not_found: "status-pill-not_found",
} as const;

function statusLabel(status: keyof typeof statusStyles) {
  switch (status) {
    case "active":
      return "Active";
    case "claimed":
      return "Claimed";
    case "expired":
      return "Expired";
    case "reclaimed":
      return "Reclaimed";
    default:
      return "Not found";
  }
}

type PublicStatusResponse = {
  ok: boolean;
  paymentIdHash: string;
  status: keyof typeof statusStyles;
  whereFunds: string;
  amountUsdc?: string;
  expiresAt?: number;
  error?: string;
  tx: {
    fundingTxHash?: string;
    claimTxHash?: string;
    reclaimTxHash?: string;
  };
  timeline: Array<{
    id: string;
    title: string;
    description: string;
    state: "completed" | "pending" | "unavailable";
    timestamp?: string;
    txHash?: string;
    explorerUrl?: string;
  }>;
};

export default function GiftStatusPage() {
  const params = useParams<{ hash: string }>();
  const hash = typeof params?.hash === "string" ? params.hash : "";
  const statusOpenTrackedRef = useRef(false);

  const [result, setResult] = useState<PublicStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const isPollingStatus = useMemo(
    () => result?.status === "active" || result?.status === "expired",
    [result?.status]
  );
  const isFinalStatus = useMemo(
    () =>
      result?.status === "claimed" ||
      result?.status === "reclaimed" ||
      result?.status === "not_found",
    [result?.status]
  );

  const loadStatus = useCallback(async () => {
    if (!hash) return;

    try {
      const response = await fetch(`/api/status/${hash}`, { method: "GET" });
      const data = (await response.json()) as PublicStatusResponse;
      if (!data) return;
      setResult(data);
      setLastUpdated(new Date().toISOString());

      if (
        !statusOpenTrackedRef.current &&
        data.ok &&
        (data.status === "active" || data.status === "expired" || data.status === "claimed" || data.status === "reclaimed")
      ) {
        statusOpenTrackedRef.current = true;
        trackEvent({
          event: "status_open",
          path: `/status/${hash}`,
          paymentIdHash: data.paymentIdHash,
          status: data.status,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [hash]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!isPollingStatus) return;
    const intervalId = window.setInterval(() => {
      void loadStatus();
    }, 15_000);
    return () => window.clearInterval(intervalId);
  }, [isPollingStatus, loadStatus]);

  const onCopyStatusLink = async () => {
    if (!hash) return;
    await navigator.clipboard.writeText(`${window.location.origin}/status/${hash}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const visibleHash = hash || "unknown";
  const show = result ?? {
    ok: false,
    paymentIdHash: visibleHash,
    status: "not_found" as const,
    whereFunds: "Loading status...",
    tx: {},
    timeline: [],
  };

  return (
    <AppShell className="px-4 py-8 sm:px-5 sm:py-10" glow="top">
      <div className="relative z-[1] mx-auto w-full max-w-3xl space-y-4 sm:space-y-5">
        <GlassCard className="space-y-4 p-4 sm:p-6">
          <div className="flex justify-start">
            <MainMenu />
          </div>
          <p className="app-section-label">
            Public gift status · {ARC_TESTNET.chainName}
          </p>
          <h1 className="app-heading text-2xl sm:text-3xl">
            Where are the funds now?
          </h1>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${statusStyles[show.status]}`}
            >
              {statusLabel(show.status)}
            </span>
            {isFinalStatus && (
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-white/70">
                Final state
              </span>
            )}
            <p className="text-xs text-white/60 break-all">hash: {visibleHash}</p>
          </div>

          <p className="soft-text text-sm">{loading ? "Loading status..." : show.whereFunds}</p>

          {show.ok && (
            <div className="grid gap-2 text-sm text-white/85 sm:grid-cols-2">
              <p>
                <span className="text-white/60">Amount:</span>{" "}
                {show.amountUsdc ? `${show.amountUsdc} USDC` : "n/a"}
              </p>
              <p>
                <span className="text-white/60">Expires:</span>{" "}
                {show.expiresAt
                  ? new Date(show.expiresAt * 1000).toLocaleString()
                  : "n/a"}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onCopyStatusLink}
              className="app-btn-secondary px-3 py-1.5 text-xs"
            >
              {copied ? "Copied" : "Copy status link"}
            </button>
            {lastUpdated && (
              <p className="text-xs text-white/55">
                Last updated: {new Date(lastUpdated).toLocaleTimeString()}
              </p>
            )}
            {isPollingStatus && (
              <p className="text-xs text-white/45">Auto-refresh every 15 seconds.</p>
            )}
            {isFinalStatus && (
              <p className="text-xs text-white/45">
                Auto-refresh stopped for this final state.
              </p>
            )}
          </div>

          {!show.ok && show.error && (
            <p className="text-sm text-rose-300">{show.error}</p>
          )}
        </GlassCard>

        <GlassCard className="space-y-3 p-4 sm:p-6">
          <h2 className="app-heading text-lg">Status timeline</h2>
          {show.timeline.length === 0 ? (
            <p className="text-sm text-white/70">
              Timeline is unavailable for this hash.
            </p>
          ) : (
            <div className="space-y-2">
              {show.timeline.map((step) => (
                <div
                  key={step.id}
                  className="app-panel p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{step.title}</p>
                    <span className="text-[11px] uppercase tracking-[0.1em] text-white/55">
                      {step.state}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/70">{step.description}</p>
                  {step.timestamp && (
                    <p className="mt-1 text-xs text-white/55">
                      {new Date(step.timestamp).toLocaleString()}
                    </p>
                  )}
                  {step.explorerUrl && step.txHash && (
                    <a
                      href={step.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="app-link mt-1 block break-all text-xs"
                    >
                      {step.txHash}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard className="space-y-3 p-4 sm:p-6">
          <h2 className="app-heading text-lg">Explorer links</h2>
          <div className="flex flex-wrap gap-2">
            {show.tx.fundingTxHash && (
              <a
                href={getArcExplorerTxUrl(show.tx.fundingTxHash)}
                target="_blank"
                rel="noreferrer"
                className="app-btn-secondary px-3 py-1.5 text-xs app-link"
              >
                Funding tx
              </a>
            )}
            {show.tx.claimTxHash && (
              <a
                href={getArcExplorerTxUrl(show.tx.claimTxHash)}
                target="_blank"
                rel="noreferrer"
                className="app-btn-secondary px-3 py-1.5 text-xs app-link"
              >
                Claim tx
              </a>
            )}
            {show.tx.reclaimTxHash && (
              <a
                href={getArcExplorerTxUrl(show.tx.reclaimTxHash)}
                target="_blank"
                rel="noreferrer"
                className="app-btn-secondary px-3 py-1.5 text-xs app-link"
              >
                Reclaim tx
              </a>
            )}
            {!show.tx.fundingTxHash &&
              !show.tx.claimTxHash &&
              !show.tx.reclaimTxHash && (
                <p className="text-sm text-white/65">
                  No transaction links available yet.
                </p>
              )}
          </div>
        </GlassCard>

      </div>
    </AppShell>
  );
}

