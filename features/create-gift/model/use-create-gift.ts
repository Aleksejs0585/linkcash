"use client";

import { useEffect, useMemo, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  generateHash,
  generateLink,
  generateSecret,
  generateStatusLink,
} from "@/utils";
import { buildShareLinks } from "./share-links";
import { trackEvent } from "@/lib/client/analytics";

type CreateGiftSuccess = {
  ok: true;
  txHash: string;
  refundAddress: string;
  expiresAt: number;
};

type ReclaimGiftSuccess = {
  ok: true;
  txHash: string;
};

type ApiError = { error: string };

export function useCreateGift() {
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  const [link, setLink] = useState("");
  const [paymentIdHash, setPaymentIdHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState("10");
  const [expiresInHours, setExpiresInHours] = useState("24");
  const [creating, setCreating] = useState(false);
  const [reclaiming, setReclaiming] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const senderWalletAddress =
    wallets.find(
      (wallet) =>
        wallet.walletClientType === "privy" ||
        wallet.walletClientType === "privy-v2"
    )?.address ?? null;

  const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID?.trim() ?? "";
  const shareLinks = useMemo(
    () => buildShareLinks(link, facebookAppId),
    [facebookAppId, link]
  );
  const statusLink = useMemo(
    () => (paymentIdHash ? generateStatusLink(paymentIdHash) : ""),
    [paymentIdHash]
  );

  useEffect(() => {
    trackEvent({ event: "create_open", path: "/create" });
  }, []);

  const onCreate = async () => {
    if (!ready) return;
    if (!authenticated) {
      login();
      return;
    }
    if (!senderWalletAddress) {
      setStatus(
        "No embedded sender wallet found. Sign out and sign in again to create one."
      );
      return;
    }

    setCreating(true);
    setStatus(null);

    const secret = generateSecret();
    const hash = generateHash(secret);

    try {
      const response = await fetch("/api/create-gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIdHash: hash,
          amountUsdc: amount,
          refundAddress: senderWalletAddress,
          expiresInHours: Number(expiresInHours),
        }),
      });

      const data = (await response.json()) as CreateGiftSuccess | ApiError;
      if (!response.ok || !("txHash" in data)) {
        throw new Error("error" in data ? data.error : "Failed to fund gift.");
      }

      const giftLink = generateLink(hash, secret);
      setPaymentIdHash(hash);
      setLink(giftLink);
      setCopied(false);
      setStatus(
        `Gift funded. Refund wallet: ${data.refundAddress}. Expires at: ${new Date(
          data.expiresAt * 1000
        ).toLocaleString()}. Tx: ${data.txHash}`
      );
      trackEvent({
        event: "gift_funded",
        path: "/create",
        paymentIdHash: hash,
        txHash: data.txHash,
      });
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to create and fund gift."
      );
    } finally {
      setCreating(false);
    }
  };

  const onReclaim = async () => {
    if (!paymentIdHash) return;
    setReclaiming(true);
    setStatus(null);

    try {
      const response = await fetch("/api/reclaim-gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIdHash }),
      });
      const data = (await response.json()) as ReclaimGiftSuccess | ApiError;
      if (!response.ok || !("txHash" in data)) {
        throw new Error("error" in data ? data.error : "Failed to reclaim gift.");
      }

      setStatus(`Reclaim submitted successfully. Tx: ${data.txHash}`);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to reclaim expired gift."
      );
    } finally {
      setReclaiming(false);
    }
  };

  const onCopy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const onShareClick = (label: string, href: string | null) => {
    if (!href) {
      if (label === "Messenger") {
        setStatus(
          "Messenger share requires NEXT_PUBLIC_FACEBOOK_APP_ID. Add it in Vercel and redeploy."
        );
        return;
      }

      setStatus(`${label} share is temporarily unavailable.`);
      return;
    }

    window.open(href, "_blank", "noopener,noreferrer");
  };

  return {
    ready,
    authenticated,
    login,
    senderWalletAddress,
    link,
    paymentIdHash,
    statusLink,
    copied,
    amount,
    expiresInHours,
    creating,
    reclaiming,
    status,
    shareLinks,
    setAmount,
    setExpiresInHours,
    onCreate,
    onReclaim,
    onCopy,
    onShareClick,
  };
}

