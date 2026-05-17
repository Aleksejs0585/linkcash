"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function HelpManual() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="How LinkCash works"
        className="fixed right-4 top-[12px] z-[60] inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border2)] bg-[var(--bg2)] text-lg font-semibold text-[var(--text)] shadow-lg transition hover:scale-105 hover:border-[var(--accent)] hover:bg-[var(--bg3)]"
      >
        ?
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.button
              type="button"
              aria-label="Close help"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[58] bg-black/50"
            />

            {/* Scrollable container pinned just below the nav */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-x-0 top-[64px] z-[59] flex justify-center overflow-y-auto px-4 pb-8"
              style={{ maxHeight: "calc(100vh - 64px)" }}
            >
              <aside
                role="dialog"
                aria-modal="true"
                aria-labelledby="help-title"
                className="glass-card relative mt-3 w-full max-w-[480px] p-5 text-left text-sm shadow-2xl sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="absolute right-4 top-4 text-2xl leading-none text-white/40 transition hover:text-white"
                >
                  ×
                </button>

                <h2 id="help-title" className="app-heading pr-8 text-base">
                  How LinkCash works
                </h2>

                <div className="mt-3 space-y-3 text-white/80">
                  <p>
                    <span className="font-semibold text-white">
                      1) Where the funds come from:
                    </span>{" "}
                    When you create a gift, one Circle confirmation runs a batch:
                    approve USDC for the gift contract and fund the gift in the
                    same onchain step. USDC comes from your Circle wallet; the
                    network fee for that batch is paid from that wallet.
                  </p>
                  <p>
                    <span className="font-semibold text-white">
                      2) What the link does:
                    </span>{" "}
                    the URL path stores only a hash, while the secret is kept
                    after <code>#</code>. This lets the recipient prove claim
                    ownership.
                  </p>
                  <p>
                    <span className="font-semibold text-white">
                      3) Where funds are received:
                    </span>{" "}
                    Open the gift link and tap unwrap once: if you are not signed
                    in, Google sign-in runs first, then the claim completes in the
                    same flow. After sign-in, the recipient has a user-controlled
                    wallet on Arc Testnet and USDC is sent to that address.
                  </p>
                  <p>
                    <span className="font-semibold text-white">
                      4) Who pays gas:
                    </span>{" "}
                    the sender pays the network fee for the create-gift batch from
                    their Circle wallet. Claiming uses the backend relayer for
                    gas, so the recipient does not need initial balance for that
                    transaction.
                  </p>
                  <p>
                    <span className="font-semibold text-white">
                      5) How to verify:
                    </span>{" "}
                    after a successful claim, open the Arc Explorer link and
                    compare the recipient address with the wallet address shown
                    in this app after sign-in.
                  </p>
                  <p>
                    <span className="font-semibold text-white">
                      6) Where to view your wallet:
                    </span>{" "}
                    open <code>/wallet</code> to see your Arc Testnet address,
                    USDC balance, and explorer link.
                  </p>
                  <p>
                    <span className="font-semibold text-white">
                      7) Google sign-in and navigation:
                    </span>{" "}
                    when the browser navigates to Google for OAuth, the system
                    Back button only moves within Google&apos;s history. LinkCash
                    cannot override that. Use{" "}
                    <span className="font-medium text-white/90">Cancel</span> on
                    Google, switch back to your LinkCash tab, or complete
                    sign-in. Use the in-app{" "}
                    <span className="font-medium text-white/90">Menu</span>{" "}
                    for Home or the product site link.
                  </p>
                </div>
              </aside>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
