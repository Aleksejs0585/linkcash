"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import AppShell from "@/components/ui/app-shell";
import GlassCard from "@/components/ui/glass-card";
import MainMenu from "@/components/ui/main-menu";
import { HelpTrigger } from "@/components/ui/help-manual";
import OAuthNavHint from "@/components/ui/oauth-nav-hint";
import { WalletBackupWarning } from "@/components/ui/wallet-backup-warning";
import { ARC_TESTNET } from "@/utils";
import { useCreateGift } from "../model/use-create-gift";
import { GiftLinkModal } from "./gift-link-modal";

const FIELD_TRANSITION = { duration: 0.3, ease: "easeOut" } as const;
const FADE_IN = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } } as const;

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
    giftLinkModalOpen,
    openGiftLinkModal,
    closeGiftLinkModal,
  } = useCreateGift();

  return (
    <AppShell className="flex items-center justify-center px-4 py-8 sm:px-5 sm:py-10">
      <GiftLinkModal
        open={giftLinkModalOpen}
        link={link}
        statusLink={statusLink}
        paymentIdHash={paymentIdHash}
        copied={copied}
        reclaimAvailable={reclaimAvailable}
        reclaiming={reclaiming}
        reclaimCountdownLabel={reclaimCountdownLabel}
        shareLinks={shareLinks}
        onClose={closeGiftLinkModal}
        onCopy={onCopy}
        onReclaim={() => void onReclaim()}
        onShareClick={onShareClick}
      />
      <GlassCard className="relative z-[1] max-w-[460px] space-y-6 p-5 text-center sm:p-8">
        <div className="flex items-center justify-between">
          <MainMenu />
          <HelpTrigger />
        </div>

        {/* Header */}
        <motion.div {...FADE_IN} transition={FIELD_TRANSITION}>
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

        {/* Form fields — all visible before the action button */}
        {authenticated ? (
          <>
            <motion.div
              {...FADE_IN}
              transition={{ ...FIELD_TRANSITION, delay: 0.05 }}
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
                placeholder="Your name or email"
                className="app-input"
                autoComplete="name"
              />
              <p className="mt-2 text-xs text-white/55">
                Prefilled with your Google email — you can change it before sending.
              </p>
            </motion.div>

            <motion.div
              {...FADE_IN}
              transition={{ ...FIELD_TRANSITION, delay: 0.08 }}
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

            <motion.div
              {...FADE_IN}
              transition={{ ...FIELD_TRANSITION, delay: 0.1 }}
              className="app-panel app-field p-4 text-left"
            >
              <label htmlFor="amount" className="app-section-label">
                Gift amount (USDC)
              </label>
              <div className="mb-2 flex gap-2">
                {["5", "10", "25", "50"].map((preset) => (
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
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="app-input"
              />
            </motion.div>

            <motion.div
              {...FADE_IN}
              transition={{ ...FIELD_TRANSITION, delay: 0.12 }}
              className="app-panel app-field p-4 text-left"
            >
              <label htmlFor="expiresInHours" className="app-section-label">
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
            </motion.div>
          </>
        ) : ready ? (
          <p className="soft-text text-sm">
            Sign in with Google to set amount and create a gift link.
          </p>
        ) : null}

        {bootstrapError && (
          <p className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">
            {bootstrapError}
          </p>
        )}

        {/* Live preview */}
        {authenticated && (
          <motion.div
            {...FADE_IN}
            transition={{ ...FIELD_TRANSITION, delay: 0.15 }}
            className="app-panel p-4 text-left"
          >
            <p className="app-section-label mb-3">Preview for recipient</p>
            <div className="rounded-xl border border-white/8 bg-white/4 p-4 text-center space-y-1.5">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg">
                🎁
              </div>
              <p className="text-xs text-white/50">Gift from</p>
              <p className="text-sm font-semibold text-white/90 truncate">
                {senderDisplayName || <span className="text-white/30">Your name</span>}
              </p>
              {giftMessage ? (
                <p className="text-xs italic text-white/55 line-clamp-2">&quot;{giftMessage}&quot;</p>
              ) : null}
              <p className="text-2xl font-bold tracking-tight">
                {amount || "0"} <span className="text-base font-normal text-white/50">USDC</span>
              </p>
              <p className="text-xs text-white/35">{ARC_TESTNET.chainName} · expires in {expiresInHours}h</p>
            </div>
          </motion.div>
        )}

        {/* Action area */}
        {!ready ? (
          <p className="text-sm text-white/70">Loading wallet...</p>
        ) : !authenticated ? (
          <motion.div className="space-y-2">
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
          </motion.div>
        ) : (
          <motion.div className="space-y-3">
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
              className="accent-gradient w-full rounded-[var(--radius)] px-5 py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed sm:px-6 sm:py-4 sm:text-lg"
            >
              {creating
                ? "Funding gift..."
                : walletSyncing
                  ? "Preparing wallet..."
                  : createCopyVariant === "b"
                    ? "Fund gift link"
                    : "Create gift"}
            </motion.button>
            {link && !giftLinkModalOpen ? (
              <button
                type="button"
                onClick={openGiftLinkModal}
                className="app-btn-secondary w-full px-4 py-2.5 text-sm font-medium"
              >
                View gift link & share
              </button>
            ) : null}
          </motion.div>
        )}

        {status && <p className="break-all text-sm text-white/75">{status}</p>}
        {authenticated && authError && (
          <p className="text-center text-sm text-rose-400">{authError}</p>
        )}

        <motion.div className="text-center">
          <Link href="/gifts" className="app-link text-sm">
            View sender dashboard
          </Link>
        </motion.div>
      </GlassCard>
    </AppShell>
  );
}
