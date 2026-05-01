"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Contract, JsonRpcProvider, formatUnits, isAddress } from "ethers";
import { useExportWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import GlassCard from "../../components/ui/glass-card";
import BackButton from "../../components/ui/back-button";
import {
  ARC_TESTNET,
  getArcExplorerAddressUrl,
} from "../../utils";

const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

export default function WalletPage() {
  const hasPrivyAppId = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

  if (!hasPrivyAppId) {
    return (
      <main className="relative flex min-h-screen items-center justify-center px-5 py-10 text-white">
        <GlassCard className="w-full max-w-[420px] space-y-3 p-8 text-center">
          <div className="flex justify-start">
            <BackButton fallbackHref="/" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">My Wallet</h1>
          <p className="soft-text text-sm">
            Set <code>NEXT_PUBLIC_PRIVY_APP_ID</code> to enable wallet access.
          </p>
        </GlassCard>
      </main>
    );
  }

  return <WalletContent />;
}

function WalletContent() {
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const { exportWallet } = useExportWallet();

  const [balance, setBalance] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const embeddedWallet = useMemo(
    () =>
      wallets.find(
        (wallet) =>
          wallet.walletClientType === "privy" ||
          wallet.walletClientType === "privy-v2"
      ),
    [wallets]
  );

  const walletAddress = embeddedWallet?.address ?? null;

  const loadBalance = useCallback(async () => {
    if (!walletAddress || !isAddress(walletAddress)) {
      setBalance(null);
      return;
    }

    setLoadingBalance(true);
    setError(null);

    try {
      const provider = new JsonRpcProvider(ARC_TESTNET.rpcUrl);
      const usdc = new Contract(ARC_TESTNET.usdcErc20Address, ERC20_ABI, provider);
      const [rawBalance, decimals] = await Promise.all([
        usdc.balanceOf(walletAddress) as Promise<bigint>,
        usdc.decimals() as Promise<number>,
      ]);

      setBalance(formatUnits(rawBalance, decimals));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch USDC balance.");
    } finally {
      setLoadingBalance(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      loadBalance().catch(() => undefined);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadBalance]);

  const onCopy = async () => {
    if (!walletAddress) return;
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const onExport = async () => {
    if (!walletAddress) return;
    setExporting(true);
    setError(null);

    try {
      await exportWallet({ address: walletAddress });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to open wallet export modal."
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center px-5 py-10 text-white">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[450px] w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(139,92,246,0.2)_0%,_rgba(59,130,246,0.14)_35%,_transparent_70%)] blur-3xl" />

      <GlassCard className="relative w-full max-w-[420px] space-y-6 p-8">
        <div className="flex justify-start">
          <BackButton fallbackHref="/" />
        </div>
        <div className="text-center">
          <p className="mx-auto inline-flex rounded-full border border-white/15 px-3 py-1 text-xs text-white/75">
            {ARC_TESTNET.chainName}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            My Wallet
          </h1>
          <p className="soft-text mt-2 text-sm">
            View your address, USDC balance, and manage access.
          </p>
        </div>

        {!ready ? (
          <p className="text-center text-sm text-white/70">Loading wallet...</p>
        ) : !authenticated ? (
          <button
            type="button"
            onClick={login}
            className="accent-gradient w-full rounded-2xl px-6 py-3.5 text-base font-semibold"
          >
            Sign in to view wallet
          </button>
        ) : !walletAddress ? (
          <p className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-amber-300">
            No embedded wallet found yet. Sign out and sign in again to trigger
            wallet creation.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-white/60">
                Wallet address
              </p>
              <p className="mt-2 break-all text-sm text-white/90">{walletAddress}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={onCopy}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/85 transition hover:bg-white/5"
                >
                  {copied ? "Copied" : "Copy address"}
                </button>
                <a
                  href={getArcExplorerAddressUrl(walletAddress)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-blue-300 transition hover:bg-white/5"
                >
                  View on explorer
                </a>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-white/60">
                USDC balance
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {loadingBalance ? "Loading..." : `${balance ?? "0"} USDC`}
              </p>
              <button
                type="button"
                onClick={() => loadBalance().catch(() => undefined)}
                className="mt-3 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/85 transition hover:bg-white/5"
              >
                Refresh balance
              </button>
            </div>

            <button
              type="button"
              onClick={onExport}
              disabled={exporting}
              className="w-full rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white/85 transition hover:bg-white/5 disabled:opacity-60"
            >
              {exporting ? "Opening export..." : "Export wallet"}
            </button>
          </div>
        )}

        {error && <p className="text-sm text-rose-400">{error}</p>}

      </GlassCard>
    </main>
  );
}
