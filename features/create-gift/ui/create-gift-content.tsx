"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { FaLink } from "react-icons/fa";
import AppShell from "@/components/ui/app-shell";
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
    authError,
    bootstrapError,
    walletSyncing,
    hasGiftContractConfig,
    link,
    paymentIdHash,
    reclaimAvailable,
    reclaimCountdownLabel,
    statusLink,
    copied,
    amount,
    expiresInHours,
    senderDisplayName,
    giftMessage,
    creating,
    reclaiming,
    status,
    createCopyVariant,
    shareLinks,
    setAmount,
    setExpiresInHours,
    setSenderDisplayName,
    setGiftMessage,
    onCreate,
    onReclaim,
    onCopy,
    onShareClick,
  } = useCreateGift();

  return (
    <AppShell className="flex items-center justify-center px-4 py-8 sm:px-5 sm:py-10">
      <GlassCard className="relative z-[1] max-w-[460px] space-y-6 p-5 text-center sm:p-8">
        <div className="flex justify-start">
          <MainMenu />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <p className="app-chain-badge mx-auto mb-3">
            {ARC_TESTNET.chainName}
          </p>
          <h1 className="app-heading text-3xl leading-tight sm:text-5xl">
            Send crypto like a message
          </h1>
          <p className="soft-text mt-3 text-base">
            {createCopyVariant === "b"
              ? "Sign in, fund, and share in seconds."
              : "No wallet setup needed. Just a link."}
          </p>
        </motion.div>

        {authenticated ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
              className="app-panel app-field p-4 text-left"
            >
              <label htmlFor="senderDisplayName" className="app-section-label">
                Your name (shown to recipient)
              </label>
              <input
                id="senderDisplayName"
                type="text"
                maxLength={40}
                value={senderDisplayName}
                onChange={(event) => setSenderDisplayName(event.target.value)}
                placeholder="Alex K."
                className="app-input"
                autoComplete="name"
              />
              <p className="mt-2 text-xs text-white/55">
                Prefilled from Google — you can edit before sending.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut", delay: 0.08 }}
              className="app-panel app-field p-4 text-left"
            >
              <label htmlFor="giftMessage" className="app-section-label">
                Personal message (optional)
              </label>
              <textarea
                id="giftMessage"
                maxLength={200}
                rows={3}
                value={giftMessage}
                onChange={(event) => setGiftMessage(event.target.value)}
                placeholder="Happy birthday! 🎉"
                className="app-input resize-none"
              />
            </motion.div>
          </>
        ) : null}

        {bootstrapError && (
          <p className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">
            {bootstrapError}
          </p>
        )}

        {!ready ? (
          <p className="text-sm text-white/70">Loading wallet...</p>
        ) : !authenticated ? (
          <div className="space-y-2">
            <motion.button
              type="button"
              onClick={() => void login()}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="accent-gradient w-full rounded-[var(--radius)] px-5 py-3.5 text-base sm:px-6 sm:py-4 sm:text-lg"
            >
              Sign in with Google
            </motion.button>
            <OAuthNavHint />
            {authError && (
              <p className="text-center text-sm text-rose-400">{authError}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <WalletBackupWarning />
            {!hasGiftContractConfig && (
              <p className="rounded-xl border border-amber-500/40 bg-amber-950/35 p-3 text-left text-xs text-amber-100">
                Set <code className="text-amber-50">NEXT_PUBLIC_CONTRACT_ADDRESS</code>{" "}
                (same value as <code className="text-amber-50">CONTRACT_ADDRESS</code>) so
                the app can build the onchain gift funding batch.
              </p>
            )}
            {hasGiftContractConfig && (
              <p className="rounded-xl border border-white/10 bg-black/25 p-3 text-left text-xs text-white/75">
                One Circle confirmation approves USDC for the gift contract and
                funds the gift on Arc in a single batch (SCA wallet).
              </p>
            )}
            <motion.button
              type="button"
              onClick={() => void onCreate()}
              disabled={
                creating ||
                !senderWalletAddress ||
                walletSyncing ||
                !hasGiftContractConfig
              }
              whileHover={{ scale: creating ? 1 : 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="accent-gradient w-full rounded-[var(--radius)] px-5 py-3.5 text-base disabled:opacity-65 sm:px-6 sm:py-4 sm:text-lg"
            >
            {creating
              ? "Funding gift..."
              : walletSyncing
                ? "Preparing wallet..."
                : createCopyVariant === "b"
                  ? "Fund gift link"
                  : "Create gift"}
          </motion.button>
          </div>
        )}

        {authenticated ? (
          <>
        <div className="app-panel app-field p-4 text-left">
          <label
            htmlFor="amount"
            className="app-section-label"
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
            className="app-input"
          />
        </div>
        <div className="app-panel app-field p-4 text-left">
          <label
            htmlFor="expiresInHours"
            className="app-section-label"
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
            className="app-input"
          />
          {senderWalletAddress ? (
            <p className="mt-2 break-all text-xs text-white/60">
              Refund wallet: {senderWalletAddress}
            </p>
          ) : (
            <p className="mt-2 text-xs text-amber-300">
              {walletSyncing
                ? "Circle wallet is finishing setup on Arc Testnet..."
                : "Wallet address is not ready yet. Wait a few seconds or sign out and sign in again."}
            </p>
          )}
        </div>
          </>
        ) : (
          <p className="soft-text text-sm">
            Sign in with Google to set amount and create a gift link.
          </p>
        )}

        <AnimatePresence>
          {authenticated && link && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="app-panel p-4 text-left"
            >
              <p className="soft-text text-xs uppercase tracking-[0.18em]">
                Gift link
              </p>
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="app-link mt-2 inline-flex items-center gap-2 text-sm font-medium"
              >
                <FaLink className="h-3.5 w-3.5 shrink-0" />
                Open gift link
              </a>
              {paymentIdHash && (
                <Link
                  href={statusLink}
                  className="app-link mt-2 inline-flex items-center gap-2 text-sm font-medium"
                >
                  Track public status
                </Link>
              )}
              <button
                type="button"
                onClick={onCopy}
                className="app-btn-secondary mt-4 px-4 py-2 text-sm font-medium"
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
                    className="app-btn-secondary inline-flex h-10 items-center justify-center px-3 py-2 text-center text-xs font-medium"
                  >
                    <item.icon
                      className="h-5 w-5 shrink-0"
                      style={{ color: item.iconColor }}
                    />
                  </button>
                ))}
              </div>
              {reclaimAvailable ? (
                <button
                  type="button"
                  onClick={onReclaim}
                  disabled={reclaiming}
                  className="app-btn-secondary mt-2 px-4 py-2 text-sm font-medium disabled:opacity-65"
                >
                  {reclaiming ? "Reclaiming..." : "Reclaim expired gift"}
                </button>
              ) : (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {reclaimCountdownLabel
                    ? `Reclaim opens in ${reclaimCountdownLabel} (after expiry).`
                    : "Reclaim is available only after the gift expires."}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {status && <p className="break-all text-sm text-white/75">{status}</p>}
        {authenticated && authError && (
          <p className="text-center text-sm text-rose-400">{authError}</p>
        )}

        <div className="text-center">
          <Link
            href="/gifts"
            className="app-link text-sm"
          >
            View sender dashboard
          </Link>
        </div>
      </GlassCard>
    </AppShell>
  );
}

