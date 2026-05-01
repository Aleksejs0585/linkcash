"use client";

import GlassCard from "@/components/ui/glass-card";
import { CreateGiftContent } from "./create-gift-content";

export function CreateGiftScreen() {
  const hasPrivyAppId = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
  if (!hasPrivyAppId) {
    return (
      <main className="relative flex min-h-screen items-center justify-center px-5 py-10 text-white">
        <GlassCard className="w-full max-w-[420px] space-y-3 p-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Create Gift</h1>
          <p className="soft-text text-sm">
            Set <code>NEXT_PUBLIC_PRIVY_APP_ID</code> to enable sender wallet based
            refunds.
          </p>
        </GlassCard>
      </main>
    );
  }

  return <CreateGiftContent />;
}

