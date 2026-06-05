"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/ui/app-shell";
import GlassCard from "@/components/ui/glass-card";
import MainMenu from "@/components/ui/main-menu";
import { HelpTrigger } from "@/components/ui/help-manual";
import { ARC_TESTNET, getArcExplorerTxUrl } from "@/utils";
import { trackEvent } from "@/lib/client/analytics";

const STATUS_STYLE = {
  active: "status-pill-active",
  claimed: "status-pill-claimed",
  expired: "status-pill-expired",
  reclaimed: "status-pill-reclaimed",
  not_found: "status-pill-not_found",
} as const;

const STATUS_LABEL: Record<keyof typeof STATUS_STYLE, string> = {
  active: "Active",
  claimed: "Claimed",
  expired: "Expired",
  reclaimed: "Reclaimed",
  not_found: "Not found",
};

const STEP_STATE_ICON: Record<string, string> = {
  completed: "✓",
  pending: "○",
  unavailable: "–",
};

function shortHash(hash: string): string {
  if (hash.length <= 18) return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

type PublicStatusResponse = {
  ok: boolean;
  paymentIdHash: string;
  status: keyof typeof STATUS_STYLE;
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

  const loadStatus = useCallback(async (signal?: AbortSignal) => {
    if (!hash) return;
    try {
      const response = await fetch(`/api/status/${hash}`, { method: "GET", signal });
      if (signal?.aborted) return;
      const data = (await response.json()) as PublicStatusResponse;
      if (signal?.aborted || !data) return;
      setResult(data);
      setLastUpdated(new Date().toISOString());

      if (
        !statusOpenTrackedRef.current &&
        data.ok &&
        (data.status === "active" ||
          data.status === "expired" ||
          data.status === "claimed" ||
          data.status === "reclaimed")
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
    const controller = new AbortController();
    void loadStatus(controller.signal);
    return () => controller.abort();
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
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/status/${hash}`
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable — user can copy manually */
    }
  };

  const visibleHash = hash || "unknown";

  return (
    <AppShell className="px-4 py-8 sm:px-5 sm:py-10" glow="top">
      <div className="relative z-[1] mx-auto w-full max-w-xl space-y-4 sm:space-y-5">

        {/* Header */}
        <GlassCard className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <MainMenu />
            <HelpTrigger />
          </div>

          <p className="app-section-label mt-4">
            {ARC_TESTNET.chainName} · Public gift status
          </p>
          <h1 className="app-heading mt-1 text-2xl sm:text-3xl">
            Where are the funds?
          </h1>

          {loading ? (
            <div className="mt-4 animate-pulse space-y-3" aria-hidden>
              <div className="h-7 w-28 rounded-full bg-white/10" />
              <div className="h-4 w-3/4 rounded bg-white/8" />
              <div className="h-4 w-1/2 rounded bg-white/6" />
            </div>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.1em] ${STATUS_STYLE[result?.status ?? "not_found"]}`}
                >
                  {STATUS_LABEL[result?.status ?? "not_found"]}
                </span>
                {isFinalStatus && (
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-white/60">
                    Final
                  </span>
                )}
                {isPollingStatus && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-950/30 px-3 py-1 text-[11px] text-emerald-400/80">
                    Watching · refreshes in 15s
                  </span>
                )}
              </div>

              <p className="mt-3 text-sm text-white/80">
                {result?.whereFunds ?? "Status unavailable."}
              </p>

              {result?.ok && (
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-white/55">
                  {result.amountUsdc && (
                    <span>
                      Amount:{" "}
                      <span className="text-white/80">{result.amountUsdc} USDC</span>
                    </span>
                  )}
                  {result.expiresAt && (
                    <span>
                      Expires:{" "}
                      <span className="text-white/80">
                        {new Date(result.expiresAt * 1000).toLocaleString("en-US")}
                      </span>
                    </span>
                  )}
                </div>
              )}

              {!result?.ok && result?.error && (
                <p className="mt-2 text-sm text-rose-300">{result.error}</p>
              )}
            </>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onCopyStatusLink}
              className="app-btn-secondary px-3 py-1.5 text-xs"
            >
              {copied ? "Copied ✓" : "Copy status link"}
            </button>
            {lastUpdated && (
              <p className="text-xs text-white/40">
                Updated {new Date(lastUpdated).toLocaleTimeString()}
              </p>
            )}
          </div>

          <p className="mt-3 break-all text-[11px] text-white/25">
            hash: {shortHash(visibleHash)}
          </p>
        </GlassCard>

        {/* Timeline */}
        <GlassCard className="p-4 sm:p-6">
          <h2 className="text-base font-semibold">Timeline</h2>

          {loading ? (
            <div className="mt-4 animate-pulse space-y-4" aria-hidden>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-1/2 rounded bg-white/8" />
                    <div className="h-3 w-3/4 rounded bg-white/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : result?.timeline.length === 0 ? (
            <p className="mt-2 text-sm text-white/60">
              No timeline data available.
            </p>
          ) : (
            <ol className="mt-4 space-y-0">
              {(result?.timeline ?? []).map((step, idx) => {
                const isLast = idx === (result?.timeline.length ?? 0) - 1;
                const isDone = step.state === "completed";
                return (
                  <li key={step.id} className="relative flex gap-3">
                    {/* connector line */}
                    {!isLast && (
                      <div
                        aria-hidden
                        className="absolute left-[9px] top-[22px] w-px bg-white/10"
                        style={{ bottom: 0 }}
                      />
                    )}

                    {/* icon */}
                    <div
                      className={`relative z-[1] mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
                        isDone
                          ? "border-emerald-500/50 bg-emerald-950/60 text-emerald-400"
                          : step.state === "pending"
                            ? "border-white/20 bg-white/5 text-white/40"
                            : "border-white/10 bg-white/3 text-white/20"
                      }`}
                    >
                      {STEP_STATE_ICON[step.state]}
                    </div>

                    {/* content */}
                    <div className={`pb-5 ${isLast ? "pb-0" : ""}`}>
                      <p
                        className={`text-sm font-medium leading-5 ${isDone ? "text-white/90" : "text-white/45"}`}
                      >
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-xs text-white/50">
                        {step.description}
                      </p>
                      {step.timestamp && (
                        <p className="mt-1 text-[11px] text-white/35">
                          {new Date(step.timestamp).toLocaleString("en-US")}
                        </p>
                      )}
                      {step.explorerUrl && step.txHash && (
                        <a
                          href={step.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="app-link mt-1 inline-block text-[11px]"
                        >
                          {shortHash(step.txHash)} ↗
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </GlassCard>

        {/* Explorer links */}
        {!loading &&
          (result?.tx.fundingTxHash ||
            result?.tx.claimTxHash ||
            result?.tx.reclaimTxHash) && (
            <GlassCard className="p-4 sm:p-6">
              <h2 className="text-base font-semibold">On-chain transactions</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {result?.tx.fundingTxHash && (
                  <a
                    href={getArcExplorerTxUrl(result.tx.fundingTxHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="app-btn-secondary px-3 py-1.5 text-xs"
                  >
                    Funding tx ↗
                  </a>
                )}
                {result?.tx.claimTxHash && (
                  <a
                    href={getArcExplorerTxUrl(result.tx.claimTxHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="app-btn-secondary px-3 py-1.5 text-xs"
                  >
                    Claim tx ↗
                  </a>
                )}
                {result?.tx.reclaimTxHash && (
                  <a
                    href={getArcExplorerTxUrl(result.tx.reclaimTxHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="app-btn-secondary px-3 py-1.5 text-xs"
                  >
                    Reclaim tx ↗
                  </a>
                )}
              </div>
            </GlassCard>
          )}
      </div>
    </AppShell>
  );
}
