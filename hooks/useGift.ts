"use client";

import { useCallback, useState } from "react";
import {
  buildClaimIdempotencyKey,
  getPaymentIdHashFromPath,
  getSecretFromHash,
} from "../utils";

type ClaimSuccessResponse = {
  ok: true;
  txHash: string;
  cached?: boolean;
};

type ClaimErrorResponse = {
  ok: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
};

export function useGift() {
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const claimGift = useCallback(async (receiverAddress: string) => {
    const secret = getSecretFromHash();
    const paymentIdHash = getPaymentIdHashFromPath();

    if (!secret || !paymentIdHash) {
      setError("Gift link is invalid. Missing secret or payment hash.");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const idempotencyKey = buildClaimIdempotencyKey(
        paymentIdHash,
        receiverAddress
      );

      const response = await fetch("/api/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({
          secret,
          paymentIdHash,
          receiverAddress,
        }),
      });

      const data = (await response.json()) as
        | ClaimSuccessResponse
        | ClaimErrorResponse;

      if (!response.ok || data.ok === false) {
        const message =
          data.ok === false
            ? data.error.message
            : "Claim failed. Please try again.";
        throw new Error(message);
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
  }, []);

  return {
    claimGift,
    loading,
    txHash,
    error,
  };
}
