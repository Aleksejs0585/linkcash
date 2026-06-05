"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/ui/app-shell";
import GlassCard from "@/components/ui/glass-card";
import MainMenu from "@/components/ui/main-menu";
import LoginPanel from "@/components/ui/login-panel";
import { useCircleWallet } from "@/features/circle-wallet/model/circle-wallet-provider";

type CampaignItem = {
  campaignId: string;
  title: string;
  amountPerGift: string;
  totalGifts: number;
  createdAt: string;
  remaining: number;
  claimed: number;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function CampaignCard({ c }: { c: CampaignItem }) {
  const pct = c.totalGifts > 0 ? Math.round((c.claimed / c.totalGifts) * 100) : 0;
  const exhausted = c.remaining === 0;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-white/90 truncate">{c.title}</p>
          <p className="text-xs text-white/40 mt-0.5">{formatDate(c.createdAt)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-emerald-400">{c.amountPerGift} USDC</p>
          <p className="text-xs text-white/40">per gift</p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-white/40">
          <span>{c.claimed}/{c.totalGifts} claimed</span>
          <span className={exhausted ? "text-white/30" : "text-emerald-400/70"}>
            {exhausted ? "Fully claimed" : `${c.remaining} remaining`}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500/60" : "bg-emerald-500"}`} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link href={`/campaign/${c.campaignId}/admin`}
          className="flex-1 rounded-lg border border-white/12 bg-white/5 px-3 py-1.5 text-center text-xs text-white/60 transition hover:border-white/25 hover:text-white/85">
          View claims →
        </Link>
        <button type="button"
          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/campaign/${c.campaignId}`).then(() => {}).catch(() => {})}
          className="flex-1 rounded-lg border border-white/12 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:border-white/25 hover:text-white/85">
          Copy link
        </button>
      </div>
    </motion.div>
  );
}

export default function CampaignsPage() {
  const { ready, authenticated, walletAddress, login, loginWithEmail, authError } = useCircleWallet();
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!walletAddress || fetched) return;
    setLoading(true);
    fetch(`/api/my-campaigns?walletAddress=${encodeURIComponent(walletAddress)}`)
      .then(async (res) => {
        const data = await res.json() as { ok?: boolean; campaigns?: CampaignItem[] };
        if (data.ok && Array.isArray(data.campaigns)) setCampaigns(data.campaigns);
      })
      .catch(() => undefined)
      .finally(() => { setLoading(false); setFetched(true); });
  }, [walletAddress, fetched]);

  return (
    <AppShell className="flex items-center justify-center px-4 py-8 sm:px-5 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-[1] w-full max-w-[420px] space-y-3">
        <div className="flex items-center justify-between">
          <MainMenu />
          <Link href="/campaign/new" className="app-btn-secondary px-3 py-1.5 text-xs">
            + New campaign
          </Link>
        </div>

        <GlassCard className="space-y-5 p-6">
          <div>
            <h1 className="app-heading text-xl">My Campaigns</h1>
            <p className="soft-text text-sm mt-0.5">One link per campaign — track who claimed</p>
          </div>

          {!ready ? (
            <div className="flex justify-center py-8">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
            </div>
          ) : !authenticated ? (
            <div className="space-y-3">
              <p className="text-center text-sm text-white/55">Sign in to see your campaigns.</p>
              <LoginPanel onGoogleLogin={() => void login()} onEmailLogin={loginWithEmail}
                googleLabel="Sign in with Google" buttonSize="large" authError={authError} />
            </div>
          ) : loading ? (
            <div className="flex justify-center py-8">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
            </div>
          ) : (
            <AnimatePresence>
              {campaigns.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 py-4 text-center">
                  <p className="text-4xl">🚀</p>
                  <p className="text-sm text-white/50">No campaigns yet.</p>
                  <Link href="/campaign/new"
                    className="accent-gradient inline-flex items-center justify-center rounded-[var(--radius)] px-5 py-2.5 text-sm font-medium">
                    Create your first campaign →
                  </Link>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((c) => <CampaignCard key={c.campaignId} c={c} />)}
                </div>
              )}
            </AnimatePresence>
          )}
        </GlassCard>
      </motion.div>
    </AppShell>
  );
}
