"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AppShell from "@/components/ui/app-shell";
import GlassCard from "@/components/ui/glass-card";
import MainMenu from "@/components/ui/main-menu";

type AdminTab = "operations" | "analytics";

type ClaimRuntimeConfig = {
  rateLimitEnabled: boolean;
  rateLimitPerMinute: number;
};

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

type LiveActivityItem = {
  kind: string;
  timestamp: string;
  txHash: string;
};

type SourceRow = {
  source: string;
  opens: number;
  funded: number;
  claimed: number;
};

type AnalyticsData = {
  ok: boolean;
  kpi?: { allTime: KpiBlock; last24h: KpiBlock };
  daily?: DailyRow[];
  funnelSteps?: FunnelStep[];
  topSources?: SourceRow[];
  recentActivity?: LiveActivityItem[];
};

type ClaimAuditEvent = {
  requestId: string;
  timestamp: string;
  event: string;
  ip: string;
  idempotencyKey?: string;
  receiverAddress?: string;
  txHash?: string;
  errorCode?: string;
  message?: string;
};

type ClaimsResponse = {
  ok: boolean;
  config?: ClaimRuntimeConfig;
  events?: ClaimAuditEvent[];
  funnel?: {
    last24h: {
      createOpen: number;
      giftFunded: number;
      statusOpen: number;
      claimSuccess: number;
      fundedRate: number;
      statusRate: number;
      claimRate: number;
    };
    last7d: {
      createOpen: number;
      giftFunded: number;
      statusOpen: number;
      claimSuccess: number;
      fundedRate: number;
      statusRate: number;
      claimRate: number;
    };
    bySource24h: Array<{
      source: string;
      createOpen: number;
      giftFunded: number;
      claimSuccess: number;
      claimRate: number;
    }>;
    cohorts7d: Array<{
      day: string;
      source: string;
      campaign: string;
      createOpen: number;
      giftFunded: number;
      claimSuccess: number;
      claimRate: number;
    }>;
    quality24h: {
      walletOpen: number;
      claimError: number;
      reclaimClick: number;
    };
    alerts: string[];
  };
  error?: string;
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<ClaimAuditEvent[]>([]);
  const [config, setConfig] = useState<ClaimRuntimeConfig | null>(null);
  const [funnel, setFunnel] = useState<ClaimsResponse["funnel"] | null>(null);
  const [tab, setTab] = useState<AdminTab>("operations");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const eventCountLabel = useMemo(
    () => `${events.length} recent events`,
    [events.length]
  );

  const loadData = useCallback(async () => {
    const response = await fetch("/api/admin/claims", { method: "GET" });
    const data = (await response.json()) as ClaimsResponse;

    if (!response.ok || !data.ok || !data.config) {
      if (response.status === 401) {
        setAuthenticated(false);
        setConfig(null);
        setEvents([]);
        return;
      }
      throw new Error(data.error ?? "Failed to load admin data.");
    }

    setAuthenticated(true);
    setConfig(data.config);
    setEvents(data.events ?? []);
    setFunnel(data.funnel ?? null);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadData().catch(() => {
        // silently keep login screen
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  const onLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Login failed.");
      }

      setPassword("");
      await loadData();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Login failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch("/api/admin/analytics", { method: "GET" });
      const data = (await res.json()) as AnalyticsData;
      if (res.ok && data.ok) setAnalyticsData(data);
    } catch {
      // silent — analytics is secondary
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const onLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
    setConfig(null);
    setEvents([]);
    setFunnel(null);
    setAnalyticsData(null);
  };

  const onToggleRateLimit = async () => {
    if (!config) return;
    setSavingConfig(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rateLimitEnabled: !config.rateLimitEnabled,
        }),
      });
      const data = (await response.json()) as ClaimsResponse;

      if (!response.ok || !data.ok || !data.config) {
        throw new Error(data.error ?? "Failed to update config.");
      }

      setConfig(data.config);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update config.");
    } finally {
      setSavingConfig(false);
    }
  };

  const onSaveLimit = async (nextLimit: number) => {
    if (!config) return;
    setSavingConfig(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rateLimitPerMinute: nextLimit,
        }),
      });
      const data = (await response.json()) as ClaimsResponse;

      if (!response.ok || !data.ok || !data.config) {
        throw new Error(data.error ?? "Failed to save limit.");
      }

      setConfig(data.config);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save limit.");
    } finally {
      setSavingConfig(false);
    }
  };

  const limitInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <AppShell className="px-5 py-10" glow="top">
      <div className="relative z-[1] mx-auto w-full max-w-3xl space-y-5">
        <GlassCard className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="app-section-label">LinkCash Admin</p>
              <h1 className="app-heading mt-1 text-3xl">Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <MainMenu />
              {authenticated && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="app-btn-secondary px-3 py-2 text-sm"
                >
                  Logout
                </button>
              )}
            </div>
          </div>

          {!authenticated ? (
            <form onSubmit={onLogin} className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
                className="app-input"
              />
              <button
                type="submit"
                disabled={loading}
                className="accent-gradient w-full rounded-[var(--radius-sm)] px-4 py-3 text-sm disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Tab bar */}
              <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
                {(["operations", "analytics"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTab(t);
                      if (t === "analytics" && !analyticsData) void loadAnalytics();
                    }}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      tab === t
                        ? "bg-white/12 text-white"
                        : "text-white/50 hover:text-white/70"
                    }`}
                  >
                    {t === "operations" ? "Operations" : "Analytics"}
                  </button>
                ))}
              </div>

              {tab === "operations" && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="app-panel p-4">
                      <p className="text-xs uppercase tracking-[0.15em] text-white/60">
                        Rate limit
                      </p>
                      <p className="mt-2 text-xl font-semibold">
                        {config?.rateLimitEnabled ? "Enabled" : "Disabled"}
                      </p>
                      <button
                        type="button"
                        onClick={onToggleRateLimit}
                        disabled={savingConfig}
                        className="app-btn-secondary mt-3 px-3 py-2 text-sm disabled:opacity-60"
                      >
                        {config?.rateLimitEnabled ? "Disable" : "Enable"}
                      </button>
                    </div>

                    <div className="app-panel p-4">
                      <p className="text-xs uppercase tracking-[0.15em] text-white/60">
                        Requests per minute
                      </p>
                      <p className="mt-2 text-xl font-semibold">
                        {config?.rateLimitPerMinute ?? "-"}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <input
                          key={config?.rateLimitPerMinute ?? "limit-input"}
                          ref={limitInputRef}
                          type="number"
                          min={1}
                          defaultValue={String(config?.rateLimitPerMinute ?? 12)}
                          className="app-input"
                        />
                        <button
                          type="button"
                          disabled={savingConfig}
                          onClick={() =>
                            onSaveLimit(Number(limitInputRef.current?.value ?? 12))
                          }
                          className="app-btn-secondary px-3 py-2 text-sm disabled:opacity-60"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => loadData().catch(() => undefined)}
                    className="app-btn-secondary px-3 py-2 text-sm"
                  >
                    Refresh data
                  </button>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-rose-400">{error}</p>}
        </GlassCard>

        {/* ─── Analytics tab ─────────────────────────────────────────── */}
        {authenticated && tab === "analytics" && (
          <GlassCard className="space-y-5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Analytics</h2>
              <button
                type="button"
                onClick={() => void loadAnalytics()}
                disabled={analyticsLoading}
                className="app-btn-secondary px-3 py-2 text-sm disabled:opacity-60"
              >
                {analyticsLoading ? "Loading…" : "Refresh"}
              </button>
            </div>

            {analyticsLoading && !analyticsData && (
              <div className="flex justify-center py-8">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
              </div>
            )}

            {analyticsData?.kpi && (
              <>
                {/* KPI cards */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {([
                    { label: "Gifts funded", k24: analyticsData.kpi.last24h.giftsFunded, all: analyticsData.kpi.allTime.giftsFunded, isMoney: false },
                    { label: "Claims", k24: analyticsData.kpi.last24h.claimsCompleted, all: analyticsData.kpi.allTime.claimsCompleted, isMoney: false },
                    { label: "Volume (USDC)", k24: analyticsData.kpi.last24h.volumeUsdc, all: analyticsData.kpi.allTime.volumeUsdc, isMoney: true },
                    { label: "Unique wallets", k24: analyticsData.kpi.last24h.uniqueWallets, all: analyticsData.kpi.allTime.uniqueWallets, isMoney: false },
                  ]).map((card) => (
                    <div key={card.label} className="app-panel p-4">
                      <p className="text-xs uppercase tracking-[0.15em] text-white/60">
                        {card.label}
                      </p>
                      <p className="mt-2 text-2xl font-bold tabular-nums">
                        {card.isMoney ? `$${card.all.toFixed(2)}` : card.all}
                      </p>
                      <p className="mt-1 text-xs text-white/50">
                        24h: {card.isMoney ? `$${card.k24.toFixed(2)}` : card.k24}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Daily chart */}
                {analyticsData.daily && analyticsData.daily.length > 0 && (
                  <div className="app-panel p-4">
                    <p className="text-xs uppercase tracking-[0.15em] text-white/60">
                      Daily activity
                    </p>
                    <div className="mt-3 flex items-end gap-1" style={{ height: 120 }}>
                      {(() => {
                        const maxVal = Math.max(
                          1,
                          ...analyticsData.daily!.map(
                            (d) => d.giftsFunded + d.claimsCompleted
                          )
                        );
                        return analyticsData.daily!.map((d) => {
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
                              <p className="mt-1 text-[9px] leading-none text-white/40">
                                {dayLabel}
                              </p>
                              {/* Tooltip */}
                              <div className="pointer-events-none absolute -top-14 left-1/2 z-10 hidden -translate-x-1/2 rounded-lg border border-white/10 bg-[#1a1d24] px-2.5 py-1.5 text-[10px] leading-relaxed text-white/80 shadow-lg group-hover:block">
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
                    <div className="mt-2 flex gap-4 text-[10px] text-white/50">
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500/70" />
                        Funded
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-sm bg-sky-400/70" />
                        Claimed
                      </span>
                    </div>
                  </div>
                )}

                {/* Funnel */}
                {analyticsData.funnelSteps && analyticsData.funnelSteps.length > 0 && (
                  <div className="app-panel p-4">
                    <p className="text-xs uppercase tracking-[0.15em] text-white/60">
                      Conversion funnel (all time)
                    </p>
                    <div className="mt-3 space-y-2">
                      {(() => {
                        const maxCount = Math.max(
                          1,
                          ...analyticsData.funnelSteps!.map((s) => s.count)
                        );
                        const first = analyticsData.funnelSteps![0]?.count || 1;
                        return analyticsData.funnelSteps!.map((step, i) => {
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
                              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/8">
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
                  </div>
                )}

                {/* Top sources */}
                {analyticsData.topSources && analyticsData.topSources.length > 0 && (
                  <div className="app-panel p-4">
                    <p className="text-xs uppercase tracking-[0.15em] text-white/60">
                      Top sources (all time)
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {analyticsData.topSources.map((src) => {
                        const maxOpens = analyticsData.topSources![0]?.opens || 1;
                        const pct = (src.opens / maxOpens) * 100;
                        return (
                          <div key={src.source}>
                            <div className="flex items-center justify-between text-xs text-white/70">
                              <span className="font-medium text-white/90">{src.source}</span>
                              <span className="tabular-nums">
                                {src.opens} opens · {src.funded} funded · {src.claimed} claimed
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
                  </div>
                )}

                {/* Recent on-chain activity */}
                {analyticsData.recentActivity &&
                  analyticsData.recentActivity.length > 0 && (
                    <div className="app-panel p-4">
                      <p className="text-xs uppercase tracking-[0.15em] text-white/60">
                        Recent on-chain activity
                      </p>
                      <div className="mt-2 max-h-[280px] space-y-1.5 overflow-auto pr-1">
                        {analyticsData.recentActivity.map((item) => (
                          <div
                            key={`${item.txHash}-${item.timestamp}`}
                            className="flex items-center justify-between gap-2 rounded-lg border border-white/8 px-3 py-2 text-xs"
                          >
                            <span
                              className={`font-medium ${
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
                            <span className="truncate text-white/40" style={{ maxWidth: 160 }}>
                              {item.txHash.slice(0, 10)}…{item.txHash.slice(-6)}
                            </span>
                            <span className="shrink-0 text-white/40">
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
                    </div>
                  )}
              </>
            )}
          </GlassCard>
        )}

        {/* ─── Operations: Funnel ──────────────────────────────────────── */}
        {authenticated && tab === "operations" && (
          <GlassCard className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Funnel (24h / 7d)</h2>
              <p className="text-xs text-white/60">create → fund → status → claim</p>
            </div>

            {funnel?.alerts && funnel.alerts.length > 0 && (
              <div className="space-y-2">
                {funnel.alerts.map((alert) => (
                  <p
                    key={alert}
                    className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200"
                  >
                    {alert}
                  </p>
                ))}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="app-panel p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-white/60">Last 24h</p>
                <div className="mt-2 space-y-1 text-sm text-white/85">
                  <p>Open: {funnel?.last24h.createOpen ?? 0}</p>
                  <p>Funded: {funnel?.last24h.giftFunded ?? 0}</p>
                  <p>Status viewed: {funnel?.last24h.statusOpen ?? 0}</p>
                  <p>Claimed: {funnel?.last24h.claimSuccess ?? 0}</p>
                </div>
                <div className="mt-2 text-xs text-white/60">
                  <p>
                    Fund rate: {Math.round((funnel?.last24h.fundedRate ?? 0) * 100)}%
                  </p>
                  <p>
                    Claim rate: {Math.round((funnel?.last24h.claimRate ?? 0) * 100)}%
                  </p>
                </div>
              </div>

              <div className="app-panel p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-white/60">Last 7d</p>
                <div className="mt-2 space-y-1 text-sm text-white/85">
                  <p>Open: {funnel?.last7d.createOpen ?? 0}</p>
                  <p>Funded: {funnel?.last7d.giftFunded ?? 0}</p>
                  <p>Status viewed: {funnel?.last7d.statusOpen ?? 0}</p>
                  <p>Claimed: {funnel?.last7d.claimSuccess ?? 0}</p>
                </div>
                <div className="mt-2 text-xs text-white/60">
                  <p>
                    Fund rate: {Math.round((funnel?.last7d.fundedRate ?? 0) * 100)}%
                  </p>
                  <p>
                    Claim rate: {Math.round((funnel?.last7d.claimRate ?? 0) * 100)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="app-panel p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-white/60">
                Top sources (24h)
              </p>
              {funnel?.bySource24h?.length ? (
                <div className="mt-2 space-y-2 text-xs text-white/80">
                  {funnel.bySource24h.map((sourceItem) => (
                    <div
                      key={sourceItem.source}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-2.5 py-2"
                    >
                      <p className="font-medium text-white/90">{sourceItem.source}</p>
                      <p>
                        open {sourceItem.createOpen} · funded {sourceItem.giftFunded} ·
                        claimed {sourceItem.claimSuccess} · CR{" "}
                        {Math.round(sourceItem.claimRate * 100)}%
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-white/60">No source data in the last 24h.</p>
              )}
            </div>

            <div className="app-panel p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-white/60">
                Quality signals (24h)
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/80">
                <p>wallet_open: {funnel?.quality24h.walletOpen ?? 0}</p>
                <p>claim_error: {funnel?.quality24h.claimError ?? 0}</p>
                <p>reclaim_click: {funnel?.quality24h.reclaimClick ?? 0}</p>
              </div>
            </div>

            <div className="app-panel p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-white/60">
                Cohorts by source + campaign + day (7d)
              </p>
              {funnel?.cohorts7d?.length ? (
                <div className="mt-2 space-y-2 text-xs text-white/80">
                  {funnel.cohorts7d.map((row) => (
                    <div
                      key={`${row.day}-${row.source}-${row.campaign}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-2.5 py-2"
                    >
                      <p className="font-medium text-white/90">
                        {row.day} · {row.source} · {row.campaign}
                      </p>
                      <p>
                        open {row.createOpen} · funded {row.giftFunded} · claimed{" "}
                        {row.claimSuccess} · CR {Math.round(row.claimRate * 100)}%
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-white/60">
                  No cohort data in the last 7 days.
                </p>
              )}
            </div>
          </GlassCard>
        )}

        {authenticated && tab === "operations" && (
          <GlassCard className="space-y-3 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Claim events</h2>
              <p className="text-xs text-white/60">{eventCountLabel}</p>
            </div>
            <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
              {events.length === 0 ? (
                <p className="text-sm text-white/60">No events yet.</p>
              ) : (
                events.map((item) => (
                  <div
                    key={`${item.requestId}-${item.timestamp}`}
                    className="app-panel p-3 text-xs"
                  >
                    <p className="font-medium text-white/90">{item.event}</p>
                    <p className="mt-1 text-white/60">
                      {new Date(item.timestamp).toLocaleString("en-US")}
                    </p>
                    <p className="mt-1 text-white/60">ip: {item.ip}</p>
                    {item.receiverAddress && (
                      <p className="mt-1 break-all text-white/60">
                        receiver: {item.receiverAddress}
                      </p>
                    )}
                    {item.txHash && (
                      <p className="mt-1 break-all text-emerald-300/90">
                        tx: {item.txHash}
                      </p>
                    )}
                    {item.message && (
                      <p className="mt-1 text-rose-300/90">{item.message}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
