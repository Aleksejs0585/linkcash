import Link from "next/link";
import GlassCard from "@/components/ui/glass-card";
import { parseGiftHashInput } from "@/entities/gift/server/gift-validation";
import { getPublicGiftStatus } from "@/entities/gift/server/gift-status-service";
import { ARC_TESTNET, getArcExplorerTxUrl } from "@/utils";

const statusStyles = {
  active: "text-emerald-300 border-emerald-300/30 bg-emerald-400/10",
  claimed: "text-blue-300 border-blue-300/30 bg-blue-400/10",
  expired: "text-amber-300 border-amber-300/30 bg-amber-400/10",
  reclaimed: "text-violet-300 border-violet-300/30 bg-violet-400/10",
  not_found: "text-rose-300 border-rose-300/30 bg-rose-400/10",
} as const;

function statusLabel(status: keyof typeof statusStyles) {
  switch (status) {
    case "active":
      return "Active";
    case "claimed":
      return "Claimed";
    case "expired":
      return "Expired";
    case "reclaimed":
      return "Reclaimed";
    default:
      return "Not found";
  }
}

export default async function GiftStatusPage({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;

  let normalizedHash: string | null = null;
  try {
    normalizedHash = parseGiftHashInput(hash).hash;
  } catch {}

  const result = normalizedHash
    ? await getPublicGiftStatus(normalizedHash)
    : {
        ok: false,
        paymentIdHash: hash,
        status: "not_found" as const,
        whereFunds: "Invalid gift hash format.",
        tx: {},
        timeline: [],
        error: "Gift hash is not a valid bytes32 value.",
      };
  const visibleHash = normalizedHash ?? hash;

  return (
    <main className="relative min-h-screen px-5 py-10 text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(139,92,246,0.2)_0%,_rgba(59,130,246,0.12)_40%,_transparent_75%)] blur-3xl" />

      <div className="relative mx-auto w-full max-w-3xl space-y-5">
        <GlassCard className="space-y-4 p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-white/60">
            Public gift status · {ARC_TESTNET.chainName}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Where did the funds go?</h1>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${statusStyles[result.status]}`}
            >
              {statusLabel(result.status)}
            </span>
            <p className="text-xs text-white/60 break-all">hash: {visibleHash}</p>
          </div>

          <p className="soft-text text-sm">{result.whereFunds}</p>

          {result.ok && (
            <div className="grid gap-2 text-sm text-white/85 sm:grid-cols-2">
              <p>
                <span className="text-white/60">Amount:</span>{" "}
                {result.amountUsdc ? `${result.amountUsdc} USDC` : "n/a"}
              </p>
              <p>
                <span className="text-white/60">Expires:</span>{" "}
                {result.expiresAt
                  ? new Date(result.expiresAt * 1000).toLocaleString()
                  : "n/a"}
              </p>
            </div>
          )}

          {!result.ok && result.error && (
            <p className="text-sm text-rose-300">{result.error}</p>
          )}
        </GlassCard>

        <GlassCard className="space-y-3 p-6">
          <h2 className="text-lg font-semibold">Status timeline</h2>
          {result.timeline.length === 0 ? (
            <p className="text-sm text-white/70">
              Timeline is unavailable for this hash.
            </p>
          ) : (
            <div className="space-y-2">
              {result.timeline.map((step) => (
                <div
                  key={step.id}
                  className="rounded-xl border border-white/10 bg-black/25 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{step.title}</p>
                    <span className="text-[11px] uppercase tracking-[0.1em] text-white/55">
                      {step.state}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/70">{step.description}</p>
                  {step.timestamp && (
                    <p className="mt-1 text-xs text-white/55">
                      {new Date(step.timestamp).toLocaleString()}
                    </p>
                  )}
                  {step.explorerUrl && step.txHash && (
                    <a
                      href={step.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block break-all text-xs text-blue-300 underline decoration-white/30 underline-offset-4 hover:text-blue-200"
                    >
                      {step.txHash}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard className="space-y-3 p-6">
          <h2 className="text-lg font-semibold">Explorer links</h2>
          <div className="flex flex-wrap gap-2">
            {result.tx.fundingTxHash && (
              <a
                href={getArcExplorerTxUrl(result.tx.fundingTxHash)}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-blue-300 transition hover:bg-white/5"
              >
                Funding tx
              </a>
            )}
            {result.tx.claimTxHash && (
              <a
                href={getArcExplorerTxUrl(result.tx.claimTxHash)}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-blue-300 transition hover:bg-white/5"
              >
                Claim tx
              </a>
            )}
            {result.tx.reclaimTxHash && (
              <a
                href={getArcExplorerTxUrl(result.tx.reclaimTxHash)}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-violet-300 transition hover:bg-white/5"
              >
                Reclaim tx
              </a>
            )}
            {!result.tx.fundingTxHash &&
              !result.tx.claimTxHash &&
              !result.tx.reclaimTxHash && (
                <p className="text-sm text-white/65">
                  No transaction links available yet.
                </p>
              )}
          </div>
        </GlassCard>

        <div className="text-center">
          <Link
            href="/create"
            className="text-sm text-white/70 underline decoration-white/25 underline-offset-4"
          >
            Back to create gift
          </Link>
        </div>
      </div>
    </main>
  );
}

