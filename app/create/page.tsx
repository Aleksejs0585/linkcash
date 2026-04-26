"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GlassCard from "../../components/ui/glass-card";
import { generateHash, generateLink, generateSecret } from "../../utils";

export default function CreateGiftPage() {
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  const onCreate = () => {
    const secret = generateSecret();
    const hash = generateHash(secret);
    const giftLink = generateLink(hash, secret);
    setLink(giftLink);
    setCopied(false);
  };

  const onCopy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center px-5 py-10 text-white">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(139,92,246,0.2)_0%,_rgba(59,130,246,0.12)_35%,_transparent_70%)] blur-3xl" />

      <GlassCard className="relative max-w-[420px] space-y-7 p-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Send crypto like a message
          </h1>
          <p className="soft-text mt-3 text-base">
            No wallet needed. Just a link.
          </p>
        </motion.div>

        <motion.button
          type="button"
          onClick={onCreate}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          className="accent-gradient w-full rounded-2xl px-6 py-4 text-lg font-semibold shadow-[0_14px_36px_rgba(76,85,255,0.38)] transition"
        >
          Create Gift
        </motion.button>

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
              <p className="mt-2 break-all text-sm text-white/90">{link}</p>
              <button
                type="button"
                onClick={onCopy}
                className="mt-4 rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/90 transition hover:border-white/30 hover:bg-white/5"
              >
                {copied ? "Copied ✓" : "Copy link"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </main>
  );
}
