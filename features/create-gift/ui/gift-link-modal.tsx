"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { FaLink } from "react-icons/fa";
import type { ShareLinkItem } from "../model/share-links";

type GiftLinkModalProps = {
  open: boolean;
  link: string;
  statusLink: string;
  paymentIdHash: string | null;
  copied: boolean;
  reclaimAvailable: boolean;
  reclaiming: boolean;
  reclaimCountdownLabel: string | null;
  shareLinks: ShareLinkItem[];
  recipientHint?: string;
  onClose: () => void;
  onCopy: () => void;
  onReclaim: () => void;
  onShareClick: (label: string, href: string | null) => void;
};

export function GiftLinkModal({
  open,
  link,
  statusLink,
  paymentIdHash,
  copied,
  reclaimAvailable,
  reclaiming,
  reclaimCountdownLabel,
  shareLinks,
  recipientHint,
  onClose,
  onCopy,
  onReclaim,
  onShareClick,
}: GiftLinkModalProps) {
  return (
    <AnimatePresence>
      {open && link ? (
        <>
          <motion.button
            type="button"
            aria-label="Close gift link dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[55] bg-[var(--bg)]/88 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="gift-link-modal-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="fixed inset-0 z-[56] flex items-center justify-center px-4 py-8"
          >
            <div
              className="glass-card relative max-h-[calc(100svh-3rem)] w-full max-w-[420px] overflow-y-auto p-5 text-left shadow-2xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <motion.button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 text-2xl leading-none text-white/50 transition hover:text-white"
              >
                ×
              </motion.button>

              <p
                id="gift-link-modal-title"
                className="soft-text pr-8 text-xs uppercase tracking-[0.18em]"
              >
                Gift link
              </p>
              <p className="mt-2 text-sm text-emerald-300/90">
                {recipientHint
                  ? `Gift funded — share this claim link with ${recipientHint}.`
                  : "Gift funded — share this link with the recipient."}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="app-link inline-flex items-center gap-2 text-sm font-medium"
                >
                  <FaLink className="h-3.5 w-3.5 shrink-0" />
                  Open gift link
                </a>
                {paymentIdHash ? (
                  <Link
                    href={statusLink}
                    className="app-link text-sm font-medium"
                  >
                    Track public status
                  </Link>
                ) : null}
              </div>

              <button
                type="button"
                onClick={onCopy}
                className="app-btn-secondary mt-4 w-full px-4 py-2.5 text-sm font-medium sm:w-auto"
              >
                {copied ? "Copied ✓" : "Copy link"}
              </button>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3"
              >
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
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 }}
                className="mt-4 flex justify-center"
              >
                <div className="rounded-xl bg-white p-3">
                  <QRCodeSVG
                    value={link}
                    size={132}
                    imageSettings={{
                      src: "/linkcash-icon-512.png",
                      height: 28,
                      width: 28,
                      excavate: true,
                    }}
                  />
                </div>
              </motion.div>

              {reclaimAvailable ? (
                <button
                  type="button"
                  onClick={onReclaim}
                  disabled={reclaiming}
                  className="app-btn-secondary mt-4 w-full px-4 py-2 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {reclaiming ? "Reclaiming..." : "Reclaim expired gift"}
                </button>
              ) : (
                <p className="mt-4 text-xs text-[var(--muted)]">
                  {reclaimCountdownLabel
                    ? `Reclaim opens in ${reclaimCountdownLabel} (after expiry).`
                    : "Reclaim is available only after the gift expires."}
                </p>
              )}

              <button
                type="button"
                onClick={onClose}
                className="accent-gradient mt-5 w-full rounded-[var(--radius)] px-5 py-3 text-sm font-medium"
              >
                Done
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
