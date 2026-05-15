"use client";

import { useEffect } from "react";
import { useCircleWallet } from "@/features/circle-wallet/model/circle-wallet-provider";
import { resumeOAuthReturnTarget } from "@/lib/client/oauth-return";

/**
 * After Google OAuth the browser lands on site origin (/). Resume the saved gift URL.
 */
export default function OAuthReturnResume() {
  const { ready, authenticated, walletSyncing } = useCircleWallet();

  useEffect(() => {
    if (!ready || !authenticated || walletSyncing) return;
    resumeOAuthReturnTarget();
  }, [ready, authenticated, walletSyncing]);

  return null;
}
