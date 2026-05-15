"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Contract, JsonRpcProvider, formatUnits, isAddress } from "ethers";
import AppShell from "@/components/ui/app-shell";
import GlassCard from "@/components/ui/glass-card";
import MainMenu from "@/components/ui/main-menu";
import OAuthNavHint from "@/components/ui/oauth-nav-hint";
import { WalletBackupWarning } from "@/components/ui/wallet-backup-warning";
import { isCircleWalletConfigured } from "@/features/circle-wallet/config/circle-env";
import { useCircleWallet } from "@/features/circle-wallet/model/circle-wallet-provider";
import { trackEvent } from "@/lib/client/analytics";
import { ARC_TESTNET, getArcExplorerAddressUrl } from "@/utils";

const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

export default function WalletPage() {
  if (!isCircleWalletConfigured()) {
    return (
      <AppShell className="flex items-center justify-center px-5 py-10">
        <GlassCard className="relative z-[1] w-full max-w-[420px] space-y-3 p-8 text-center">
          <div className="flex justify-start">
            <MainMenu />
          </div>
          <h1 className="app-heading text-3xl">My wallet</h1>
          <p className="soft-text text-sm">
            Set <code>NEXT_PUBLIC_CIRCLE_APP_ID</code> and{" "}
            <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> (plus server{" "}
            <code>CIRCLE_API_KEY</code>) to enable Circle wallets.
          </p>
        </GlassCard>
      </AppShell>
    );
  }

  return <WalletContent />;
}

function WalletContent() {
  const {
    ready,
    authenticated,
    login,
    logout,
    walletAddress,
    authError,
    bootstrapError,
    walletSyncing,
  } = useCircleWallet();

  const [balance, setBalance] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const walletAddressResolved = useMemo(
    () => (walletAddress && isAddress(walletAddress) ? walletAddress : null),
    [walletAddress]
  );

  useEffect(() => {
    trackEvent({ event: "wallet_open", path: "/wallet" });
  }, []);

  const loadBalance = useCallback(async () => {
    if (!walletAddressResolved) {
      setBalance(null);
      return;
    }

    setLoadingBalance(true);
    setError(null);

    try {
      const provider = new JsonRpcProvider(ARC_TESTNET.rpcUrl);
      const usdc = new Contract(ARC_TESTNET.usdcErc20Address, ERC20_ABI, provider);
      const [rawBalance, decimals] = await Promise.all([
        usdc.balanceOf(walletAddressResolved) as Promise<bigint>,
        usdc.decimals() as Promise<number>,
      ]);

      setBalance(formatUnits(rawBalance, decimals));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch USDC balance.");
    } finally {
      setLoadingBalance(false);
    }
  }, [walletAddressResolved]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      loadBalance().catch(() => undefined);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadBalance]);

  const onCopy = async () => {
    if (!walletAddressResolved) return;
    await navigator.clipboard.writeText(walletAddressResolved);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <AppShell className="flex items-center justify-center px-5 py-10">
      <GlassCard className="relative z-[1] w-full max-w-[420px] space-y-6 p-8">
        <div className="flex justify-start">
          <MainMenu />
        </div>
        <div className="text-center">
          <p className="app-chain-badge mx-auto">
            {ARC_TESTNET.chainName}
          </p>
          <h1 className="app-heading mt-3 text-3xl">
            My wallet
          </h1>
          <p className="soft-text mt-2 text-sm">
            Circle user-controlled wallet on Arc Testnet.
          </p>
        </div>

        {bootstrapError && (
          <p className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">
            {bootstrapError}
          </p>
        )}

        {!ready ? (
          <p className="text-center text-sm text-white/70">Loading wallet...</p>
        ) : !authenticated ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => void login()}
              className="accent-gradient w-full rounded-[var(--radius)] px-6 py-3.5 text-base"
            >
              Sign in with Google
            </button>
            <OAuthNavHint />
            {authError && (
              <p className="text-center text-sm text-rose-400">{authError}</p>
            )}
          </div>
        ) : !walletAddressResolved ? (
          <div className="space-y-3">
            <p className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-amber-300">
              {walletSyncing
                ? "Finishing Circle wallet setup..."
                : "No Arc wallet yet. Sign out and sign in with Google again, or wait a few seconds and refresh."}
            </p>
            <button
              type="button"
              onClick={logout}
              className="app-btn-secondary w-full px-4 py-2.5 text-sm"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <WalletBackupWarning variant="inlineExportHint" />
            <div className="app-panel p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-white/60">
                Wallet address
              </p>
              <p className="mt-2 break-all text-sm text-white/90">
                {walletAddressResolved}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void onCopy()}
                  className="app-btn-secondary px-3 py-1.5 text-xs"
                >
                  {copied ? "Copied" : "Copy address"}
                </button>
                <a
                  href={getArcExplorerAddressUrl(walletAddressResolved)}
                  target="_blank"
                  rel="noreferrer"
                  className="app-btn-secondary px-3 py-1.5 text-xs app-link"
                >
                  View on explorer
                </a>
              </div>
            </div>

            <div className="app-panel p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-white/60">
                USDC balance
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {loadingBalance ? "Loading..." : `${balance ?? "0"} USDC`}
              </p>
              <button
                type="button"
                onClick={() => loadBalance().catch(() => undefined)}
                className="app-btn-secondary mt-3 px-3 py-1.5 text-xs"
              >
                Refresh balance
              </button>
            </div>

            <button
              type="button"
              onClick={logout}
              className="app-btn-secondary w-full px-4 py-2.5 text-sm"
            >
              Sign out
            </button>
          </div>
        )}

        {error && <p className="text-sm text-rose-400">{error}</p>}
      </GlassCard>
    </AppShell>
  );
}
