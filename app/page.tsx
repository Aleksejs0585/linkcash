import Link from "next/link";
import { unstable_cache } from "next/cache";
import GlassCard from "../components/ui/glass-card";
import { claimAuditStore } from "@/lib/server/claim-audit-store";
import { senderGiftStore } from "@/lib/server/sender-gift-store";
import { getArcExplorerTxUrl } from "@/utils";

type TxExample = {
  txHash: string;
  label: string;
  timestamp: string;
};

async function loadLiveTxExamples(): Promise<TxExample[]> {
  const [senderEvents, claimEvents] = await Promise.all([
    senderGiftStore.readRecent(120),
    claimAuditStore.readRecent(240),
  ]);

  const funded = senderEvents
    .filter((event) => event.event === "gift_funded")
    .map((event) => ({
      txHash: event.txHash,
      label: "Gift funded by sender",
      timestamp: event.timestamp,
    }));

  const reclaimed = senderEvents
    .filter((event) => event.event === "gift_reclaimed")
    .map((event) => ({
      txHash: event.txHash,
      label: "Expired gift reclaimed",
      timestamp: event.timestamp,
    }));

  const claimed = claimEvents
    .filter((event) => event.event === "claim_success" && event.txHash)
    .map((event) => ({
      txHash: event.txHash!,
      label: "Recipient claim settled",
      timestamp: event.timestamp,
    }));

  const seen = new Set<string>();
  const merged = [...claimed, ...funded, ...reclaimed]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .filter((item) => {
      const key = item.txHash.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return merged.slice(0, 6);
}

const getCachedLiveTxExamples = unstable_cache(
  async () => loadLiveTxExamples(),
  ["landing-live-tx-examples"],
  { revalidate: 30 }
);

export default async function HomePage() {
  const txExamples = await getCachedLiveTxExamples();

  return (
    <main className="relative min-h-screen px-5 py-16 text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(139,92,246,0.2)_0%,_rgba(59,130,246,0.12)_40%,_transparent_75%)] blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-7">
        <section className="mx-auto w-full max-w-3xl text-center">
          <p className="mx-auto inline-flex rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 px-4 py-1 text-xs tracking-[0.18em] text-fuchsia-200">
            SOCIAL-FIRST CRYPTO ONBOARDING
          </p>
          <h1 className="mt-5 text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Send USDC like a message.
            <span className="rainbow-text block">No wallet setup required.</span>
          </h1>
          <p className="soft-text mx-auto mt-4 max-w-2xl text-base sm:text-lg">
            LinkCash turns a simple link into a first onchain experience.
            Recipients log in with Google/X, receive an embedded wallet, and
            claim funds gaslessly.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/create"
              className="accent-gradient inline-flex rounded-2xl px-6 py-3 text-base font-semibold shadow-[0_14px_36px_rgba(76,85,255,0.4)] transition hover:scale-[1.02]"
            >
              Create gift
            </Link>
            <Link
              href="/wallet"
              className="inline-flex rounded-2xl border border-white/15 px-6 py-3 text-base font-medium text-white/85 transition hover:bg-white/5"
            >
              Open my wallet
            </Link>
            <Link
              href="/gifts"
              className="inline-flex rounded-2xl border border-white/15 px-6 py-3 text-base font-medium text-white/85 transition hover:bg-white/5"
            >
              View sender dashboard
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <GlassCard className="space-y-2 border-fuchsia-300/25 p-5">
            <p className="text-xs uppercase tracking-[0.15em] text-fuchsia-200/80">
              Time to first claim
            </p>
            <p className="text-3xl font-semibold">{"< 60s"}</p>
            <p className="soft-text text-sm">
              Social login + embedded wallet + relayer execution.
            </p>
          </GlassCard>
          <GlassCard className="space-y-2 border-blue-300/25 p-5">
            <p className="text-xs uppercase tracking-[0.15em] text-blue-200/80">
              User friction
            </p>
            <p className="text-3xl font-semibold">Near-zero</p>
            <p className="soft-text text-sm">
              No seed phrase, no extension install, no gas setup required.
            </p>
          </GlassCard>
          <GlassCard className="space-y-2 border-emerald-300/25 p-5">
            <p className="text-xs uppercase tracking-[0.15em] text-emerald-200/80">
              Perfect for
            </p>
            <p className="text-3xl font-semibold">Growth loops</p>
            <p className="soft-text text-sm">
              Rewards, referrals, creator payouts, and activation campaigns.
            </p>
          </GlassCard>
        </section>

        <section className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold">How funds move</h2>
            <p className="soft-text mt-2 text-sm">
              Simple flow, transparent settlement, and explorer-verifiable proof.
            </p>

            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                <p className="text-sm font-medium">1) Sender funds gift contract</p>
                <p className="soft-text mt-1 text-xs">
                  USDC is transferred into the gift contract with hash + expiry.
                </p>
              </div>
              <p className="text-center text-xs text-white/50">▼</p>
              <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                <p className="text-sm font-medium">2) Recipient opens claim link</p>
                <p className="soft-text mt-1 text-xs">
                  Link contains only claim secret, not private keys.
                </p>
              </div>
              <p className="text-center text-xs text-white/50">▼</p>
              <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                <p className="text-sm font-medium">3) Relayer submits claim tx</p>
                <p className="soft-text mt-1 text-xs">
                  Claim is gasless for user, idempotent, and rate-limited.
                </p>
              </div>
              <p className="text-center text-xs text-white/50">▼</p>
              <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                <p className="text-sm font-medium">4) Funds reach recipient wallet</p>
                <p className="soft-text mt-1 text-xs">
                  Recipient can verify tx hash in explorer and use/export wallet.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/create"
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/85 transition hover:bg-white/5"
              >
                Open create flow
              </Link>
              <Link
                href="/gifts"
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-violet-300 transition hover:bg-white/5"
              >
                Track gift statuses
              </Link>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold">Live tx examples</h2>
            <p className="soft-text mt-2 text-sm">
              Latest transaction samples from claim and gift flows.
            </p>

            {txExamples.length === 0 ? (
              <p className="mt-4 text-sm text-white/70">
                No live transactions recorded yet. Once gifts are funded or
                claimed, hashes will appear here automatically.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {txExamples.map((item) => (
                  <a
                    key={`${item.txHash}-${item.timestamp}`}
                    href={getArcExplorerTxUrl(item.txHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-white/10 bg-black/20 p-3 transition hover:border-white/25 hover:bg-white/5"
                  >
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="mt-1 break-all text-xs text-blue-300">
                      {item.txHash}
                    </p>
                    <p className="mt-1 text-xs text-white/55">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </a>
                ))}
              </div>
            )}
          </GlassCard>
        </section>

        <section>
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold">FAQ: where did the funds go?</h2>
            <div className="mt-4 space-y-3 text-sm text-white/85">
              <details className="rounded-xl border border-white/10 bg-black/20 p-3">
                <summary className="cursor-pointer font-medium text-white">
                  I clicked Claim. How do I verify that funds arrived?
                </summary>
                <p className="soft-text mt-2">
                  The claim screen shows a tx hash. Open it in the explorer to
                  verify USDC transfer to your embedded wallet address.
                </p>
              </details>

              <details className="rounded-xl border border-white/10 bg-black/20 p-3">
                <summary className="cursor-pointer font-medium text-white">
                  Why did my balance not update immediately?
                </summary>
                <p className="soft-text mt-2">
                  The UI can lag behind network confirmation by a few seconds.
                  Refresh the page or open the tx in explorer for final state.
                </p>
              </details>
            </div>
          </GlassCard>
        </section>
      </div>
    </main>
  );
}
