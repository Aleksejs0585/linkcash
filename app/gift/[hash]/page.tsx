"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import AppShell from "@/components/ui/app-shell";
import GlassCard from "@/components/ui/glass-card";
import MainMenu from "@/components/ui/main-menu";
import OAuthNavHint from "@/components/ui/oauth-nav-hint";
import { isCircleWalletConfigured } from "@/features/circle-wallet/config/circle-env";
import { useCircleWallet } from "@/features/circle-wallet/model/circle-wallet-provider";
import { useGift } from "@/hooks/useGift";
import { trackEvent } from "@/lib/client/analytics";
import { getOrAssignVariant } from "@/lib/client/experiments";
import {
  AUTO_CLAIM_AFTER_AUTH_KEY,
  consumeAutoClaimAfterAuth,
  clearOAuthFlowState,
  markAutoClaimAfterAuth,
} from "@/lib/client/oauth-return";
import { displayNameInitials } from "@/lib/client/google-display-name";
import {
  ARC_TESTNET,
  getPaymentIdHashFromPath,
  getArcExplorerTxUrl,
  getSecretFromHash,
} from "@/utils";

type GiftDetailsResponse =
  | {
      ok: true;
      amountUsdc: string;
      expiresAt: number;
      claimed: boolean;
      senderDisplayName?: string;
      giftMessage?: string;
    }
  | {
      ok: false;
      error: string;
    };

function formatExpiryRemaining(seconds: number): string {
  if (seconds <= 0) return "Expired";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function GiftPage() {
  if (!isCircleWalletConfigured()) {
    return (
      <AppShell className="flex items-center justify-center px-4 py-8 sm:px-5 sm:py-10">
        <GlassCard className="relative z-[1] max-w-[420px] p-6 text-center sm:p-8">
          <div className="mb-4 flex justify-start">
            <MainMenu />
          </div>
          <h1 className="app-heading text-3xl">
            You received a gift
          </h1>
          <p className="soft-text mt-4 text-sm">
            Set <code>NEXT_PUBLIC_CIRCLE_APP_ID</code>,{" "}
            <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>, and server{" "}
            <code>CIRCLE_API_KEY</code> to enable Google sign-in and claiming.
          </p>
        </GlassCard>
      </AppShell>
    );
  }

  return <GiftClaimContent />;
}

function GiftClaimContent() {
  const {
    ready,
    authenticated,
    login,
    logout,
    walletAddress,
    authError,
    bootstrapError,
    walletSyncing,
  } = useCircleWallet();
  const { claimGift, loading, txHash, error } = useGift();
  const [hasSecret] = useState(() => Boolean(getSecretFromHash()));
  const [status, setStatus] = useState<string | null>(null);
  const [giftAmountUsdc, setGiftAmountUsdc] = useState<string | null>(null);
  const [senderDisplayName, setSenderDisplayName] = useState<string | null>(
    null
  );
  const [giftMessage, setGiftMessage] = useState<string | null>(null);
  const [expiresAtSec, setExpiresAtSec] = useState<number | null>(null);
  const [giftLoading, setGiftLoading] = useState(true);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null);
  const successOverlayTimerRef = useRef<number | null>(null);
  const lastTrackedErrorRef = useRef<string | null>(null);
  const [claimCopyVariant] = useState(() =>
    getOrAssignVariant("claim_cta_v1", ["a", "b"])
  );

  const receiverAddress = useMemo(
    () => walletAddress ?? null,
    [walletAddress]
  );
  const paymentIdHash = useMemo(() => getPaymentIdHashFromPath(), []);

  useEffect(() => {
    if (authError && !authenticated) {
      clearOAuthFlowState();
    }
  }, [authError, authenticated]);

  useEffect(() => {
    if (!paymentIdHash) {
      const timeoutId = window.setTimeout(() => setGiftLoading(false), 0);
      return () => window.clearTimeout(timeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      fetch(`/api/gift/${paymentIdHash}`)
        .then(async (response) => {
          const data = (await response.json()) as GiftDetailsResponse;
          if (!response.ok || !data.ok) {
            throw new Error(data.ok ? "Failed to load gift details." : data.error);
          }

          setGiftAmountUsdc(data.amountUsdc);
          setExpiresAtSec(data.expiresAt);
          setSenderDisplayName(data.senderDisplayName?.trim() || null);
          setGiftMessage(data.giftMessage?.trim() || null);
        })
        .catch((e) => {
          setStatus(
            e instanceof Error
              ? e.message
              : "Failed to load gift amount. Try refreshing."
          );
        })
        .finally(() => setGiftLoading(false));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [paymentIdHash]);

  useEffect(() => {
    if (!expiresAtSec) return;

    const updateRemaining = () => {
      const nowSec = Math.floor(Date.now() / 1000);
      setRemainingSeconds(Math.max(0, expiresAtSec - nowSec));
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAtSec]);

  useEffect(() => {
    if (!isSuccess) return;

    confetti({
      particleCount: 160,
      spread: 90,
      startVelocity: 42,
      origin: { y: 0.62 },
      scalar: 0.95,
    });
  }, [isSuccess]);

  useEffect(() => {
    return () => {
      if (successOverlayTimerRef.current) {
        window.clearTimeout(successOverlayTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!error) return;
    if (lastTrackedErrorRef.current === error) return;
    lastTrackedErrorRef.current = error;
    trackEvent({
      event: "claim_error",
      path: window.location.pathname,
      paymentIdHash: paymentIdHash ?? undefined,
      detail: error.slice(0, 240),
      variant: `claim_cta_v1:${claimCopyVariant}`,
    });
  }, [claimCopyVariant, error, paymentIdHash]);

  const completeClaimSuccess = useCallback(
    (hash: string) => {
      trackEvent({
        event: "claim_success",
        path: window.location.pathname,
        paymentIdHash: paymentIdHash ?? undefined,
        txHash: hash,
        variant: `claim_cta_v1:${claimCopyVariant}`,
      });
      setSuccessTxHash(hash);
      setStatus("Success! Finalizing onchain receipt...");

      if (successOverlayTimerRef.current) {
        window.clearTimeout(successOverlayTimerRef.current);
      }

      successOverlayTimerRef.current = window.setTimeout(() => {
        setIsSuccess(true);
      }, 2200);
    },
    [claimCopyVariant, paymentIdHash]
  );

  const runClaim = useCallback(async () => {
    if (!receiverAddress) {
      setStatus(
        walletSyncing
          ? "Preparing your Circle wallet..."
          : "No wallet address yet. Sign in with Google again."
      );
      return;
    }

    if (remainingSeconds !== null && remainingSeconds <= 0) {
      setStatus("This gift has expired.");
      return;
    }

    const hash = await claimGift(receiverAddress);
    if (hash) {
      completeClaimSuccess(hash);
    }
  }, [
    claimGift,
    completeClaimSuccess,
    receiverAddress,
    remainingSeconds,
    walletSyncing,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(AUTO_CLAIM_AFTER_AUTH_KEY) !== "1") return;
    if (!authenticated || !ready || walletSyncing) return;
    if (!receiverAddress) return;
    if (!getSecretFromHash()) return;
    if (remainingSeconds !== null && remainingSeconds <= 0) {
      clearOAuthFlowState();
      return;
    }

    consumeAutoClaimAfterAuth();
    void (async () => {
      await Promise.resolve();
      await runClaim();
    })();
  }, [
    authenticated,
    ready,
    walletSyncing,
    receiverAddress,
    remainingSeconds,
    runClaim,
  ]);

  const onUnwrap = async () => {
    if (!ready) {
      return;
    }

    if (!authenticated) {
      markAutoClaimAfterAuth();
      void login();
      return;
    }

    await runClaim();
  };

  const amountLabel = giftAmountUsdc ? `${giftAmountUsdc} USDC` : "Gift";
  const hasNamedGift = Boolean(senderDisplayName);
  const expiryUrgent =
    remainingSeconds !== null && remainingSeconds > 0 && remainingSeconds < 3600;
  const expiryLabel =
    remainingSeconds === null
      ? "Checking expiry..."
      : formatExpiryRemaining(remainingSeconds);

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
        <GlassCard className="relative space-y-5 p-6 text-center sm:space-y-6 sm:p-8">
          {bootstrapError && (
            <p className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200">
              {bootstrapError}
            </p>
          )}
          {!giftLoading && !hasSecret && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
              This link is missing the claim secret. Make sure you opened the
              full gift link — not the status link.
            </div>
          )}
          {giftLoading ? (
            <div className="animate-pulse space-y-3 py-2" aria-hidden>
              <div className="mx-auto h-14 w-14 rounded-full bg-white/10" />
              <div className="mx-auto h-3 w-20 rounded bg-white/8" />
              <div className="mx-auto h-3 w-28 rounded bg-white/10" />
              <div className="mx-auto h-10 w-36 rounded bg-white/10" />
              <div className="mx-auto h-3 w-24 rounded bg-white/8" />
              <div className="mx-auto h-3 w-32 rounded bg-white/6" />
            </div>
          ) : hasNamedGift ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="app-gift-card"
            >
              <div className="app-gift-avatar" aria-hidden>
                {displayNameInitials(senderDisplayName!)}
              </div>
              <p className="app-gift-from">Gift from</p>
              <p className="app-gift-name">{senderDisplayName}</p>
              {giftMessage ? (
                <p className="app-gift-msg">&quot;{giftMessage}&quot;</p>
              ) : null}
              <p className="app-gift-amount">{giftAmountUsdc ?? "—"}</p>
              <p className="app-gift-token">USDC · {ARC_TESTNET.chainName}</p>
              <p className={`app-gift-expiry countdown-tick${expiryUrgent ? " text-rose-400" : ""}`}>
                {remainingSeconds === null
                  ? "Checking expiry..."
                  : remainingSeconds <= 0
                    ? "Gift expired"
                    : `Expires in ${expiryLabel}`}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              <p className="app-chain-badge mx-auto">
                {ARC_TESTNET.chainName} · {ARC_TESTNET.chainId}
              </p>
              <p className="text-sm tracking-[0.06em] text-white/75">
                🎁 You received a gift
              </p>
              <h1 className="app-heading text-4xl sm:text-5xl">{amountLabel}</h1>
              <p className="soft-text text-sm">Someone sent you crypto</p>
            </div>
          )}

          {!giftLoading && !hasNamedGift ? (
            <p className={`countdown-tick text-sm${expiryUrgent ? " text-rose-400" : " text-white/70"}`}>
              {remainingSeconds === null
                ? "Checking expiry..."
                : remainingSeconds <= 0
                  ? "Gift expired"
                  : `Expires in ${expiryLabel}`}
            </p>
          ) : null}

          {authenticated ? (
            <p className="break-all text-xs text-white/60">
              Receiving wallet: {receiverAddress ?? "not ready"}
            </p>
          ) : null}

          {!isSuccess && (
            <div className="space-y-3">
              <motion.button
                type="button"
                onClick={() => void onUnwrap()}
                disabled={
                  loading ||
                  !ready ||
                  giftLoading ||
                  remainingSeconds === 0 ||
                  walletSyncing
                }
                whileHover={{ scale: loading ? 1 : 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="accent-gradient w-full rounded-[var(--radius)] px-5 py-3.5 text-base disabled:cursor-not-allowed disabled:opacity-65 sm:px-6 sm:py-4 sm:text-lg"
              >
                {walletSyncing
                  ? "Preparing wallet..."
                  : loading
                    ? "Opening your gift..."
                    : !authenticated
                      ? hasNamedGift
                        ? "Claim with Google →"
                        : "Sign in & unwrap"
                      : claimCopyVariant === "b"
                        ? "Claim to my wallet"
                        : "Unwrap your gift"}
              </motion.button>
              {!authenticated && (
                <>
                  {hasNamedGift ? (
                    <p className="text-xs text-white/55">
                      No wallet or account needed
                    </p>
                  ) : null}
                  <OAuthNavHint />
                  {authError && (
                    <p className="text-xs text-rose-400">{authError}</p>
                  )}
                </>
              )}

              {authenticated && (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setStatus("Signed out. Click unwrap to sign in again.");
                  }}
                  className="app-btn-secondary w-full px-4 py-2.5 text-sm"
                >
                  Use a different account
                </button>
              )}
            </div>
          )}

          {status && (
            <p className="text-xs text-emerald-300/90">{status}</p>
          )}
          {txHash && (
            <a
              href={getArcExplorerTxUrl(txHash)}
              target="_blank"
              rel="noreferrer"
              className="app-link break-all text-xs"
            >
              View transaction on Arc Explorer
            </a>
          )}
          {successTxHash && !isSuccess && (
            <p className="text-xs text-white/60">
              Opening success screen in a moment...
            </p>
          )}
          {error && <p className="text-sm text-rose-400">{error}</p>}
        </GlassCard>
      </motion.div>

      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg)]/95 px-6 text-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="glass-card w-full max-w-[420px] space-y-5 p-6 sm:p-8"
            >
              <h2 className="app-heading text-4xl">
                You&apos;re now on-chain
              </h2>
              <p className="soft-text text-sm">
                {giftAmountUsdc
                  ? `${giftAmountUsdc} USDC has been added to your wallet`
                  : "Your gift has been added to your wallet"}
              </p>
              {successTxHash && (
                <a
                  href={getArcExplorerTxUrl(successTxHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="app-link block break-all text-xs"
                >
                  {successTxHash}
                </a>
              )}
              <div className="space-y-2">
                <Link
                  href="/wallet"
                  className="accent-gradient inline-flex w-full items-center justify-center rounded-[var(--radius)] px-6 py-3.5 text-base transition hover:scale-[1.02]"
                >
                  Open my wallet
                </Link>
                <Link
                  href="/create"
                  className="app-btn-secondary inline-flex w-full items-center justify-center px-6 py-3 text-sm font-medium"
                >
                  Create gift
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
