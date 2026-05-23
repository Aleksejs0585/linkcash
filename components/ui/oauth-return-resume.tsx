"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCircleWallet } from "@/features/circle-wallet/model/circle-wallet-provider";
import {
  clearOAuthReturnTarget,
  getCurrentAppPath,
  getOAuthReturnTarget,
} from "@/lib/client/oauth-return";

/**
 * After Google OAuth the browser lands on site origin (/). Resume the saved gift URL.
 * Uses router.push (soft nav) so React state is preserved — no re-hydration needed.
 */
export default function OAuthReturnResume() {
  const { ready, authenticated, walletSyncing } = useCircleWallet();
  const router = useRouter();

  useEffect(() => {
    if (!ready || !authenticated || walletSyncing) return;
    const target = getOAuthReturnTarget();
    if (!target) return;
    const current = getCurrentAppPath();
    clearOAuthReturnTarget();
    if (current !== target) {
      router.push(target);
    }
  }, [ready, authenticated, walletSyncing, router]);

  return null;
}
