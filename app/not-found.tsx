import Link from "next/link";
import AppShell from "@/components/ui/app-shell";
import GlassCard from "@/components/ui/glass-card";
import LinkCashLogo from "@/components/ui/linkcash-logo";

export default function NotFound() {
  return (
    <AppShell className="flex items-center justify-center px-4 py-8">
      <GlassCard className="relative z-[1] w-full max-w-[420px] space-y-6 p-8 text-center">
        <Link href="/" className="inline-flex justify-center">
          <LinkCashLogo />
        </Link>
        <div className="space-y-2">
          <p className="text-5xl font-bold text-white/20">404</p>
          <h1 className="app-heading text-2xl">Page not found</h1>
          <p className="soft-text text-sm">
            This link doesn&apos;t exist or has been removed.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            href="/create"
            className="accent-gradient inline-flex w-full items-center justify-center rounded-[var(--radius)] px-5 py-3 text-sm font-medium"
          >
            Create a gift link →
          </Link>
          <Link
            href="/"
            className="app-btn-secondary inline-flex w-full items-center justify-center px-5 py-2.5 text-sm"
          >
            Go home
          </Link>
        </div>
      </GlassCard>
    </AppShell>
  );
}
