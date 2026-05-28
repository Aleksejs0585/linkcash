"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import AppShell from "@/components/ui/app-shell";
import GlassCard from "@/components/ui/glass-card";
import MainMenu from "@/components/ui/main-menu";
import { displayNameInitials } from "@/lib/client/google-display-name";

type RequestDetails = {
  requestId: string;
  displayName: string;
  amountUsdc: string;
  message: string | null;
  createdAt: string;
};

type ApiResponse = RequestDetails | { error: string };

export default function PayPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = use(params);
  const [details, setDetails] = useState<RequestDetails | null>(null);
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
          setDetails(data);
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
            This link is invalid or has expired. Ask the person to send you a new
            one.
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

  const createUrl = details
    ? `/create?amount=${encodeURIComponent(details.amountUsdc)}${
        details.message
          ? `&msg=${encodeURIComponent(details.message)}`
          : ""
      }&toName=${encodeURIComponent(details.displayName)}`
    : "/create";

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
        <GlassCard className="space-y-6 p-6 text-center sm:p-8">
          {loading ? (
            <div className="animate-pulse space-y-4 py-4" aria-hidden>
              <div className="mx-auto h-16 w-16 rounded-full bg-white/10" />
              <div className="mx-auto h-3 w-24 rounded bg-white/8" />
              <div className="mx-auto h-3 w-32 rounded bg-white/10" />
              <div className="mx-auto h-10 w-40 rounded bg-white/10" />
            </div>
          ) : details ? (
            <>
              {/* Requester card */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/8 text-xl font-semibold text-white/90">
                  {displayNameInitials(details.displayName)}
                </div>
                <p className="text-sm text-white/55">Payment request from</p>
                <p className="text-xl font-semibold text-white/90">
                  {details.displayName}
                </p>
                {details.message && (
                  <p className="text-sm italic text-white/60">
                    &quot;{details.message}&quot;
                  </p>
                )}
                <div className="inline-flex flex-col items-center gap-0.5">
                  <span className="text-4xl font-bold tracking-tight">
                    {details.amountUsdc}
                  </span>
                  <span className="text-sm text-white/50">USDC</span>
                </div>
              </motion.div>

              {/* How it works note */}
              <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-left text-xs text-white/50 space-y-1">
                <p>1. Click Pay — create a gift on Arc Testnet.</p>
                <p>
                  2. Share the claim link with{" "}
                  <span className="text-white/75">{details.displayName}</span>.
                </p>
                <p>3. They claim it to their wallet. Done.</p>
              </div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="space-y-2.5"
              >
                <Link
                  href={createUrl}
                  className="accent-gradient inline-flex w-full items-center justify-center rounded-[var(--radius)] px-6 py-3.5 text-base font-medium transition hover:scale-[1.02]"
                >
                  Pay {details.amountUsdc} USDC →
                </Link>
                <p className="text-xs text-white/35">
                  No wallet setup needed for you or the recipient
                </p>
              </motion.div>
            </>
          ) : null}
        </GlassCard>
      </motion.div>
    </AppShell>
  );
}
