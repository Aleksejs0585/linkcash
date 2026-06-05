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

type ClaimRuntimeConfig = {
  rateLimitEnabled: boolean;
  rateLimitPerMinute: number;
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

  const onLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
    setConfig(null);
    setEvents([]);
    setFunnel(null);
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
              <h1 className="app-heading mt-1 text-3xl">
                Claim Control Panel
              </h1>
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

          {error && <p className="text-sm text-rose-400">{error}</p>}
        </GlassCard>

        {authenticated && (
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

        {authenticated && (
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
