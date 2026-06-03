"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/ui/app-shell";
import GlassCard from "@/components/ui/glass-card";
import MainMenu from "@/components/ui/main-menu";
import LoginPanel from "@/components/ui/login-panel";
import { useCircleWallet } from "@/features/circle-wallet/model/circle-wallet-provider";
import { displayNameInitials } from "@/lib/client/google-display-name";
import { toast } from "@/lib/client/toast";

type PaymentRequestItem = {
  requestId: string;
  displayName: string;
  amountUsdc: string;
  message?: string;
  createdAt: string;
  requesterWalletAddress: string;
};

const REQUEST_TTL_DAYS = 90;

function isExpired(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  return Date.now() - created > REQUEST_TTL_DAYS * 24 * 60 * 60 * 1000;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function RequestCard({ req }: { req: PaymentRequestItem }) {
  const [copied, setCopied] = useState(false);
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/pay/${req.requestId}`;
  const expired = isExpired(req.createdAt);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast("Link copied!", "success");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast("Copy the link manually.", "info");
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "Pay me via LinkCash",
          text: `${req.displayName} is requesting ${req.amountUsdc} USDC`,
          url: link,
        });
      } catch {
        // user cancelled or share failed — fall back to copy
        void handleCopy();
      }
    } else {
      void handleCopy();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 space-y-3 ${
        expired
          ? "border-white/6 bg-white/3 opacity-50"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/8 text-xs font-semibold text-white/90">
            {displayNameInitials(req.displayName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white/85">{req.displayName}</p>
            <p className="text-xs text-white/40">{formatDate(req.createdAt)}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-bold text-white/90">{req.amountUsdc}</p>
          <p className="text-xs text-white/40">USDC</p>
        </div>
      </div>

      {req.message && (
        <p className="text-xs italic text-white/50 border-l-2 border-white/10 pl-3">
          &quot;{req.message}&quot;
        </p>
      )}

      <div className="flex gap-2">
        {expired ? (
          <span className="text-xs text-white/30 self-center">Expired</span>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="flex-1 rounded-lg border border-white/12 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:border-white/25 hover:text-white/85"
            >
              {copied ? "Copied ✓" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={() => void handleShare()}
              className="flex-1 rounded-lg border border-white/12 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:border-white/25 hover:text-white/85"
            >
              Share →
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function RequestsPage() {
  const { ready, authenticated, walletAddress, login, loginWithEmail, authError } =
    useCircleWallet();

  const [requests, setRequests] = useState<PaymentRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!walletAddress || fetched) return;
    setLoading(true);
    fetch(`/api/my-requests?walletAddress=${encodeURIComponent(walletAddress)}`)
      .then(async (res) => {
        const data = (await res.json()) as { ok?: boolean; requests?: PaymentRequestItem[] };
        if (data.ok && Array.isArray(data.requests)) {
          setRequests(data.requests);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        setLoading(false);
        setFetched(true);
      });
  }, [walletAddress, fetched]);

  const active = requests.filter((r) => !isExpired(r.createdAt));
  const expired = requests.filter((r) => isExpired(r.createdAt));

  return (
    <AppShell className="flex items-center justify-center px-4 py-8 sm:px-5 sm:py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative z-[1] w-full max-w-[420px] space-y-3"
      >
        <div className="flex items-center justify-between">
          <MainMenu />
          <Link
            href="/request"
            className="app-btn-secondary px-3 py-1.5 text-xs"
          >
            + New request
          </Link>
        </div>

        <GlassCard className="space-y-5 p-6">
          <div>
            <h1 className="app-heading text-xl">My Requests</h1>
            <p className="soft-text text-sm mt-0.5">
              Payment links you&apos;ve created
            </p>
          </div>

          {!ready ? (
            <div className="flex justify-center py-8">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
            </div>
          ) : !authenticated ? (
            <div className="space-y-3">
              <p className="text-center text-sm text-white/55">
                Sign in to see your requests.
              </p>
              <LoginPanel
                onGoogleLogin={() => void login()}
                onEmailLogin={loginWithEmail}
                googleLabel="Sign in with Google"
                buttonSize="large"
                authError={authError}
              />
            </div>
          ) : loading ? (
            <div className="flex justify-center py-8">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
            </div>
          ) : (
            <AnimatePresence>
              {requests.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4 py-4 text-center"
                >
                  <p className="text-4xl">💸</p>
                  <p className="text-sm text-white/50">No requests yet.</p>
                  <Link
                    href="/request"
                    className="accent-gradient inline-flex items-center justify-center rounded-[var(--radius)] px-5 py-2.5 text-sm font-medium"
                  >
                    Create your first request →
                  </Link>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {active.map((req) => (
                    <RequestCard key={req.requestId} req={req} />
                  ))}
                  {expired.length > 0 && (
                    <>
                      <p className="pt-1 text-xs text-white/30 uppercase tracking-wider">
                        Expired
                      </p>
                      {expired.map((req) => (
                        <RequestCard key={req.requestId} req={req} />
                      ))}
                    </>
                  )}
                </div>
              )}
            </AnimatePresence>
          )}
        </GlassCard>
      </motion.div>
    </AppShell>
  );
}
