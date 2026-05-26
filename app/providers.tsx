"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import OAuthReturnResume from "@/components/ui/oauth-return-resume";
import { CircleWalletProvider } from "@/features/circle-wallet/model/circle-wallet-provider";
import { useCircleWallet } from "@/features/circle-wallet/model/circle-wallet-provider";
import { getOAuthReturnTarget } from "@/lib/client/oauth-return";

type ProvidersProps = {
  children: ReactNode;
};

/** Full-screen overlay shown while the wallet initialises after an OAuth return. */
function OAuthLoadingOverlay() {
  const { ready, walletSyncing, authenticated, authError } = useCircleWallet();
  const pathname = usePathname();
  const [hasTarget, setHasTarget] = useState(false);

  useEffect(() => {
    // Reading localStorage to sync state with an external store is a valid effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasTarget(getOAuthReturnTarget() !== null);
  }, [ready, walletSyncing, authenticated]);

  // Only activate on the OAuth landing page ("/") when there's a pending redirect target
  if (pathname !== "/" || !hasTarget) return null;
  // Stop blocking if there's an error — let the user see it
  if (authError) return null;
  // Stop blocking once wallet is fully ready (OAuthReturnResume will navigate)
  if (ready && authenticated && !walletSyncing) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-black/80 backdrop-blur-sm">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
      <p className="text-sm text-white/60">Setting up wallet…</p>
    </div>
  );
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <CircleWalletProvider>
      <OAuthReturnResume />
      <OAuthLoadingOverlay />
      {children}
    </CircleWalletProvider>
  );
}
