"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import GlassCard from "../../components/ui/glass-card";
import BackButton from "../../components/ui/back-button";

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
    <main className="relative min-h-screen px-5 py-10 text-white">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <GlassCard className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                LinkCash Admin
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                Claim Control Panel
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <BackButton fallbackHref="/" />
              {authenticated && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:bg-white/5"
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
                className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm outline-none ring-blue-500/40 placeholder:text-white/45 focus:ring-2"
              />
              <button
                type="submit"
                disabled={loading}
                className="accent-gradient w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/25 p-4">
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
                    className="mt-3 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/85 transition hover:bg-white/5 disabled:opacity-60"
                  >
                    {config?.rateLimitEnabled ? "Disable" : "Enable"}
                  </button>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/25 p-4">
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
                      className="w-full rounded-lg border border-white/15 bg-black/35 px-3 py-2 text-sm outline-none"
                    />
                    <button
                      type="button"
                      disabled={savingConfig}
                      onClick={() =>
                        onSaveLimit(Number(limitInputRef.current?.value ?? 12))
                      }
                      className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/85 transition hover:bg-white/5 disabled:opacity-60"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => loadData().catch(() => undefined)}
                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/85 transition hover:bg-white/5"
              >
                Refresh data
              </button>
            </div>
          )}

          {error && <p className="text-sm text-rose-400">{error}</p>}
        </GlassCard>

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
                    className="rounded-xl border border-white/10 bg-black/25 p-3 text-xs"
                  >
                    <p className="font-medium text-white/90">{item.event}</p>
                    <p className="mt-1 text-white/60">
                      {new Date(item.timestamp).toLocaleString()}
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
    </main>
  );
}
