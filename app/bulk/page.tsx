"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import AppShell from "@/components/ui/app-shell";
import GlassCard from "@/components/ui/glass-card";
import MainMenu from "@/components/ui/main-menu";
import LoginPanel from "@/components/ui/login-panel";
import { useCircleWallet } from "@/features/circle-wallet/model/circle-wallet-provider";
import { waitForClientFundedGift } from "@/features/create-gift/lib/read-gift-on-chain";
import { formatGiftTxError } from "@/features/create-gift/lib/gift-errors";
import { generateSecret, generateHash, generateLink } from "@/utils";
import { toast } from "@/lib/client/toast";

const MAX_GIFTS = 50;

type BulkStep = "idle" | "funding" | "confirming" | "registering" | "success" | "error";

type GiftResult = {
  paymentIdHash: string;
  secret: string;
  amountUsdc: string;
  link: string;
};

type RowItem = { id: string; amount: string };

// ─── Gift link card ───────────────────────────────────────────────────────────

function GiftLinkCard({ gift, index }: { gift: GiftResult; index: number }) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(gift.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast("Copy the link manually.", "info");
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ url: gift.link, title: `${gift.amountUsdc} USDC gift` });
        return;
      } catch { /* cancelled */ }
    }
    void handleCopy();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-xs font-bold text-emerald-400">
            {gift.amountUsdc} USDC
          </span>
          <span className="text-xs text-white/35 truncate max-w-[160px]">
            #{index + 1}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setQrOpen((v) => !v)}
          className="text-xs text-white/30 transition hover:text-white/60"
        >
          {qrOpen ? "Hide QR" : "QR"}
        </button>
      </div>

      <AnimatePresence>
        {qrOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex justify-center overflow-hidden"
          >
            <div className="rounded-xl bg-white p-2 mt-1">
              <QRCodeSVG
                value={gift.link}
                size={120}
                level="H"
                imageSettings={{ src: "/linkcash-icon-512.png", height: 20, width: 20, excavate: true }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="flex-1 rounded-lg border border-white/12 bg-white/5 px-2 py-1.5 text-xs text-white/60 transition hover:border-white/25 hover:text-white/85"
        >
          {copied ? "Copied ✓" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={() => void handleShare()}
          className="flex-1 rounded-lg border border-white/12 bg-white/5 px-2 py-1.5 text-xs text-white/60 transition hover:border-white/25 hover:text-white/85"
        >
          Share →
        </button>
      </div>
    </motion.div>
  );
}

// ─── Simple tab ───────────────────────────────────────────────────────────────

function SimpleTab({
  amount,
  setAmount,
  count,
  setCount,
}: {
  amount: string;
  setAmount: (v: string) => void;
  count: number;
  setCount: (v: number) => void;
}) {
  const num = parseFloat(amount);
  const total = Number.isFinite(num) && num > 0 ? (num * count).toFixed(2) : "—";

  return (
    <div className="space-y-4">
      <div className="app-panel app-field p-4">
        <label className="app-section-label">Amount per gift (USDC)</label>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "" || /^\d*\.?\d*$/.test(v)) setAmount(v);
          }}
          className="app-input"
          placeholder="10"
        />
      </div>

      <div className="app-panel app-field p-4">
        <label className="app-section-label">Number of gifts (max {MAX_GIFTS})</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {[1, 5, 10, 25, 50].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCount(n)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                count === n
                  ? "border-white/40 bg-white/15 text-white"
                  : "border-white/12 bg-white/5 text-white/55 hover:border-white/25 hover:text-white/80"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <input
          type="text"
          inputMode="numeric"
          value={String(count)}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v)) setCount(Math.min(MAX_GIFTS, Math.max(1, v)));
          }}
          className="app-input mt-2"
        />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-4 py-3">
        <span className="text-sm text-white/50">Total</span>
        <span className="text-base font-bold text-emerald-400">{total} USDC</span>
      </div>
    </div>
  );
}

// ─── Advanced tab ─────────────────────────────────────────────────────────────

function AdvancedTab({
  rows,
  setRows,
}: {
  rows: RowItem[];
  setRows: (r: RowItem[]) => void;
}) {
  const total = rows.reduce((sum, r) => {
    const n = parseFloat(r.amount);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  const addRow = () => {
    if (rows.length >= MAX_GIFTS) return;
    setRows([...rows, { id: crypto.randomUUID(), amount: "10" }]);
  };

  const updateRow = (id: string, amount: string) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, amount } : r)));
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={row.id} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-center text-xs text-white/30">{i + 1}</span>
            <input
              type="text"
              inputMode="decimal"
              value={row.amount}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "" || /^\d*\.?\d*$/.test(v)) updateRow(row.id, v);
              }}
              className="app-input flex-1"
              placeholder="Amount USDC"
            />
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              disabled={rows.length <= 1}
              className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/40 transition hover:border-rose-500/40 hover:text-rose-400 disabled:opacity-30"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {rows.length < MAX_GIFTS && (
        <button
          type="button"
          onClick={addRow}
          className="w-full rounded-xl border border-dashed border-white/15 py-2 text-sm text-white/40 transition hover:border-white/30 hover:text-white/65"
        >
          + Add gift
        </button>
      )}

      <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 px-4 py-3">
        <span className="text-sm text-white/50">Total ({rows.length} gifts)</span>
        <span className="text-base font-bold text-emerald-400">
          {total > 0 ? total.toFixed(2) : "—"} USDC
        </span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BulkPage() {
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

  const [tab, setTab] = useState<"simple" | "advanced">("simple");

  // Simple tab state
  const [simpleAmount, setSimpleAmount] = useState("10");
  const [simpleCount, setSimpleCount] = useState(3);

  // Advanced tab state
  const [rows, setRows] = useState<RowItem[]>([
    { id: "1", amount: "10" },
    { id: "2", amount: "10" },
    { id: "3", amount: "10" },
  ]);

  const [step, setStep] = useState<BulkStep>("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [results, setResults] = useState<GiftResult[]>([]);
  const inFlightRef = useRef(false);

  const senderName = googleDisplayName?.trim() || googleEmail?.trim() || "Someone";

  // Build gift list from current tab
  const buildGiftList = (): { amountUsdc: string }[] => {
    if (tab === "simple") {
      const num = parseFloat(simpleAmount);
      if (!Number.isFinite(num) || num <= 0) return [];
      return Array.from({ length: simpleCount }, () => ({ amountUsdc: simpleAmount }));
    }
    return rows
      .map((r) => ({ amountUsdc: r.amount }))
      .filter((g) => {
        const n = parseFloat(g.amountUsdc);
        return Number.isFinite(n) && n >= 0.01;
      });
  };

  const handleCreate = async () => {
    if (inFlightRef.current || !walletAddress || !primaryWalletId || !userToken) return;

    const giftList = buildGiftList();
    if (giftList.length === 0) {
      toast("Enter a valid amount.", "error");
      return;
    }
    for (const g of giftList) {
      const n = parseFloat(g.amountUsdc);
      if (n < 0.01 || n > 10_000) {
        toast("Each gift must be between 0.01 and 10,000 USDC.", "error");
        return;
      }
    }

    inFlightRef.current = true;
    setStep("funding");
    setErrorMsg(null);
    setStatusMsg("Preparing batch transaction…");

    // Generate secrets + hashes for all gifts
    const secrets = giftList.map(() => generateSecret());
    const hashes = secrets.map((s) => generateHash(s));
    const gifts = giftList.map((g, i) => ({ ...g, paymentIdHash: hashes[i] }));

    try {
      // 1. Get Circle challenge for the whole batch
      const circleRes = await fetch("/api/circle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulkGiftBatchChallenge",
          userToken,
          walletId: primaryWalletId,
          gifts: gifts.map(({ paymentIdHash, amountUsdc }) => ({ paymentIdHash, amountUsdc })),
          expiresInHours: 24,
        }),
      });
      const circleData = (await circleRes.json()) as { challengeId?: string; error?: string };
      if (!circleRes.ok || !circleData.challengeId) {
        throw new Error(circleData.error ?? `Circle error (${circleRes.status})`);
      }

      setStatusMsg("Confirm in Circle — approve & fund all gifts in one step…");
      await executeChallenge(circleData.challengeId);

      // 2. Wait for first gift to appear on-chain (all in same tx)
      setStep("confirming");
      setStatusMsg(`Waiting for Arc confirmation (${gifts.length} gifts)…`);
      await waitForClientFundedGift({
        paymentIdHash: hashes[0],
        amountUsdc: giftList[0].amountUsdc,
        refundAddress: walletAddress,
        onProgress: (_a, _m, detail) => setStatusMsg(`Waiting for Arc… ${detail}`),
      });

      // 3. Register all gifts server-side
      setStep("registering");
      setStatusMsg("Recording gifts…");
      const syncRes = await fetch("/api/create-bulk-gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gifts: gifts.map(({ paymentIdHash, amountUsdc }) => ({ paymentIdHash, amountUsdc })),
          refundAddress: walletAddress,
          expiresInHours: 24,
          senderDisplayName: senderName,
          senderEmail: googleEmail || undefined,
        }),
      });
      if (!syncRes.ok && syncRes.status !== 207) {
        const syncData = (await syncRes.json()) as { error?: string };
        throw new Error(syncData.error ?? "Failed to register gifts.");
      }

      // 4. Build gift links client-side
      const giftResults: GiftResult[] = gifts.map((g, i) => ({
        paymentIdHash: g.paymentIdHash,
        secret: secrets[i],
        amountUsdc: g.amountUsdc,
        link: generateLink(g.paymentIdHash, secrets[i]),
      }));

      setResults(giftResults);
      setStep("success");
      setStatusMsg(null);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Batch gift creation failed.";
      setErrorMsg(formatGiftTxError(raw));
      setStep("error");
    } finally {
      inFlightRef.current = false;
    }
  };

  const handleCopyAll = async () => {
    const text = results
      .map((g, i) => `Gift ${i + 1} (${g.amountUsdc} USDC): ${g.link}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast("All links copied!", "success");
    } catch {
      toast("Copy the links manually.", "info");
    }
  };

  const isProcessing = step === "funding" || step === "confirming" || step === "registering";

  // ── Success screen ──
  if (step === "success" && results.length > 0) {
    return (
      <AppShell className="flex items-center justify-center px-4 py-8 sm:px-5 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-[1] w-full max-w-[420px] space-y-3"
        >
          <div className="flex justify-start">
            <MainMenu />
          </div>
          <GlassCard className="space-y-5 p-6">
            <div className="text-center space-y-1">
              <p className="text-3xl">🎁</p>
              <h1 className="app-heading text-xl">
                {results.length} gift{results.length !== 1 ? "s" : ""} ready!
              </h1>
              <p className="soft-text text-sm">
                Share each link with a recipient — they claim with Google sign-in, no wallet needed.
              </p>
            </div>

            {/* Campaign upsell */}
            <Link
              href="/campaign/new"
              className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-4 py-3 transition hover:border-emerald-500/40"
            >
              <div>
                <p className="text-sm font-medium text-emerald-400">Want one link for everyone?</p>
                <p className="text-xs text-white/40">Create a campaign → one URL, auto-claim, tracks emails</p>
              </div>
              <span className="shrink-0 text-emerald-400/60 text-lg">→</span>
            </Link>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {results.map((g, i) => (
                <GiftLinkCard key={g.paymentIdHash} gift={g} index={i} />
              ))}
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void handleCopyAll()}
                className="accent-gradient w-full rounded-[var(--radius)] px-5 py-3 text-sm font-medium"
              >
                Copy all links
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("idle");
                  setResults([]);
                  setErrorMsg(null);
                }}
                className="app-btn-secondary w-full px-5 py-2.5 text-sm"
              >
                Create more
              </button>
            </div>
          </GlassCard>
        </motion.div>
      </AppShell>
    );
  }

  // ── Main form ──
  return (
    <AppShell className="flex items-center justify-center px-4 py-8 sm:px-5 sm:py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-[1] w-full max-w-[420px] space-y-3"
      >
        <div className="flex justify-start">
          <MainMenu />
        </div>
        <GlassCard className="space-y-5 p-6">
          <div className="text-center space-y-1">
            <h1 className="app-heading text-2xl">Bulk gifts</h1>
            <p className="soft-text text-sm">
              Fund multiple USDC gifts in a single transaction.
            </p>
          </div>

          {!ready ? (
            <div className="flex justify-center py-8">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
            </div>
          ) : !authenticated ? (
            <div className="space-y-3">
              <p className="text-center text-sm text-white/55">
                Sign in to create bulk gifts.
              </p>
              <LoginPanel
                onGoogleLogin={() => void login()}
                onEmailLogin={loginWithEmail}
                googleLabel="Sign in with Google"
                buttonSize="large"
                authError={authError}
              />
            </div>
          ) : (
            <>
              {bootstrapError && (
                <p className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200">
                  {bootstrapError}
                </p>
              )}

              {/* Tab switcher */}
              <div className="flex rounded-xl border border-white/10 bg-white/5 p-1 gap-1">
                {(["simple", "advanced"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                      tab === t
                        ? "bg-white/12 text-white"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    {t === "simple" ? "Simple" : "Advanced"}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, x: tab === "simple" ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {tab === "simple" ? (
                    <SimpleTab
                      amount={simpleAmount}
                      setAmount={setSimpleAmount}
                      count={simpleCount}
                      setCount={setSimpleCount}
                    />
                  ) : (
                    <AdvancedTab rows={rows} setRows={setRows} />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Error */}
              {step === "error" && errorMsg && (
                <p className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-300">
                  {errorMsg}
                </p>
              )}

              {/* Processing status */}
              {isProcessing && (
                <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-4 py-3">
                  <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400" />
                  <p className="text-sm text-white/70">{statusMsg}</p>
                </div>
              )}

              <motion.button
                type="button"
                onClick={() => void handleCreate()}
                disabled={isProcessing || !walletAddress || walletSyncing}
                whileHover={{ scale: isProcessing ? 1 : 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="accent-gradient w-full rounded-[var(--radius)] px-5 py-3.5 text-base font-medium disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessing
                  ? "Processing…"
                  : walletSyncing
                  ? "Preparing wallet…"
                  : `Create ${buildGiftList().length || ""} gift${buildGiftList().length !== 1 ? "s" : ""} →`}
              </motion.button>

              <p className="text-center text-xs text-white/30">
                Max {MAX_GIFTS} gifts per batch · One Circle confirmation
              </p>
            </>
          )}

          <div className="text-center">
            <Link href="/create" className="app-link text-sm">
              Single gift instead →
            </Link>
          </div>
        </GlassCard>
      </motion.div>
    </AppShell>
  );
}
