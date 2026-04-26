"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import GlassCard from "../../../components/ui/glass-card";
import { useGift } from "../../../hooks/useGift";
import {
  ARC_TESTNET,
  getArcExplorerTxUrl,
} from "../../../utils";

export default function GiftPage() {
  const hasPrivyAppId = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

  if (!hasPrivyAppId) {
    return (
      <main className="relative flex min-h-screen items-center justify-center px-5 py-10 text-white">
        <GlassCard className="max-w-[420px] p-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            You received a gift
          </h1>
          <p className="soft-text mt-4 text-sm">
            Set <code>NEXT_PUBLIC_PRIVY_APP_ID</code> in your environment to
            enable social login and claim.
          </p>
        </GlassCard>
      </main>
    );
  }

  return <GiftClaimContent />;
}

function GiftClaimContent() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { claimGift, loading, txHash, error } = useGift();
  const [status, setStatus] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(23 * 60 + 59);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null);
  const successOverlayTimerRef = useRef<number | null>(null);

  const receiverAddress = useMemo(() => {
    const embeddedWallet = wallets.find(
      (wallet) =>
        wallet.walletClientType === "privy" ||
        wallet.walletClientType === "privy-v2"
    );
    return embeddedWallet?.address ?? null;
  }, [wallets]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemainingSeconds((value) => {
        if (value <= 0) return 0;
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

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

  const onUnwrap = async () => {
    if (!ready) {
      return;
    }

    if (!authenticated) {
      login();
      return;
    }

    if (!receiverAddress) {
      setStatus("No embedded wallet found. Please sign in again.");
      return;
    }

    const hash = await claimGift(receiverAddress);
    if (hash) {
      setSuccessTxHash(hash);
      setStatus("Success! Finalizing onchain receipt...");

      if (successOverlayTimerRef.current) {
        window.clearTimeout(successOverlayTimerRef.current);
      }

      successOverlayTimerRef.current = window.setTimeout(() => {
        setIsSuccess(true);
      }, 2200);
    }
  };

  const minutes = Math.floor(remainingSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (remainingSeconds % 60).toString().padStart(2, "0");

  return (
    <main className="relative flex min-h-screen items-center justify-center px-5 py-10 text-white">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[450px] w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(139,92,246,0.2)_0%,_rgba(59,130,246,0.14)_35%,_transparent_70%)] blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-[420px]"
      >
        <GlassCard className="relative space-y-6 p-8 text-center">
          <div className="space-y-2">
            <p className="mx-auto inline-flex rounded-full border border-white/15 px-3 py-1 text-xs text-white/75">
              {ARC_TESTNET.chainName} · {ARC_TESTNET.chainId}
            </p>
            <p className="text-sm tracking-[0.06em] text-white/75">
              🎁 You received a gift
            </p>
            <h1 className="text-5xl font-semibold tracking-tight">$10 USDC</h1>
            <p className="soft-text text-sm">
              Someone sent you your first crypto
            </p>
            {authenticated && (
              <p className="mt-2 break-all text-xs text-white/60">
                Receiving wallet: {receiverAddress ?? "not ready"}
              </p>
            )}
          </div>

          <p className="countdown-tick text-sm text-white/70">
            Expires in {minutes}:{seconds}
          </p>

          {!isSuccess && (
            <div className="space-y-3">
              <motion.button
                type="button"
                onClick={onUnwrap}
                disabled={loading || !ready}
                whileHover={{ scale: loading ? 1 : 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="accent-gradient w-full rounded-2xl px-6 py-4 text-lg font-semibold shadow-[0_16px_40px_rgba(76,85,255,0.42)] transition hover:shadow-[0_18px_46px_rgba(99,102,241,0.5)] disabled:cursor-not-allowed disabled:opacity-65"
              >
                {loading ? "Opening your gift..." : "Unwrap your gift"}
              </motion.button>

              {authenticated && (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setStatus("Signed out. Click unwrap to sign in again.");
                  }}
                  className="w-full rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/5"
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
              className="break-all text-xs text-blue-300/90 underline decoration-white/30 underline-offset-4 hover:text-blue-200"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0b0f]/95 px-6 text-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full max-w-[420px] space-y-5 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl"
            >
              <h2 className="text-4xl font-semibold tracking-tight">
                You&apos;re now on-chain
              </h2>
              <p className="soft-text text-sm">
                $10 USDC has been added to your wallet
              </p>
              {successTxHash && (
                <a
                  href={getArcExplorerTxUrl(successTxHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="block break-all text-xs text-blue-300/90 underline decoration-white/30 underline-offset-4 hover:text-blue-200"
                >
                  {successTxHash}
                </a>
              )}
              <Link
                href="/create"
                className="accent-gradient inline-flex w-full items-center justify-center rounded-2xl px-6 py-3.5 text-base font-semibold shadow-[0_14px_36px_rgba(76,85,255,0.38)] transition hover:scale-[1.02]"
              >
                Send your first gift
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
