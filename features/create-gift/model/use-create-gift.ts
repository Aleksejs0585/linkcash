"use client";

import { useEffect, useMemo, useState } from "react";
import { useCircleWallet } from "@/features/circle-wallet/model/circle-wallet-provider";
import {
  GIFT_MESSAGE_MAX,
  SENDER_DISPLAY_NAME_MAX,
} from "@/lib/gift-metadata-limits";
import {
  readGoogleDisplayName,
  readGoogleEmail,
  resolveDefaultSenderLabel,
} from "@/lib/client/google-display-name";
import { getPublicGiftContractAddress } from "@/features/create-gift/lib/gift-usdc";
import { waitForClientFundedGift } from "@/features/create-gift/lib/read-gift-on-chain";
import {
  generateHash,
  generateLink,
  generateSecret,
  generateStatusLink,
} from "@/utils";
import { formatGiftTxError } from "../lib/gift-errors";
import { buildShareLinks } from "./share-links";
import { trackEvent } from "@/lib/client/analytics";
import { getOrAssignVariant } from "@/lib/client/experiments";

type CreateGiftSuccess = {
  ok: true;
  txHash: string;
  refundAddress: string;
  expiresAt: number;
  cached?: boolean;
};

type ReclaimGiftSuccess = {
  ok: true;
  txHash: string;
};

type ApiError = { error: string };

type ContractChallengeResponse = { challengeId: string };

async function postCircleChallenge(
  body: Record<string, unknown>
): Promise<ContractChallengeResponse> {
  const response = await fetch("/api/circle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as ContractChallengeResponse & {
    error?: string;
    message?: string;
  };
  if (!response.ok || !data.challengeId) {
    const msg =
      typeof data.error === "string"
        ? data.error
        : typeof data.message === "string"
          ? data.message
          : `Circle API error (${response.status})`;
    throw new Error(msg);
  }
  return { challengeId: data.challengeId };
}

export function useCreateGift() {
  const {
    ready,
    authenticated,
    login,
    walletAddress: senderWalletAddress,
    primaryWalletId,
    userToken,
    executeChallenge,
    authError,
    bootstrapError,
    walletSyncing,
    googleDisplayName,
    googleEmail,
  } = useCircleWallet();

  const [senderNameTouched, setSenderNameTouched] = useState(false);
  const [link, setLink] = useState("");
  const [paymentIdHash, setPaymentIdHash] = useState<string | null>(null);
  const [giftExpiresAt, setGiftExpiresAt] = useState<number | null>(null);
  const [reclaimTick, setReclaimTick] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState("10");
  const [expiresInHours, setExpiresInHours] = useState("24");
  const [senderDisplayName, setSenderDisplayName] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [reclaiming, setReclaiming] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [createCopyVariant] = useState(() =>
    getOrAssignVariant("create_primary_copy_v1", ["a", "b"])
  );

  const giftContractAddress = useMemo(() => getPublicGiftContractAddress(), []);
  const hasGiftContractConfig = Boolean(giftContractAddress);

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
    trackEvent({
      event: "create_open",
      path: "/create",
      variant: `create_primary_copy_v1:${createCopyVariant}`,
    });
  }, [createCopyVariant]);

  const suggestedSenderName = useMemo(() => {
    if (!authenticated) return "";
    return (
      resolveDefaultSenderLabel(
        googleEmail ?? readGoogleEmail(),
        googleDisplayName ?? readGoogleDisplayName()
      ) ?? ""
    );
  }, [authenticated, googleDisplayName, googleEmail]);

  const senderNameInputValue = senderNameTouched
    ? senderDisplayName
    : senderDisplayName || suggestedSenderName;

  useEffect(() => {
    if (!giftExpiresAt) return;
    const id = window.setInterval(() => setReclaimTick(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [giftExpiresAt]);

  const reclaimAvailable = useMemo(() => {
    if (!giftExpiresAt) return false;
    return Math.floor(reclaimTick / 1000) >= giftExpiresAt;
  }, [giftExpiresAt, reclaimTick]);

  const reclaimCountdownLabel = useMemo(() => {
    if (!giftExpiresAt || reclaimAvailable) return null;
    const remainingSec = giftExpiresAt - Math.floor(reclaimTick / 1000);
    if (remainingSec <= 0) return null;
    const hours = Math.floor(remainingSec / 3600);
    const minutes = Math.floor((remainingSec % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, [giftExpiresAt, reclaimAvailable, reclaimTick]);

  const onCreate = async () => {
    if (!ready) return;
    if (!authenticated) {
      void login();
      return;
    }
    if (!senderWalletAddress) {
      setStatus(
        walletSyncing
          ? "Preparing your Circle wallet on Arc Testnet..."
          : "No sender wallet yet. Finish Google sign-in and wallet setup, then try again."
      );
      return;
    }
    if (!giftContractAddress) {
      setStatus(
        "Set NEXT_PUBLIC_CONTRACT_ADDRESS to the deployed gift contract (same as CONTRACT_ADDRESS)."
      );
      return;
    }
    if (!primaryWalletId || !userToken) {
      setStatus("Wallet is not ready for signing. Try again in a moment.");
      return;
    }

    const hoursNum = Number(expiresInHours);
    if (!Number.isFinite(hoursNum) || hoursNum <= 0 || hoursNum > 720) {
      setStatus("Expiry must be between 1 and 720 hours.");
      return;
    }

    const trimmedName = senderNameInputValue.trim().replace(/\s+/g, " ");
    if (!trimmedName) {
      setStatus(
        "Add how the recipient should see you (your email is filled in by default after sign-in)."
      );
      return;
    }
    if (trimmedName.length > SENDER_DISPLAY_NAME_MAX) {
      setStatus(`Name must be ${SENDER_DISPLAY_NAME_MAX} characters or fewer.`);
      return;
    }
    const trimmedMessage = giftMessage.trim().replace(/\s+/g, " ");
    if (trimmedMessage.length > GIFT_MESSAGE_MAX) {
      setStatus(`Message must be ${GIFT_MESSAGE_MAX} characters or fewer.`);
      return;
    }

    setCreating(true);
    setStatus(null);

    const secret = generateSecret();
    const hash = generateHash(secret);

    try {
      const { challengeId } = await postCircleChallenge({
        action: "giftFundingBatchChallenge",
        userToken,
        walletId: primaryWalletId,
        paymentIdHash: hash,
        amountUsdc: amount,
        expiresInHours: hoursNum,
      });

      setStatus("Confirm in Circle: approve USDC and fund the gift in one step…");
      await executeChallenge(challengeId);

      setStatus("Waiting for Arc confirmation…");
      await waitForClientFundedGift({
        paymentIdHash: hash,
        amountUsdc: amount,
        refundAddress: senderWalletAddress,
        onProgress: (attempt, max, detail) => {
          setStatus(
            `Waiting for Arc confirmation… ${detail} · ${attempt}/${max}`
          );
        },
      });

      const response = await fetch("/api/create-gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIdHash: hash,
          amountUsdc: amount,
          refundAddress: senderWalletAddress,
          expiresInHours: hoursNum,
          senderDisplayName: trimmedName,
          giftMessage: trimmedMessage || undefined,
          syncClientFunding: true,
        }),
      });

      const data = (await response.json()) as CreateGiftSuccess | ApiError;
      if (!response.ok || !("txHash" in data)) {
        throw new Error("error" in data ? data.error : "Failed to record gift.");
      }

      const giftLink = generateLink(hash, secret);
      setPaymentIdHash(hash);
      setGiftExpiresAt(data.expiresAt);
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
        variant: `create_primary_copy_v1:${createCopyVariant}`,
      });
    } catch (error) {
      const raw =
        error instanceof Error ? error.message : "Failed to create and fund gift.";
      setStatus(formatGiftTxError(raw));
    } finally {
      setCreating(false);
    }
  };

  const onReclaim = async () => {
    if (!paymentIdHash) return;
    setReclaiming(true);
    setStatus(null);
    trackEvent({
      event: "reclaim_click",
      path: "/create",
      paymentIdHash,
      variant: `create_primary_copy_v1:${createCopyVariant}`,
    });

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
      const raw =
        error instanceof Error ? error.message : "Failed to reclaim expired gift.";
      setStatus(formatGiftTxError(raw));
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
    authError,
    bootstrapError,
    walletSyncing,
    hasGiftContractConfig,
    link,
    paymentIdHash,
    giftExpiresAt,
    reclaimAvailable,
    reclaimCountdownLabel,
    statusLink,
    copied,
    amount,
    expiresInHours,
    creating,
    reclaiming,
    status,
    createCopyVariant,
    shareLinks,
    setAmount,
    setExpiresInHours,
    senderDisplayName: senderNameInputValue,
    giftMessage,
    setSenderDisplayName: (value: string) => {
      setSenderNameTouched(true);
      setSenderDisplayName(value);
    },
    setGiftMessage,
    onCreate,
    onReclaim,
    onCopy,
    onShareClick,
  };
}
