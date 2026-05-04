"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { FaLink } from "react-icons/fa";
import GlassCard from "@/components/ui/glass-card";
import MainMenu from "@/components/ui/main-menu";
import OAuthNavHint from "@/components/ui/oauth-nav-hint";
import { WalletBackupWarning } from "@/components/ui/wallet-backup-warning";
import { ARC_TESTNET } from "@/utils";
import { useCreateGift } from "../model/use-create-gift";

export function CreateGiftContent() {
  const {
    ready,
    authenticated,
    login,
    senderWalletAddress,
    link,
    paymentIdHash,
    statusLink,
    copied,
    amount,
    expiresInHours,
    creating,
    reclaiming,
    status,
    createCopyVariant,
    shareLinks,
    setAmount,
    setExpiresInHours,
    onCreate,
    onReclaim,
    onCopy,
    onShareClick,
  } = useCreateGift();

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-8 text-white sm:px-5 sm:py-10">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(139,92,246,0.2)_0%,_rgba(59,130,246,0.12)_35%,_transparent_70%)] blur-3xl" />

      <GlassCard className="relative max-w-[460px] space-y-6 p-5 text-center sm:p-8">
        <div className="flex justify-start">
          <MainMenu />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <p className="mx-auto mb-3 inline-flex rounded-full border border-white/15 px-3 py-1 text-xs text-white/75">
            {ARC_TESTNET.chainName}
          </p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Send crypto like a message
          </h1>
          <p className="soft-text mt-3 text-base">
            {createCopyVariant === "b"
              ? "Sign in, fund, and share in seconds."
              : "No wallet setup needed. Just a link."}
          </p>
        </motion.div>

        {!ready ? (
          <p className="text-sm text-white/70">Loading wallet...</p>
        ) : !authenticated ? (
          <div className="space-y-2">
            <motion.button
              type="button"
              onClick={login}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="accent-gradient w-full rounded-2xl px-5 py-3.5 text-base font-semibold shadow-[0_14px_36px_rgba(76,85,255,0.38)] transition sm:px-6 sm:py-4 sm:text-lg"
            >
              Sign in to create gift
            </motion.button>
            <OAuthNavHint />
          </div>
        ) : (
          <div className="space-y-3">
            <WalletBackupWarning />
          <motion.button
            type="button"
            onClick={onCreate}
            disabled={creating || !senderWalletAddress}
            whileHover={{ scale: creating ? 1 : 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="accent-gradient w-full rounded-2xl px-5 py-3.5 text-base font-semibold shadow-[0_14px_36px_rgba(76,85,255,0.38)] transition disabled:opacity-65 sm:px-6 sm:py-4 sm:text-lg"
          >
            {creating
              ? "Funding gift..."
              : createCopyVariant === "b"
                ? "Fund gift link"
                : "Create gift"}
          </motion.button>
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left">
          <label
            htmlFor="amount"
            className="soft-text text-xs uppercase tracking-[0.15em]"
          >
            Gift amount (USDC)
          </label>
          <input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none ring-blue-500/40 focus:ring-2"
          />
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left">
          <label
            htmlFor="expiresInHours"
            className="soft-text text-xs uppercase tracking-[0.15em]"
          >
            Expiry (hours)
          </label>
          <input
            id="expiresInHours"
            type="number"
            min="1"
            max="720"
            step="1"
            value={expiresInHours}
            onChange={(event) => setExpiresInHours(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none ring-blue-500/40 focus:ring-2"
          />
          {senderWalletAddress ? (
            <p className="mt-2 break-all text-xs text-white/60">
              Refund wallet: {senderWalletAddress}
            </p>
          ) : (
            <p className="mt-2 text-xs text-amber-300">
              Embedded sender wallet not found yet.
            </p>
          )}
        </div>

        <AnimatePresence>
          {link && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="rounded-2xl border border-white/10 bg-black/35 p-4 text-left"
            >
              <p className="soft-text text-xs uppercase tracking-[0.18em]">
                Gift link
              </p>
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-blue-300 underline decoration-white/20 underline-offset-4 transition hover:text-blue-200"
              >
                <FaLink className="h-3.5 w-3.5 shrink-0" />
                Open gift link
              </a>
              {paymentIdHash && (
                <Link
                  href={statusLink}
                  className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-violet-300 underline decoration-white/20 underline-offset-4 transition hover:text-violet-200"
                >
                  Track public status
                </Link>
              )}
              <button
                type="button"
                onClick={onCopy}
                className="mt-4 rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/90 transition hover:border-white/30 hover:bg-white/5"
              >
                {copied ? "Copied ✓" : "Copy link"}
              </button>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {shareLinks.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => onShareClick(item.label, item.href)}
                    aria-label={item.label}
                    title={
                      item.href
                        ? item.label
                        : `${item.label} (requires configuration)`
                    }
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 px-3 py-2 text-center text-xs font-medium text-white/90 transition hover:border-white/30 hover:bg-white/5"
                  >
                    <item.icon
                      className="h-5 w-5 shrink-0"
                      style={{ color: item.iconColor }}
                    />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={onReclaim}
                disabled={reclaiming}
                className="mt-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/90 transition hover:border-white/30 hover:bg-white/5 disabled:opacity-65"
              >
                {reclaiming ? "Reclaiming..." : "Reclaim expired gift"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {status && <p className="break-all text-sm text-white/75">{status}</p>}

        <div className="text-center">
          <Link
            href="/gifts"
            className="text-sm text-white/70 underline decoration-white/25 underline-offset-4"
          >
            View sender dashboard
          </Link>
        </div>
      </GlassCard>
    </main>
  );
}

