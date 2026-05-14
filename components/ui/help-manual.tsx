"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function HelpManual() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="How LinkCash works"
        className="fixed right-4 top-4 z-[60] inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-lg font-semibold text-white shadow-lg backdrop-blur transition hover:scale-105 hover:bg-black/55"
      >
        ?
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Close help"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[58] bg-black/40"
            />

            <motion.aside
              initial={{ opacity: 0, y: -10, x: 16 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, y: -10, x: 16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed right-4 top-16 z-[59] w-[min(92vw,420px)] rounded-2xl border border-white/10 bg-[#11131bcc] p-5 text-left text-sm text-white/90 shadow-2xl backdrop-blur-xl"
            >
              <h2 className="text-base font-semibold text-white">
                How LinkCash works
              </h2>

              <div className="mt-3 space-y-3 text-white/80">
                <p className="rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-50">
                  <span className="font-semibold text-white">Auth change:</span>{" "}
                  LinkCash no longer uses Privy. Sign in with the same Google
                  account via Circle to get a new wallet; old Privy sessions and
                  addresses are not carried over—sign in again after this
                  release.
                </p>
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
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
