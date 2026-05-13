"use client";

import GlassCard from "@/components/ui/glass-card";
import MainMenu from "@/components/ui/main-menu";
import { isCircleWalletConfigured } from "@/features/circle-wallet/config/circle-env";
import { CreateGiftContent } from "./create-gift-content";

export function CreateGiftScreen() {
  if (!isCircleWalletConfigured()) {
    return (
      <main className="relative flex min-h-screen items-center justify-center px-5 py-10 text-white">
        <GlassCard className="w-full max-w-[420px] space-y-3 p-8 text-center">
          <div className="flex justify-start">
            <MainMenu />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Create Gift</h1>
          <p className="soft-text text-sm">
            Set <code>NEXT_PUBLIC_CIRCLE_APP_ID</code>,{" "}
            <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>, and server{" "}
            <code>CIRCLE_API_KEY</code> for Circle user wallets and refunds.
          </p>
        </GlassCard>
      </main>
    );
  }

  return <CreateGiftContent />;
}

