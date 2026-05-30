"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import AppShell from "@/components/ui/app-shell";
import GlassCard from "@/components/ui/glass-card";
import MainMenu from "@/components/ui/main-menu";
import LoginPanel from "@/components/ui/login-panel";
import { useCircleWallet } from "@/features/circle-wallet/model/circle-wallet-provider";
import { waitForClientFundedGift } from "@/features/create-gift/lib/read-gift-on-chain";
import { formatGiftTxError } from "@/features/create-gift/lib/gift-errors";
import { displayNameInitials } from "@/lib/client/google-display-name";
import {
  generateSecret,
  generateHash,
} from "@/utils";

type RequestDetails = {
  requestId: string;
  displayName: string;
  amountUsdc: string;
  message: string | null;
  createdAt: string;
  requesterWalletAddress: string;
};

type ApiResponse = RequestDetails | { error: string };

type PayStep = "idle" | "funding" | "claiming" | "success" | "error";

type ContractChallengeResponse = { challengeId: string };

async function postCircleChallenge(
  body: Record<string, unknown>
): Promise<ContractChallengeResponse> {
  const res = await fetch("/api/circle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as ContractChallengeResponse & {
    error?: string;
  };
  if (!res.ok || !data.challengeId) {
    throw new Error(data.error ?? `Circle API error (${res.status})`);
  }
  return { challengeId: data.challengeId };
}

function PayContent({ request }: { request: RequestDetails }) {
  const {
    ready,
    authenticated,
    login,
    loginWithEmail,
    walletAddress,
    primaryWalletId,
    userToken,
    executeChallenge,
    walletSyncing,
    authError,
    bootstrapError,
    googleDisplayName,
    googleEmail,
  } = useCircleWallet();

  const inFlightRef = useRef(false);
  const [step, setStep] = useState<PayStep>("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (step === "success") {
      confetti({
        particleCount: 120,
        spread: 80,
        startVelocity: 38,
        origin: { y: 0.65 },
        scalar: 0.9,
      });
    }
  }, [step]);

  const handlePay = async () => {
    if (inFlightRef.current || !walletAddress || !primaryWalletId || !userToken) return;
    inFlightRef.current = true;

    const secret = generateSecret();
    const hash = generateHash(secret);
    const payerName =
      googleDisplayName?.trim() ||
      googleEmail?.trim() ||
      "Someone";

    try {
      setStep("funding");
      setStatusMsg("Preparing transaction…");

      const { challengeId } = await postCircleChallenge({
        action: "giftFundingBatchChallenge",
        userToken,
        walletId: primaryWalletId,
        paymentIdHash: hash,
        amountUsdc: request.amountUsdc,
        expiresInHours: 24,
      });

      setStatusMsg("Confirm in Circle…");
      await executeChallenge(challengeId);

      setStatusMsg("Waiting for Arc confirmation…");
      await waitForClientFundedGift({
        paymentIdHash: hash,
        amountUsdc: request.amountUsdc,
        refundAddress: walletAddress,
        onProgress: (_a, _m, detail) =>
          setStatusMsg(`Waiting for Arc… ${detail}`),
      });

      const createRes = await fetch("/api/create-gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIdHash: hash,
          amountUsdc: request.amountUsdc,
          refundAddress: walletAddress,
          expiresInHours: 24,
          senderDisplayName: payerName,
          giftMessage: request.message || undefined,
          senderEmail: googleEmail || undefined,
          syncClientFunding: true,
        }),
      });
      if (!createRes.ok) {
        const createData = (await createRes.json()) as { error?: string };
        throw new Error(createData.error ?? "Failed to register payment.");
      }

      setStep("claiming");
      setStatusMsg(`Sending to ${request.displayName}…`);

      const claimRes = await fetch("/api/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret,
          paymentIdHash: hash,
          receiverAddress: request.requesterWalletAddress,
        }),
      });

      if (!claimRes.ok) {
        const claimData = (await claimRes.json()) as { error?: { message?: string } };
        throw new Error(
          claimData.error?.message ?? "Auto-claim failed. The funds are safe — contact support."
        );
      }

      setStep("success");
      setStatusMsg(null);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Payment failed.";
      setErrorMsg(formatGiftTxError(raw));
      setStep("error");
    } finally {
      inFlightRef.current = false;
    }
  };

  if (step === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-5 text-center"
      >
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.05, type: "spring", stiffness: 200 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-500/50 bg-emerald-950/80 text-3xl"
        >
          ✓
        </motion.div>
        <div>
          <h2 className="app-heading text-2xl">Payment sent!</h2>
          <p className="soft-text mt-1 text-sm">
            {request.amountUsdc} USDC is now in{" "}
            <span className="text-white/80">{request.displayName}</span>&apos;s
            wallet.
          </p>
        </div>
        <div className="space-y-2">
          <Link
            href="/create"
            className="accent-gradient inline-flex w-full items-center justify-center rounded-[var(--radius)] px-6 py-3 text-sm font-medium"
          >
            🎁 Send someone a gift →
          </Link>
          <Link
            href="/wallet"
            className="app-btn-secondary inline-flex w-full items-center justify-center px-6 py-2.5 text-sm"
          >
            Open my wallet
          </Link>
        </div>
      </motion.div>
    );
  }

  if (step === "error") {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-rose-400">{errorMsg}</p>
        <button
          type="button"
          onClick={() => {
            setStep("idle");
            setErrorMsg(null);
          }}
          className="app-btn-secondary px-5 py-2.5 text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  const isProcessing = step === "funding" || step === "claiming";

  if (!request.requesterWalletAddress) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-amber-300">
          This request link was created with an older version of the app and
          can&apos;t be paid directly.
        </p>
        <p className="text-xs text-white/50">
          Ask {request.displayName} to create a new request link at{" "}
          <Link href="/request" className="app-link">
            linkcash.app/request
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {bootstrapError && (
        <p className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200">
          {bootstrapError}
        </p>
      )}

      {/* Request card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3 text-center"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/8 text-xl font-semibold text-white/90">
          {displayNameInitials(request.displayName)}
        </div>
        <p className="text-sm text-white/55">Payment request from</p>
        <p className="text-xl font-semibold text-white/90">
          {request.displayName}
        </p>
        {request.message && (
          <p className="text-sm italic text-white/60">
            &quot;{request.message}&quot;
          </p>
        )}
        <div className="inline-flex flex-col items-center gap-0.5">
          <span className="text-4xl font-bold tracking-tight">
            {request.amountUsdc}
          </span>
          <span className="text-sm text-white/50">USDC</span>
        </div>
      </motion.div>

      {/* Auth or pay button */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        {!ready ? (
          <div className="flex justify-center py-4">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
          </div>
        ) : !authenticated ? (
          <>
            <p className="text-center text-xs text-white/50">
              Sign in to pay — a wallet is created for you automatically.
            </p>
            <LoginPanel
              onGoogleLogin={() => void login()}
              onEmailLogin={loginWithEmail}
              googleLabel={`Pay ${request.amountUsdc} USDC with Google →`}
              buttonSize="large"
              authError={authError}
            />
          </>
        ) : isProcessing ? (
          <div className="space-y-3 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400" />
            <p className="text-sm text-white/70">{statusMsg}</p>
          </div>
        ) : (
          <>
            {authenticated && (
              <p className="text-center text-xs text-white/40">
                Paying from:{" "}
                {walletAddress
                  ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
                  : "not ready"}
              </p>
            )}
            <motion.button
              type="button"
              onClick={() => void handlePay()}
              disabled={!walletAddress || walletSyncing}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="accent-gradient w-full rounded-[var(--radius)] px-6 py-3.5 text-base font-medium disabled:cursor-not-allowed disabled:opacity-60"
            >
              {walletSyncing
                ? "Preparing wallet…"
                : `Pay ${request.amountUsdc} USDC →`}
            </motion.button>
            <p className="text-center text-xs text-white/35">
              USDC goes directly to {request.displayName}&apos;s wallet. No extra steps.
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function PayPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = use(params);
  const [request, setRequest] = useState<RequestDetails | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(() => Boolean(requestId));

  useEffect(() => {
    if (!requestId) return;
    fetch(`/api/request/${requestId}`)
      .then(async (res) => {
        const data = (await res.json()) as ApiResponse;
        if (!res.ok || "error" in data) {
          setNotFound(true);
        } else {
          setRequest(data);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [requestId]);

  if (notFound) {
    return (
      <AppShell className="flex items-center justify-center px-4 py-8 sm:px-5 sm:py-10">
        <GlassCard className="relative z-[1] w-full max-w-[420px] space-y-5 p-8 text-center">
          <div className="flex justify-start">
            <MainMenu />
          </div>
          <p className="text-5xl">🔗</p>
          <h1 className="app-heading text-2xl">Request not found</h1>
          <p className="soft-text text-sm">
            This link is invalid or has expired.
          </p>
          <Link
            href="/"
            className="app-btn-secondary inline-flex w-full items-center justify-center px-5 py-2.5 text-sm"
          >
            Go home
          </Link>
        </GlassCard>
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
        <GlassCard className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                exit={{ opacity: 0 }}
                className="animate-pulse space-y-4 py-4 text-center"
                aria-hidden
              >
                <div className="mx-auto h-16 w-16 rounded-full bg-white/10" />
                <div className="mx-auto h-3 w-24 rounded bg-white/8" />
                <div className="mx-auto h-3 w-32 rounded bg-white/10" />
                <div className="mx-auto h-10 w-40 rounded bg-white/10" />
              </motion.div>
            ) : request ? (
              <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <PayContent request={request} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </GlassCard>
      </motion.div>
    </AppShell>
  );
}
