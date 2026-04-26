import Link from "next/link";
import GlassCard from "../components/ui/glass-card";

export default function HomePage() {
  return (
    <main className="relative min-h-screen px-5 py-16 text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(139,92,246,0.2)_0%,_rgba(59,130,246,0.12)_40%,_transparent_75%)] blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-7">
        <section className="mx-auto w-full max-w-3xl text-center">
          <p className="mx-auto inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs tracking-[0.18em] text-white/75">
            SOCIAL-FIRST CRYPTO ONBOARDING
          </p>
          <h1 className="mt-5 text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Send USDC like a message.
            <span className="block soft-text">No wallet setup required.</span>
          </h1>
          <p className="soft-text mx-auto mt-4 max-w-2xl text-base sm:text-lg">
            VibeLink turns a simple link into a first onchain experience.
            Recipients log in with Google/X, receive an embedded wallet, and
            claim funds gaslessly.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/create"
              className="accent-gradient inline-flex rounded-2xl px-6 py-3 text-base font-semibold shadow-[0_14px_36px_rgba(76,85,255,0.4)] transition hover:scale-[1.02]"
            >
              Create a gift
            </Link>
            <Link
              href="/wallet"
              className="inline-flex rounded-2xl border border-white/15 px-6 py-3 text-base font-medium text-white/85 transition hover:bg-white/5"
            >
              Open my wallet
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <GlassCard className="space-y-2 p-5">
            <p className="text-xs uppercase tracking-[0.15em] text-white/60">
              Time to first claim
            </p>
            <p className="text-3xl font-semibold">{"< 60s"}</p>
            <p className="soft-text text-sm">
              Social login + embedded wallet + relayer execution.
            </p>
          </GlassCard>
          <GlassCard className="space-y-2 p-5">
            <p className="text-xs uppercase tracking-[0.15em] text-white/60">
              User friction
            </p>
            <p className="text-3xl font-semibold">Near-zero</p>
            <p className="soft-text text-sm">
              No seed phrase, no extension install, no gas setup required.
            </p>
          </GlassCard>
          <GlassCard className="space-y-2 p-5">
            <p className="text-xs uppercase tracking-[0.15em] text-white/60">
              Perfect for
            </p>
            <p className="text-3xl font-semibold">Growth loops</p>
            <p className="soft-text text-sm">
              Rewards, referrals, creator payouts, and activation campaigns.
            </p>
          </GlassCard>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold">How it works</h2>
            <div className="mt-4 space-y-3 text-sm text-white/85">
              <p>
                <span className="font-semibold text-white">1.</span> Sender funds
                a gift and generates a secure claim link.
              </p>
              <p>
                <span className="font-semibold text-white">2.</span> Recipient
                opens the link and logs in with Google or X.
              </p>
              <p>
                <span className="font-semibold text-white">3.</span> VibeLink
                creates an embedded wallet and relays claim gaslessly.
              </p>
              <p>
                <span className="font-semibold text-white">4.</span> Recipient
                sees funds in the wallet and can export keys anytime.
              </p>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold">Built for trust</h2>
            <div className="mt-4 space-y-3 text-sm text-white/85">
              <p>
                Arc Testnet settlement with explorer-verified transactions.
              </p>
              <p>
                Idempotent claim flow with server-side rate limits and audit logs.
              </p>
              <p>
                Wallet hub for non-crypto users with address, balance, and export.
              </p>
              <p>
                Admin control panel for runtime claim safety operations.
              </p>
            </div>
          </GlassCard>
        </section>
      </div>
    </main>
  );
}
