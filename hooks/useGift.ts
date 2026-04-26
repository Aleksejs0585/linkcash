"use client";

import { useState } from "react";
import { getSecretFromHash } from "../utils";

type ClaimResponse = {
  txHash: string;
};

export function useGift() {
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const claimGift = async (receiverAddress: string) => {
    const secret = getSecretFromHash();

    if (!secret) {
      setError("Secret not found in URL.");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          receiverAddress,
        }),
      });

      const data = (await response.json()) as
        | ClaimResponse
        | { error: string };

      if (!response.ok || !("txHash" in data)) {
        throw new Error("error" in data ? data.error : "Claim failed.");
      }

      setTxHash(data.txHash);
      return data.txHash;
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to claim gift.";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    claimGift,
    loading,
    txHash,
    error,
  };
}
