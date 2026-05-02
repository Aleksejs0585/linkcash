"use client";

type ProductEvent = "create_open" | "gift_funded" | "status_open" | "claim_success";

type TrackPayload = {
  event: ProductEvent;
  path?: string;
  paymentIdHash?: string;
  status?: string;
  txHash?: string;
  source?: string;
  campaign?: string;
  referrer?: string;
};

export function trackEvent(payload: TrackPayload) {
  const search = new URLSearchParams(window.location.search);
  const source = payload.source ?? search.get("utm_source") ?? undefined;
  const campaign = payload.campaign ?? search.get("utm_campaign") ?? undefined;
  const referrer = payload.referrer ?? document.referrer ?? undefined;

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      source,
      campaign,
      referrer,
    }),
    keepalive: true,
  }).catch(() => {
    // Intentionally swallow analytics transport errors.
  });
}

