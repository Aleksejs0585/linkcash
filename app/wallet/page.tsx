"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Contract, JsonRpcProvider, formatUnits, isAddress } from "ethers";
import { useExportWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import GlassCard from "../../components/ui/glass-card";
import { useAddressBook } from "../../hooks/useAddressBook";
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
  const { contacts, getContactName, setContactName, removeContact } =
    useAddressBook();

  const [balance, setBalance] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [contactAddress, setContactAddress] = useState("");
  const [contactName, setContactNameInput] = useState("");

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
  const walletContactName = getContactName(walletAddress);

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

  const onSaveWalletName = () => {
    if (!walletAddress) return;
    const current = getContactName(walletAddress) ?? "";
    const next = window.prompt("Enter contact name", current)?.trim();
    if (!next) return;
    setContactName(walletAddress, next);
  };

  const onSaveContact = () => {
    const address = contactAddress.trim();
    const name = contactName.trim();
    if (!isAddress(address)) {
      setError("Please enter a valid wallet address.");
      return;
    }
    if (!name) {
      setError("Please enter a contact name.");
      return;
    }

    setContactName(address, name);
    setContactAddress("");
    setContactNameInput("");
    setError(null);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center px-5 py-10 text-white">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[450px] w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(139,92,246,0.2)_0%,_rgba(59,130,246,0.14)_35%,_transparent_70%)] blur-3xl" />

      <GlassCard className="relative w-full max-w-[420px] space-y-6 p-8">
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
                Wallet contact
              </p>
              <p className="mt-2 text-sm text-white/90">
                {walletContactName ?? "Unnamed wallet"}
              </p>
              {!walletContactName && (
                <p className="mt-1 break-all text-xs text-white/60">{walletAddress}</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={onCopy}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/85 transition hover:bg-white/5"
                >
                  {copied ? "Copied" : "Copy address"}
                </button>
                <button
                  type="button"
                  onClick={onSaveWalletName}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/85 transition hover:bg-white/5"
                >
                  {walletContactName ? "Edit name" : "Save name"}
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

            <div className="rounded-xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-white/60">
                Address book
              </p>
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactNameInput(e.target.value)}
                  placeholder="Contact name"
                  className="w-full rounded-lg border border-white/15 bg-black/35 px-3 py-2 text-sm outline-none"
                />
                <input
                  type="text"
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  placeholder="Wallet address (0x...)"
                  className="w-full rounded-lg border border-white/15 bg-black/35 px-3 py-2 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={onSaveContact}
                  className="w-full rounded-lg border border-white/15 px-3 py-2 text-sm text-white/85 transition hover:bg-white/5"
                >
                  Save contact
                </button>
              </div>

              <div className="mt-3 max-h-44 space-y-2 overflow-auto pr-1">
                {contacts.length === 0 ? (
                  <p className="text-xs text-white/55">No contacts yet.</p>
                ) : (
                  contacts.map((contact) => (
                    <div
                      key={contact.address.toLowerCase()}
                      className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2"
                    >
                      <p className="text-sm text-white/85">{contact.name}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const next = window
                              .prompt("Edit contact name", contact.name)
                              ?.trim();
                            if (!next) return;
                            setContactName(contact.address, next);
                          }}
                          className="text-xs text-white/70 hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeContact(contact.address)}
                          className="text-xs text-rose-300 hover:text-rose-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <Link
          href="/create"
          className="block text-center text-sm text-white/70 underline decoration-white/25 underline-offset-4"
        >
          Back to create gift
        </Link>
      </GlassCard>
    </main>
  );
}
