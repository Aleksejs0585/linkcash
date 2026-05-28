"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import AppShell from "@/components/ui/app-shell";
import GlassCard from "@/components/ui/glass-card";
import MainMenu from "@/components/ui/main-menu";
import LoginPanel from "@/components/ui/login-panel";
import { useCircleWallet } from "@/features/circle-wallet/model/circle-wallet-provider";
import { toast } from "@/lib/client/toast";

type CreateRequestResponse = { requestId: string } | { error: string };

const AMOUNT_PRESETS = ["5", "10", "25", "50", "100"];

export default function RequestPage() {
  const {
    ready,
    authenticated,
    login,
    loginWithEmail,
    walletAddress,
    authError,
    walletSyncing,
    googleDisplayName,
    googleEmail,
  } = useCircleWallet();

  const [amount, setAmount] = useState("25");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestLink, setRequestLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const displayName =
    googleDisplayName?.trim() || googleEmail?.trim() || "Me";

  const handleSubmit = async () => {
    if (!walletAddress) {
      toast("Wallet not ready yet — wait a moment.", "error");
      return;
    }
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      toast("Enter a valid amount.", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/create-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          amountUsdc: amount,
          message: message.trim() || undefined,
          requesterWalletAddress: walletAddress,
        }),
      });
      const data = (await res.json()) as CreateRequestResponse;
      if (!res.ok || !("requestId" in data)) {
        throw new Error("error" in data ? data.error : "Failed to create request.");
      }
      setRequestLink(`${window.location.origin}/pay/${data.requestId}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!requestLink) return;
    try {
      await navigator.clipboard.writeText(requestLink);
      setCopied(true);
      toast("Link copied!", "success");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast("Copy the link manually.", "info");
    }
  };

  if (requestLink) {
    return (
      <AppShell className="flex items-center justify-center px-4 py-8 sm:px-5 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative z-[1] w-full max-w-[420px] space-y-3"
        >
          <div className="flex justify-start">
            <MainMenu />
          </div>
          <GlassCard className="space-y-5 p-6 sm:p-8">
            <div className="text-center space-y-1">
              <p className="text-4xl" aria-hidden>💸</p>
              <h1 className="app-heading text-2xl">Request link ready</h1>
              <p className="soft-text text-sm">
                Share this with whoever needs to pay you. When they pay, USDC
                lands in your wallet automatically — no extra steps.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="break-all text-xs text-white/70">{requestLink}</p>
            </div>

            <div className="space-y-2">
              <motion.button
                type="button"
                onClick={() => void handleCopy()}
                whileTap={{ scale: 0.98 }}
                className="accent-gradient w-full rounded-[var(--radius)] px-5 py-3 text-base font-medium"
              >
                {copied ? "Copied ✓" : "Copy request link"}
              </motion.button>
              <button
                type="button"
                onClick={() => {
                  setRequestLink(null);
                  setCopied(false);
                  setMessage("");
                }}
                className="app-btn-secondary w-full px-4 py-2.5 text-sm"
              >
                Create another request
              </button>
            </div>
          </GlassCard>
        </motion.div>
      </AppShell>
    );
  }

  return (
    <AppShell className="flex items-center justify-center px-4 py-8 sm:px-5 sm:py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative z-[1] w-full max-w-[420px] space-y-3"
      >
        <div className="flex justify-start">
          <MainMenu />
        </div>
        <GlassCard className="space-y-5 p-6 sm:p-8">
          <div className="text-center space-y-1">
            <h1 className="app-heading text-3xl">Request a payment</h1>
            <p className="soft-text text-sm">
              Payer opens your link, confirms once — USDC arrives in your
              wallet directly.
            </p>
          </div>

          {!ready ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
              <p className="text-sm text-white/50">Loading wallet…</p>
            </div>
          ) : !authenticated ? (
            <div className="space-y-3">
              <p className="text-center text-sm text-white/60">
                Sign in so we know where to send the payment.
              </p>
              <LoginPanel
                onGoogleLogin={() => void login()}
                onEmailLogin={loginWithEmail}
                googleLabel="Sign in with Google"
                buttonSize="large"
                authError={authError}
              />
            </div>
          ) : (
            <>
              {/* Requester identity — read-only */}
              <div className="app-panel p-4 text-left">
                <p className="app-section-label">Requesting as</p>
                <p className="mt-1 text-sm font-medium text-white/90">{displayName}</p>
                {walletSyncing ? (
                  <p className="mt-1 text-xs text-amber-300">Wallet syncing…</p>
                ) : walletAddress ? (
                  <p className="mt-1 text-xs text-white/35">
                    {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
                  </p>
                ) : null}
              </div>

              {/* Amount */}
              <div className="app-panel app-field p-4 text-left">
                <label htmlFor="req-amount" className="app-section-label">
                  Amount (USDC)
                </label>
                <div className="mb-2 flex flex-wrap gap-2">
                  {AMOUNT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                        amount === preset
                          ? "border-white/40 bg-white/15 text-white"
                          : "border-white/12 bg-white/5 text-white/55 hover:border-white/25 hover:text-white/80"
                      }`}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
                <input
                  id="req-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="app-input"
                />
              </div>

              {/* Message */}
              <div className="app-panel app-field p-4 text-left">
                <label htmlFor="req-message" className="app-section-label">
                  What&apos;s it for? (optional)
                </label>
                <textarea
                  id="req-message"
                  maxLength={200}
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Freelance work, splitting dinner…"
                  className="app-input resize-none"
                />
              </div>

              <motion.button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={loading || !walletAddress || walletSyncing}
                whileHover={{ scale: loading ? 1 : 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="accent-gradient w-full rounded-[var(--radius)] px-5 py-3.5 text-base disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating link…" : "Generate request link →"}
              </motion.button>
            </>
          )}

          <div className="text-center">
            <Link href="/create" className="app-link text-sm">
              Send a gift instead →
            </Link>
          </div>
        </GlassCard>
      </motion.div>
    </AppShell>
  );
}
