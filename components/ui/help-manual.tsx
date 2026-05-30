"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const TOGGLE_EVENT = "toggle-help";

export function HelpTrigger({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(TOGGLE_EVENT))}
      aria-label="How LinkCash works"
      className={
        className ??
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border2)] bg-[var(--bg2)] text-base font-semibold text-[var(--text)] transition hover:border-[var(--accent)] hover:bg-[var(--bg3)]"
      }
    >
      ?
    </button>
  );
}

function InfoRow({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-lg leading-none">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
          {title}
        </p>
        <div className="mt-1 text-sm leading-relaxed text-white/75">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function HelpManual() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen((v) => !v);
    window.addEventListener(TOGGLE_EVENT, handler);
    return () => window.removeEventListener(TOGGLE_EVENT, handler);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[58] bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Bottom sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed bottom-0 left-1/2 z-[59] w-full max-w-[520px] -translate-x-1/2 overflow-y-auto rounded-t-2xl border border-white/10 bg-[#111318] px-5 pb-10 pt-5 shadow-2xl"
            style={{ maxHeight: "88vh" }}
          >
            {/* Drag handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />

            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white/90">
                How LinkCash works
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-sm text-white/50 transition hover:bg-white/15 hover:text-white/80"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              <InfoRow icon="💸" title="Sending a gift">
                One Circle confirmation runs a <span className="text-white/90 font-medium">batch transaction</span>:
                it approves USDC for the gift contract and funds the gift in a single on-chain step.
                The network fee comes from your Circle wallet — the recipient pays nothing.
              </InfoRow>

              <div className="h-px bg-white/8" />

              <InfoRow icon="🔗" title="How the link works">
                The URL path stores only a <span className="text-white/90 font-medium">hash</span>.
                The secret that unlocks the funds lives after the{" "}
                <code className="rounded bg-white/10 px-1 py-0.5 text-xs text-white/80">#</code>{" "}
                — it never reaches the server, so only the person with the link can claim.
              </InfoRow>

              <div className="h-px bg-white/8" />

              <InfoRow icon="🎁" title="Claiming a gift">
                Open the gift link and tap <span className="text-white/90 font-medium">Unwrap</span>.
                If you&apos;re not signed in, sign-in runs first — then the claim completes
                automatically in the same flow. A wallet on Arc Testnet is created for you instantly;
                USDC lands there right away.
              </InfoRow>

              <div className="h-px bg-white/8" />

              <InfoRow icon="⛽" title="Who pays gas">
                <ul className="mt-1 space-y-1.5">
                  {[
                    "Sender pays the fee for the create-gift batch from their Circle wallet.",
                    "Claiming is relayed by the backend — the recipient needs zero initial balance.",
                  ].map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
                        {i + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </InfoRow>

              <div className="h-px bg-white/8" />

              <InfoRow icon="🔍" title="Verifying a transaction">
                After a successful claim, open the Arc Explorer link and compare the recipient
                address with the wallet address shown in the app after sign-in.
                Everything is on-chain and publicly verifiable.
              </InfoRow>

              <div className="h-px bg-white/8" />

              <InfoRow icon="👛" title="Viewing your wallet">
                Go to <code className="rounded bg-white/10 px-1 py-0.5 text-xs text-white/80">/wallet</code> to
                see your Arc Testnet address, USDC balance, and a direct link to the explorer.
              </InfoRow>

              <div className="h-px bg-white/8" />

              <InfoRow icon="🔐" title="Sign-in & navigation">
                Google sign-in opens a new OAuth page — the browser Back button moves within
                Google&apos;s history, not back to the app. To return:{" "}
                tap <span className="font-medium text-white/90">Cancel</span> on Google,
                switch back to your LinkCash tab, or complete sign-in.
                Email OTP stays on the same page. Use the in-app{" "}
                <span className="font-medium text-white/90">Menu</span> to navigate home.
              </InfoRow>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
