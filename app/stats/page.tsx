"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/ui/app-shell";
import GlassCard from "@/components/ui/glass-card";
import MainMenu from "@/components/ui/main-menu";

type KpiBlock = {
  giftsFunded: number;
  claimsCompleted: number;
  volumeUsdc: number;
  uniqueWallets: number;
};

type DailyRow = {
  date: string;
  giftsFunded: number;
  claimsCompleted: number;
  volumeUsdc: number;
};

type FunnelStep = { label: string; count: number };

type SourceRow = {
  source: string;
  opens: number;
  funded: number;
  claimed: number;
};

type ActivityItem = {
  kind: string;
  timestamp: string;
  txHash: string;
};

type StatsData = {
  ok: boolean;
  kpi?: { allTime: KpiBlock; last24h: KpiBlock };
  daily?: DailyRow[];
  funnelSteps?: FunnelStep[];
  topSources?: SourceRow[];
  recentActivity?: ActivityItem[];
};

export default function StatsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stats");
      const json = (await res.json()) as StatsData;
      if (json.ok) setData(json);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // Data fetch on mount — setState in the async callback is fine here.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  return (
    <AppShell className="px-4 py-8 sm:px-5 sm:py-10" glow="top">
      <div className="relative z-[1] mx-auto w-full max-w-3xl space-y-5">
        <GlassCard className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="app-section-label">LinkCash</p>
              <h1 className="app-heading mt-1 text-2xl sm:text-3xl">
                Live Stats
              </h1>
              <p className="mt-1 text-xs text-white/50">
                Real-time analytics from the Arc Testnet
              </p>
            </div>
            <MainMenu />
          </div>
        </GlassCard>

        {loading && !data && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
          </div>
        )}

        {data?.kpi && (
          <>
            {/* KPI cards */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {([
                { label: "Gifts funded", k24: data.kpi.last24h.giftsFunded, all: data.kpi.allTime.giftsFunded, isMoney: false },
                { label: "Claims", k24: data.kpi.last24h.claimsCompleted, all: data.kpi.allTime.claimsCompleted, isMoney: false },
                { label: "Volume (USDC)", k24: data.kpi.last24h.volumeUsdc, all: data.kpi.allTime.volumeUsdc, isMoney: true },
                { label: "Unique wallets", k24: data.kpi.last24h.uniqueWallets, all: data.kpi.allTime.uniqueWallets, isMoney: false },
              ]).map((card) => (
                <GlassCard key={card.label} className="p-4">
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.15em] text-white/50">
                    {card.label}
                  </p>
                  <p className="mt-2 text-xl sm:text-2xl font-bold tabular-nums">
                    {card.isMoney ? `$${card.all.toFixed(2)}` : card.all}
                  </p>
                  <p className="mt-1 text-[10px] sm:text-xs text-white/40">
                    24h: {card.isMoney ? `$${card.k24.toFixed(2)}` : card.k24}
                  </p>
                </GlassCard>
              ))}
            </div>

            {/* Daily chart */}
            {data.daily && data.daily.length > 0 && (
              <GlassCard className="p-5 sm:p-6">
                <p className="text-xs uppercase tracking-[0.15em] text-white/50">
                  Daily activity
                </p>
                <div
                  className="mt-4 flex items-end gap-[2px] sm:gap-1"
                  style={{ height: 140 }}
                >
                  {(() => {
                    const maxVal = Math.max(
                      1,
                      ...data.daily!.map(
                        (d) => d.giftsFunded + d.claimsCompleted
                      )
                    );
                    return data.daily!.map((d) => {
                      const fundedH =
                        maxVal > 0 ? (d.giftsFunded / maxVal) * 100 : 0;
                      const claimedH =
                        maxVal > 0 ? (d.claimsCompleted / maxVal) * 100 : 0;
                      const dayLabel = d.date.slice(5);
                      return (
                        <div
                          key={d.date}
                          className="group relative flex flex-1 flex-col items-center"
                          style={{ height: "100%" }}
                        >
                          <div className="flex w-full flex-1 flex-col items-center justify-end gap-px">
                            <div
                              className="w-full rounded-t bg-emerald-500/70 transition-all"
                              style={{
                                height: `${fundedH}%`,
                                minHeight: d.giftsFunded > 0 ? 2 : 0,
                              }}
                            />
                            <div
                              className="w-full rounded-b bg-sky-400/70 transition-all"
                              style={{
                                height: `${claimedH}%`,
                                minHeight: d.claimsCompleted > 0 ? 2 : 0,
                              }}
                            />
                          </div>
                          <p className="mt-1 hidden text-[8px] leading-none text-white/30 sm:block">
                            {dayLabel}
                          </p>
                          <div className="pointer-events-none absolute -top-16 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#1a1d24] px-2.5 py-1.5 text-[10px] leading-relaxed text-white/80 shadow-lg group-hover:block">
                            <p className="font-medium">{d.date}</p>
                            <p>Funded: {d.giftsFunded}</p>
                            <p>Claimed: {d.claimsCompleted}</p>
                            <p>${d.volumeUsdc.toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="mt-3 flex gap-4 text-[10px] text-white/40">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500/70" />
                    Funded
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-sm bg-sky-400/70" />
                    Claimed
                  </span>
                </div>
              </GlassCard>
            )}

            {/* Funnel */}
            {data.funnelSteps && data.funnelSteps.length > 0 && (
              <GlassCard className="p-5 sm:p-6">
                <p className="text-xs uppercase tracking-[0.15em] text-white/50">
                  Conversion funnel
                </p>
                <div className="mt-4 space-y-3">
                  {(() => {
                    const maxCount = Math.max(
                      1,
                      ...data.funnelSteps!.map((s) => s.count)
                    );
                    const first = data.funnelSteps![0]?.count || 1;
                    return data.funnelSteps!.map((step, i) => {
                      const pct =
                        maxCount > 0 ? (step.count / maxCount) * 100 : 0;
                      const convPct =
                        i > 0 && first > 0
                          ? Math.round((step.count / first) * 100)
                          : 100;
                      return (
                        <div key={step.label}>
                          <div className="flex items-center justify-between text-xs text-white/70">
                            <span>{step.label}</span>
                            <span className="tabular-nums">
                              {step.count}
                              {i > 0 && (
                                <span className="ml-1 text-white/40">
                                  ({convPct}%)
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-white/8">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500/80 to-sky-400/80 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </GlassCard>
            )}

            {/* Top sources */}
            {data.topSources && data.topSources.length > 0 && (
              <GlassCard className="p-5 sm:p-6">
                <p className="text-xs uppercase tracking-[0.15em] text-white/50">
                  Top sources
                </p>
                <div className="mt-3 space-y-2">
                  {data.topSources.map((src) => {
                    const maxOpens = data.topSources![0]?.opens || 1;
                    const pct = (src.opens / maxOpens) * 100;
                    return (
                      <div key={src.source}>
                        <div className="flex items-center justify-between gap-2 text-xs text-white/70">
                          <span className="font-medium text-white/90 truncate">
                            {src.source}
                          </span>
                          <span className="shrink-0 tabular-nums text-[10px] sm:text-xs">
                            {src.opens} opens · {src.funded} funded ·{" "}
                            {src.claimed} claimed
                          </span>
                        </div>
                        <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                          <div
                            className="h-full rounded-full bg-emerald-500/60"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            )}

            {/* Recent on-chain activity */}
            {data.recentActivity && data.recentActivity.length > 0 && (
              <GlassCard className="p-5 sm:p-6">
                <p className="text-xs uppercase tracking-[0.15em] text-white/50">
                  Recent on-chain activity
                </p>
                <div className="mt-3 max-h-[320px] space-y-1.5 overflow-auto pr-1">
                  {data.recentActivity.map((item, idx) => (
                    <div
                      key={`${item.txHash}-${idx}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/8 px-3 py-2 text-xs"
                    >
                      <span
                        className={`shrink-0 font-medium ${
                          item.kind === "claim_success"
                            ? "text-sky-300"
                            : item.kind === "gift_funded"
                              ? "text-emerald-300"
                              : "text-amber-300"
                        }`}
                      >
                        {item.kind === "gift_funded"
                          ? "Funded"
                          : item.kind === "claim_success"
                            ? "Claimed"
                            : "Reclaimed"}
                      </span>
                      <span className="truncate text-white/35 font-mono text-[10px]">
                        {item.txHash}
                      </span>
                      <span className="shrink-0 text-white/35 text-[10px]">
                        {new Date(item.timestamp).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </>
        )}

        {!loading && !data && (
          <GlassCard className="p-8 text-center">
            <p className="text-sm text-white/50">
              Unable to load stats. Try refreshing.
            </p>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
