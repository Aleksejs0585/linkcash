"use client";

import { useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/ui/app-shell";
import GlassCard from "@/components/ui/glass-card";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") console.error(error);
  }, [error]);

  return (
    <AppShell className="flex items-center justify-center px-4 py-8">
      <GlassCard className="relative z-[1] w-full max-w-[420px] space-y-6 p-8 text-center">
        <div className="space-y-2">
          <p className="text-4xl">⚠️</p>
          <h1 className="app-heading text-2xl">Something went wrong</h1>
          <p className="soft-text text-sm">
            An unexpected error occurred. Try again or refresh the page.
          </p>
          {error.digest && (
            <p className="text-xs text-white/30">ref: {error.digest}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={reset}
            className="accent-gradient inline-flex w-full items-center justify-center rounded-[var(--radius)] px-5 py-3 text-sm font-medium"
          >
            Try again
          </button>
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
