"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import AppShell from "@/components/ui/app-shell";
import GlassCard from "@/components/ui/glass-card";
import MainMenu from "@/components/ui/main-menu";
import LoginPanel from "@/components/ui/login-panel";
import { useCircleWallet } from "@/features/circle-wallet/model/circle-wallet-provider";

type CampaignInfo = {
  campaignId: string;
  title: string;
  amountPerGift: string;
  totalGifts: number;
  senderDisplayName: string;
  giftMessage?: string;
  createdAt: string;
};

type ApiData = {
  ok: boolean;
  campaign: CampaignInfo;
  remaining: number;
  claimed: number;
};

type ClaimStep = "idle" | "claiming" | "success" | "error" | "already_claimed" | "exhausted";

export default function CampaignClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { ready, authenticated, login, loginWithEmail, walletAddress, authError, googleEmail } =
    useCircleWallet();

  const [info, setInfo] = useState<ApiData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState<ClaimStep>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const claimRef = useRef(false);

  // Load campaign info
  useEffect(() => {
    fetch(`/api/campaign/${id}`)
      .then(async (res) => {
        const data = await res.json() as ApiData & { error?: string };
        if (!res.ok || !data.ok) { setNotFound(true); return; }
        setInfo(data);
        if (data.remaining === 0) setStep("exhausted");
      })
      .catch(() => setNotFound(true));
  }, [id]);

  // Auto-claim when authenticated
  useEffect(() => {
    if (!authenticated || !walletAddress || !googleEmail || step !== "idle" || claimRef.current) return;
    if (!info || info.remaining === 0) return;
    void triggerClaim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, walletAddress, googleEmail, info, step]);

  const triggerClaim = async () => {
    if (claimRef.current || !walletAddress || !googleEmail) return;
    claimRef.current = true;
    setStep("claiming");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/claim-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: id, walletAddress, email: googleEmail }),
      });
      const data = await res.json() as { ok?: boolean; txHash?: string; error?: string };

      if (res.status === 409) { setStep("already_claimed"); return; }
      if (res.status === 410) { setStep("exhausted"); return; }
      if (!res.ok || !data.txHash) throw new Error(data.error ?? "Claim failed.");

      setTxHash(data.txHash);
      setStep("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Claim failed. Please try again.");
      setStep("error");
      claimRef.current = false;
    }
  };

  if (notFound) {
    return (
      <AppShell className="flex items-center justify-center px-4 py-8">
        <GlassCard className="w-full max-w-[420px] space-y-4 p-8 text-center">
          <p className="text-4xl">🔗</p>
          <h1 className="app-heading text-xl">Campaign not found</h1>
          <p className="soft-text text-sm">This link is invalid or has expired.</p>
          <Link href="/" className="app-btn-secondary inline-flex w-full items-center justify-center px-5 py-2.5 text-sm">Go home</Link>
        </GlassCard>
      </AppShell>
    );
  }

  const progressPct = info ? Math.round((info.claimed / info.campaign.totalGifts) * 100) : 0;

  return (
    <AppShell className="flex items-center justify-center px-4 py-8 sm:px-5 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative z-[1] w-full max-w-[420px] space-y-3">
        <div className="flex justify-start"><MainMenu /></div>
        <GlassCard className="space-y-5 p-6">
          {!info ? (
            <div className="flex justify-center py-8">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
            </div>
          ) : (
            <>
              {/* Campaign header */}
              <div className="text-center space-y-2">
                <p className="text-3xl">🎁</p>
                <h1 className="app-heading text-xl">{info.campaign.title}</h1>
                <p className="text-sm text-white/55">from {info.campaign.senderDisplayName}</p>
                {info.campaign.giftMessage && (
                  <p className="text-sm italic text-white/50">&quot;{info.campaign.giftMessage}&quot;</p>
                )}
                <div className="inline-flex flex-col items-center">
                  <span className="text-4xl font-bold text-white/90">{info.campaign.amountPerGift}</span>
                  <span className="text-sm text-white/45">USDC per person</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-white/35">
                  <span>{info.claimed} claimed</span>
                  <span>{info.remaining} remaining</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    className="h-full rounded-full bg-emerald-500"
                  />
                </div>
              </div>

              {/* Auth / claim section */}
              {step === "exhausted" ? (
                <div className="rounded-xl border border-white/10 bg-white/5 py-6 text-center">
                  <p className="text-2xl mb-2">😔</p>
                  <p className="text-sm text-white/60">All gifts have been claimed.</p>
                </div>
              ) : step === "already_claimed" ? (
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 py-6 text-center">
                  <p className="text-2xl mb-2">✓</p>
                  <p className="text-sm text-emerald-400">You already claimed a gift from this campaign.</p>
                </div>
              ) : step === "success" ? (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-500/50 bg-emerald-950/80 text-2xl">✓</div>
                  <div>
                    <p className="font-semibold text-white/90">{info.campaign.amountPerGift} USDC claimed!</p>
                    <p className="text-sm text-white/50 mt-0.5">The USDC is now in your wallet.</p>
                  </div>
                  <Link href="/wallet" className="app-btn-secondary inline-flex w-full items-center justify-center px-5 py-2.5 text-sm">
                    Open my wallet →
                  </Link>
                </motion.div>
              ) : step === "claiming" ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400" />
                  <p className="text-sm text-white/60">Claiming your {info.campaign.amountPerGift} USDC…</p>
                </div>
              ) : step === "error" ? (
                <div className="space-y-3">
                  <p className="text-sm text-rose-400 text-center">{errorMsg}</p>
                  <button type="button" onClick={() => { claimRef.current = false; setStep("idle"); }}
                    className="app-btn-secondary w-full px-5 py-2.5 text-sm">
                    Try again
                  </button>
                </div>
              ) : !ready ? (
                <div className="flex justify-center py-4">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
                </div>
              ) : !authenticated ? (
                <div className="space-y-3">
                  <p className="text-center text-sm text-white/55">
                    Sign in to claim your {info.campaign.amountPerGift} USDC — no wallet needed.
                  </p>
                  <LoginPanel
                    onGoogleLogin={() => void login()}
                    onEmailLogin={loginWithEmail}
                    googleLabel={`Claim ${info.campaign.amountPerGift} USDC with Google →`}
                    buttonSize="large"
                    authError={authError}
                  />
                </div>
              ) : (
                <div className="flex justify-center py-4">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400" />
                </div>
              )}
            </>
          )}
        </GlassCard>
      </motion.div>
    </AppShell>
  );
}
