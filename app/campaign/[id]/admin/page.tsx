"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import AppShell from "@/components/ui/app-shell";
import GlassCard from "@/components/ui/glass-card";
import MainMenu from "@/components/ui/main-menu";
import { toast } from "@/lib/client/toast";

type ClaimRecord = {
  email: string;
  walletAddress: string;
  txHash: string;
  claimedAt: string;
};

type AdminData = {
  ok: boolean;
  campaign: { title: string; amountPerGift: string; totalGifts: number; createdBy: string };
  claims: ClaimRecord[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function CampaignAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<AdminData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/campaign/${id}/claims`)
      .then(async (res) => {
        const d = await res.json() as AdminData & { error?: string };
        if (!res.ok || !d.ok) { setNotFound(true); return; }
        setData(d);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const campaignUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/campaign/${id}`;

  const handleCopyEmails = async () => {
    if (!data) return;
    const emails = data.claims.map((c) => c.email).join("\n");
    try {
      await navigator.clipboard.writeText(emails);
      toast("Emails copied!", "success");
    } catch { toast("Copy manually.", "info"); }
  };

  const handleExportCsv = () => {
    if (!data) return;
    const rows = [
      "Email,Wallet,TxHash,ClaimedAt",
      ...data.claims.map((c) =>
        `${c.email},${c.walletAddress},${c.txHash},${c.claimedAt}`
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-${id}-claims.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (notFound) {
    return (
      <AppShell className="flex items-center justify-center px-4 py-8">
        <GlassCard className="w-full max-w-[420px] space-y-4 p-8 text-center">
          <p className="text-4xl">🔗</p>
          <h1 className="app-heading text-xl">Campaign not found</h1>
          <Link href="/" className="app-btn-secondary inline-flex w-full items-center justify-center px-5 py-2.5 text-sm">Go home</Link>
        </GlassCard>
      </AppShell>
    );
  }

  return (
    <AppShell className="flex items-center justify-center px-4 py-8 sm:px-5 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative z-[1] w-full max-w-[480px] space-y-3">
        <div className="flex items-center justify-between">
          <MainMenu />
          <Link href={`/campaign/${id}`} className="text-xs text-white/40 transition hover:text-white/70">
            Public page →
          </Link>
        </div>

        <GlassCard className="space-y-5 p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
            </div>
          ) : data ? (
            <>
              {/* Header */}
              <div>
                <h1 className="app-heading text-xl">{data.campaign.title}</h1>
                <p className="soft-text text-sm mt-0.5">
                  {data.campaign.amountPerGift} USDC · {data.campaign.totalGifts} total gifts
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Claimed", value: data.claims.length, color: "text-emerald-400" },
                  { label: "Remaining", value: data.campaign.totalGifts - data.claims.length, color: "text-white/75" },
                  { label: "Total USDC", value: `${(data.claims.length * parseFloat(data.campaign.amountPerGift)).toFixed(2)}`, color: "text-emerald-400" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-white/8 bg-white/4 px-3 py-3 text-center">
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-white/35 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Campaign link */}
              <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 flex items-center justify-between gap-3">
                <p className="text-xs text-white/45 truncate">{campaignUrl}</p>
                <button type="button" onClick={() => { navigator.clipboard.writeText(campaignUrl).then(() => toast("Copied!", "success")).catch(() => {}); }}
                  className="shrink-0 text-xs text-white/40 transition hover:text-white/70">Copy</button>
              </div>

              {/* Claims list */}
              {data.claims.length === 0 ? (
                <div className="rounded-xl border border-white/8 bg-white/4 py-8 text-center">
                  <p className="text-sm text-white/35">No claims yet.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/35">
                      Claims ({data.claims.length})
                    </p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => void handleCopyEmails()}
                        className="text-xs text-white/40 transition hover:text-white/70">Copy emails</button>
                      <button type="button" onClick={handleExportCsv}
                        className="text-xs text-white/40 transition hover:text-white/70">Export CSV</button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                    {data.claims.map((c, i) => (
                      <motion.div key={c.txHash} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/4 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-white/80">{c.email}</p>
                          <p className="text-xs text-white/35">{formatDate(c.claimedAt)}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-medium text-emerald-400">{data.campaign.amountPerGift} USDC</p>
                          <p className="text-xs text-emerald-400/50">✓</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : null}
        </GlassCard>
      </motion.div>
    </AppShell>
  );
}
