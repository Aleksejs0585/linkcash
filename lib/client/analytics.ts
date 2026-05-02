"use client";

type ProductEvent = "create_open" | "gift_funded" | "status_open" | "claim_success";

type TrackPayload = {
  event: ProductEvent;
  path?: string;
  paymentIdHash?: string;
  status?: string;
  txHash?: string;
};

export function trackEvent(payload: TrackPayload) {
  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Intentionally swallow analytics transport errors.
  });
}

