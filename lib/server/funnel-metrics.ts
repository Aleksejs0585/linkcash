import type { ProductAnalyticsEvent } from "./product-analytics-store";

export type FunnelMetrics = {
  createOpen: number;
  giftFunded: number;
  statusOpen: number;
  claimSuccess: number;
  fundedRate: number;
  statusRate: number;
  claimRate: number;
};

export type SourceMetrics = {
  source: string;
  createOpen: number;
  giftFunded: number;
  claimSuccess: number;
  claimRate: number;
};

export type CohortMetrics = {
  day: string;
  source: string;
  campaign: string;
  createOpen: number;
  giftFunded: number;
  claimSuccess: number;
  claimRate: number;
};

export type FunnelSummary = {
  last24h: FunnelMetrics;
  last7d: FunnelMetrics;
  bySource24h: SourceMetrics[];
  cohorts7d: CohortMetrics[];
  quality24h: {
    walletOpen: number;
    claimError: number;
    reclaimClick: number;
  };
  alerts: string[];
};

function buildFunnelMetrics(events: ProductAnalyticsEvent[]): FunnelMetrics {
  const createOpen = events.filter((item) => item.event === "create_open").length;
  const giftFunded = events.filter((item) => item.event === "gift_funded").length;
  const statusOpen = events.filter((item) => item.event === "status_open").length;
  const claimSuccess = events.filter((item) => item.event === "claim_success").length;

  return {
    createOpen,
    giftFunded,
    statusOpen,
    claimSuccess,
    fundedRate: createOpen > 0 ? giftFunded / createOpen : 0,
    statusRate: giftFunded > 0 ? statusOpen / giftFunded : 0,
    claimRate: giftFunded > 0 ? claimSuccess / giftFunded : 0,
  };
}

function buildSourceMetrics(events: ProductAnalyticsEvent[]): SourceMetrics[] {
  const map = new Map<string, ProductAnalyticsEvent[]>();
  for (const event of events) {
    const key = event.source?.trim() || "direct";
    const rows = map.get(key);
    if (rows) rows.push(event);
    else map.set(key, [event]);
  }

  return Array.from(map.entries())
    .map(([source, rows]) => {
      const createOpen = rows.filter((item) => item.event === "create_open").length;
      const giftFunded = rows.filter((item) => item.event === "gift_funded").length;
      const claimSuccess = rows.filter((item) => item.event === "claim_success").length;
      return {
        source,
        createOpen,
        giftFunded,
        claimSuccess,
        claimRate: giftFunded > 0 ? claimSuccess / giftFunded : 0,
      };
    })
    .sort((a, b) => b.createOpen - a.createOpen)
    .slice(0, 8);
}

function dayKey(timestamp: string) {
  return timestamp.slice(0, 10);
}

function buildCohorts(events: ProductAnalyticsEvent[]): CohortMetrics[] {
  const map = new Map<string, ProductAnalyticsEvent[]>();
  for (const event of events) {
    const day = dayKey(event.timestamp);
    const source = event.source?.trim() || "direct";
    const campaign = event.campaign?.trim() || "none";
    const key = `${day}::${source}::${campaign}`;
    const rows = map.get(key);
    if (rows) rows.push(event);
    else map.set(key, [event]);
  }

  return Array.from(map.entries())
    .map(([key, rows]) => {
      const [day, source, campaign] = key.split("::");
      const createOpen = rows.filter((item) => item.event === "create_open").length;
      const giftFunded = rows.filter((item) => item.event === "gift_funded").length;
      const claimSuccess = rows.filter((item) => item.event === "claim_success").length;
      return {
        day,
        source,
        campaign,
        createOpen,
        giftFunded,
        claimSuccess,
        claimRate: giftFunded > 0 ? claimSuccess / giftFunded : 0,
      };
    })
    .sort((a, b) => {
      if (a.day === b.day) return b.createOpen - a.createOpen;
      return a.day < b.day ? 1 : -1;
    })
    .slice(0, 20);
}

export function buildFunnelSummary(
  events: ProductAnalyticsEvent[],
  now = Date.now()
): FunnelSummary {
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const events24h = events.filter((item) => {
    const ts = Date.parse(item.timestamp);
    return Number.isFinite(ts) && ts >= dayAgo;
  });
  const events7d = events.filter((item) => {
    const ts = Date.parse(item.timestamp);
    return Number.isFinite(ts) && ts >= weekAgo;
  });

  const last24h = buildFunnelMetrics(events24h);
  const last7d = buildFunnelMetrics(events7d);
  const quality24h = {
    walletOpen: events24h.filter((item) => item.event === "wallet_open").length,
    claimError: events24h.filter((item) => item.event === "claim_error").length,
    reclaimClick: events24h.filter((item) => item.event === "reclaim_click").length,
  };

  const alerts: string[] = [];
  if (last24h.createOpen >= 20 && last24h.fundedRate < 0.25) {
    alerts.push(
      "High drop after create open: less than 25% reach funding in the last 24h."
    );
  }
  if (last24h.giftFunded >= 15 && last24h.claimRate < 0.35) {
    alerts.push(
      "Claim completion is low: less than 35% of funded gifts were claimed in the last 24h."
    );
  }
  if (last24h.createOpen > 0 && last24h.claimSuccess === 0) {
    alerts.push("No successful claims were recorded in the last 24h.");
  }

  return {
    last24h,
    last7d,
    bySource24h: buildSourceMetrics(events24h),
    cohorts7d: buildCohorts(events7d),
    quality24h,
    alerts,
  };
}

