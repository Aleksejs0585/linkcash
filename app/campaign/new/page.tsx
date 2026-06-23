"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import AppShell from "@/components/ui/app-shell";
import GlassCard from "@/components/ui/glass-card";
import MainMenu from "@/components/ui/main-menu";
import LoginPanel from "@/components/ui/login-panel";
import { useCircleWallet } from "@/features/circle-wallet/model/circle-wallet-provider";
import { waitForClientFundedGift } from "@/features/create-gift/lib/read-gift-on-chain";
import { formatGiftTxError } from "@/features/create-gift/lib/gift-errors";
import { generateSecret, generateHash } from "@/utils";
import { toast } from "@/lib/client/toast";

type Step = "idle" | "funding" | "confirming" | "saving" | "success" | "error";

export default function NewCampaignPage() {
  const {
    ready, authenticated, login, loginWithEmail, walletAddress,
    primaryWalletId, userToken, executeChallenge, walletSyncing,
    authError, bootstrapError, googleDisplayName, googleEmail,
  } = useCircleWallet();

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("5");
  const [count, setCount] = useState(10);
  const [message, setMessage] = useState("");

  const [step, setStep] = useState<Step>("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const senderName = googleDisplayName?.trim() || googleEmail?.trim() || "Someone";
  const total = (() => {
    const n = parseFloat(amount);
    return Number.isFinite(n) && n > 0 ? (n * count).toFixed(2) : "—";
  })();

  const campaignUrl = campaignId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/campaign/${campaignId}`
    : null;

  const handleCreate = async () => {
    if (inFlightRef.current || !walletAddress || !primaryWalletId || !userToken) return;
    const amtNum = parseFloat(amount);
    if (!Number.isFinite(amtNum) || amtNum < 0.01 || amtNum > 10_000) {
      toast("Enter a valid amount between 0.01 and 10,000 USDC.", "error");
      return;
    }
    if (count < 1 || count > 50) {
      toast("Number of gifts must be between 1 and 50.", "error");
      return;
    }

    inFlightRef.current = true;
    setStep("funding");
    setErrorMsg(null);
    setStatusMsg("Generating gift secrets…");

    const secrets = Array.from({ length: count }, () => generateSecret());
    const hashes = secrets.map((s) => generateHash(s));
    const gifts = hashes.map((h, i) => ({ paymentIdHash: h, amountUsdc: amount, secret: secrets[i] }));

    try {
      // Fund all gifts in one Circle batch
      const circleRes = await fetch("/api/circle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulkGiftBatchChallenge",
          userToken,
          walletId: primaryWalletId,
          gifts: gifts.map(({ paymentIdHash, amountUsdc }) => ({ paymentIdHash, amountUsdc })),
          expiresInHours: 24 * 7, // 7 days
        }),
      });
      const circleData = (await circleRes.json()) as { challengeId?: string; error?: string };
      if (!circleRes.ok || !circleData.challengeId) {
        throw new Error(circleData.error ?? `Circle error (${circleRes.status})`);
      }

      setStatusMsg("Confirm in Circle — fund all gifts in one step…");
      await executeChallenge(circleData.challengeId);

      // Wait for first gift on-chain (all in same tx)
      setStep("confirming");
      setStatusMsg(`Waiting for Arc confirmation…`);
      await waitForClientFundedGift({
        paymentIdHash: hashes[0],
        amountUsdc: amount,
        refundAddress: walletAddress,
        onProgress: (_a, _m, detail) => setStatusMsg(`Waiting for Arc… ${detail}`),
      });

      // Save campaign with secrets
      setStep("saving");
      setStatusMsg("Creating campaign…");
      const saveRes = await fetch("/api/create-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gifts,
          createdBy: walletAddress,
          senderDisplayName: senderName,
          giftMessage: message.trim() || undefined,
          title: title.trim() || undefined,
        }),
      });
      const saveData = (await saveRes.json()) as { ok?: boolean; campaignId?: string; error?: string };
      if (!saveRes.ok || !saveData.campaignId) {
        throw new Error(saveData.error ?? "Failed to create campaign.");
      }

      setCampaignId(saveData.campaignId);
      setStep("success");
      setStatusMsg(null);
    } catch (err) {
      setErrorMsg(formatGiftTxError(err instanceof Error ? err.message : "Campaign creation failed."));
      setStep("error");
    } finally {
      inFlightRef.current = false;
    }
  };

  const handleCopy = async () => {
    if (!campaignUrl) return;
    try {
      await navigator.clipboard.writeText(campaignUrl);
      toast("Campaign link copied!", "success");
    } catch { toast("Copy the link manually.", "info"); }
  };

  // Success screen
  if (step === "success" && campaignId && campaignUrl) {
    return (
      <AppShell className="flex items-center justify-center px-4 py-8 sm:px-5 sm:py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative z-[1] w-full max-w-[420px] space-y-3">
          <div className="flex justify-start"><MainMenu /></div>
          <GlassCard className="space-y-5 p-6">
            <div className="text-center space-y-1">
              <p className="text-3xl">🚀</p>
              <h1 className="app-heading text-xl">Campaign ready!</h1>
              <p className="soft-text text-sm">
                Share the link — anyone who opens it and signs in gets {amount} USDC automatically.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="break-all text-xs text-white/70">{campaignUrl}</p>
            </div>

            <div className="flex justify-center">
              <div className="rounded-xl bg-white p-3">
                <QRCodeSVG value={campaignUrl} size={160} level="H"
                  imageSettings={{ src: "/linkcash-icon-512.png", height: 28, width: 28, excavate: true }} />
              </div>
            </div>

            <div className="space-y-2">
              <motion.button type="button" onClick={() => void handleCopy()} whileTap={{ scale: 0.98 }}
                className="accent-gradient w-full rounded-[var(--radius)] px-5 py-3 text-base font-medium">
                Copy campaign link
              </motion.button>
              <Link href={`/campaign/${campaignId}/admin`}
                className="app-btn-secondary flex w-full items-center justify-center px-5 py-2.5 text-sm">
                View results →
              </Link>
            </div>
          </GlassCard>
        </motion.div>
      </AppShell>
    );
  }

  const isProcessing = step === "funding" || step === "confirming" || step === "saving";

  return (
    <AppShell className="flex items-center justify-center px-4 py-8 sm:px-5 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative z-[1] w-full max-w-[420px] space-y-3">
        <div className="flex justify-start"><MainMenu /></div>
        <GlassCard className="space-y-5 p-6">
          <div className="text-center space-y-1">
            <h1 className="app-heading text-2xl">New campaign</h1>
            <p className="soft-text text-sm">One link — everyone who opens it claims a gift.</p>
          </div>

          {!ready ? (
            <div className="flex justify-center py-8">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
            </div>
          ) : !authenticated ? (
            <div className="space-y-3">
              <p className="text-center text-sm text-white/55">Sign in to create a campaign.</p>
              <LoginPanel onGoogleLogin={() => void login()} onEmailLogin={loginWithEmail}
                googleLabel="Sign in with Google" buttonSize="large" authError={authError} />
            </div>
          ) : (
            <>
              {bootstrapError && (
                <p className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200">{bootstrapError}</p>
              )}

              <div className="app-panel app-field p-4">
                <label className="app-section-label">Campaign title (optional)</label>
                <input type="text" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="Arc Testnet Airdrop" className="app-input" />
              </div>

              <div className="app-panel app-field p-4">
                <label className="app-section-label">Amount per gift (USDC)</label>
                <input type="text" inputMode="decimal" value={amount}
                  onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d*$/.test(v)) setAmount(v); }}
                  className="app-input" />
              </div>

              <div className="app-panel app-field p-4">
                <label className="app-section-label">Number of gifts (max 50)</label>
                <div className="mb-2 flex flex-wrap gap-2">
                  {[5, 10, 20, 50].map((n) => (
                    <button key={n} type="button" onClick={() => setCount(n)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition ${count === n ? "border-white/40 bg-white/15 text-white" : "border-white/12 bg-white/5 text-white/55 hover:border-white/25 hover:text-white/80"}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <input type="text" inputMode="numeric" value={String(count)}
                  onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) setCount(Math.min(50, Math.max(1, v))); }}
                  className="app-input" />
              </div>

              <div className="app-panel app-field p-4">
                <label className="app-section-label">Message (optional)</label>
                <textarea maxLength={200} rows={2} value={message} onChange={(e) => setMessage(e.target.value)}
                  placeholder="Welcome to Arc Testnet!" className="app-input resize-none" />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-4 py-3">
                <span className="text-sm text-white/50">Total · {count} gifts</span>
                <span className="text-base font-bold text-emerald-400">{total} USDC</span>
              </div>

              {step === "error" && errorMsg && (
                <p className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-300">{errorMsg}</p>
              )}

              {isProcessing && (
                <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-4 py-3">
                  <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400" />
                  <p className="text-sm text-white/70">{statusMsg}</p>
                </div>
              )}

              <motion.button type="button" onClick={() => void handleCreate()}
                disabled={isProcessing || !walletAddress || walletSyncing}
                whileHover={{ scale: isProcessing ? 1 : 1.02 }} whileTap={{ scale: 0.98 }}
                className="accent-gradient w-full rounded-[var(--radius)] px-5 py-3.5 text-base font-medium disabled:cursor-not-allowed disabled:opacity-60">
                {isProcessing ? "Processing…" : walletSyncing ? "Preparing wallet…" : "Create campaign →"}
              </motion.button>

              <p className="text-center text-xs text-white/30">
                Gifts expire in 7 days · One claim per person
              </p>
            </>
          )}

          <div className="text-center">
            <Link href="/bulk" className="app-link text-sm">Individual links instead →</Link>
          </div>
        </GlassCard>
      </motion.div>
    </AppShell>
  );
}
