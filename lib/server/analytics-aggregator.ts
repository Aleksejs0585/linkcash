import { productAnalyticsStore } from "./product-analytics-store";
import { senderGiftStore } from "./sender-gift-store";
import { liveActivityStore } from "./live-activity-store";
import { loadOnChainStats } from "./on-chain-stats";

export type KpiBlock = {
  giftsFunded: number;
  claimsCompleted: number;
  volumeUsdc: number;
  uniqueWallets: number;
};

export type OnChainKpi = {
  totalFunded: number;
  totalClaimed: number;
  totalUsdcClaimed: string;
};

export type DailyRow = {
  date: string;
  giftsFunded: number;
  claimsCompleted: number;
  volumeUsdc: number;
};

export type FunnelStep = { label: string; count: number };

export type SourceRow = {
  source: string;
  opens: number;
  funded: number;
  claimed: number;
};

export type ActivityItem = {
  kind: string;
  timestamp: string;
  txHash: string;
};

export type AnalyticsSnapshot = {
  onChain: OnChainKpi;
  kpi: { allTime: KpiBlock; last24h: KpiBlock };
  daily: DailyRow[];
  funnelSteps: FunnelStep[];
  topSources: SourceRow[];
  recentActivity: ActivityItem[];
};

function dayKey(ts: string): string {
  return ts.slice(0, 10);
}

function formatUsdc(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n / 1e6 : 0;
}

export async function buildAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
  const [analyticsEvents, giftEvents, recentActivity, chainStats] =
    await Promise.all([
      productAnalyticsStore.readRecent(10_000),
      senderGiftStore.readRecent(50_000),
      liveActivityStore.readRecent(30),
      loadOnChainStats(),
    ]);

  const onChain: OnChainKpi = {
    totalFunded: chainStats.totalFunded,
    totalClaimed: chainStats.totalClaimed,
    totalUsdcClaimed: chainStats.totalUsdcClaimed,
  };

  const now = Date.now();
  const day24h = now - 24 * 60 * 60 * 1000;

  function buildKpi(
    events: typeof analyticsEvents,
    gifts: typeof giftEvents
  ): KpiBlock {
    const wallets = new Set<string>();
    for (const e of gifts) {
      if (e.refundAddress) wallets.add(e.refundAddress.toLowerCase());
    }
    return {
      giftsFunded: events.filter((e) => e.event === "gift_funded").length,
      claimsCompleted: events.filter((e) => e.event === "claim_success").length,
      volumeUsdc: gifts
        .filter((e) => e.event === "gift_funded")
        .reduce((sum, e) => sum + formatUsdc(e.amountRaw ?? "0"), 0),
      uniqueWallets: wallets.size,
    };
  }

  const ae24h = analyticsEvents.filter(
    (e) => Date.parse(e.timestamp) >= day24h
  );
  const ge24h = giftEvents.filter((e) => Date.parse(e.timestamp) >= day24h);

  const kpi = {
    allTime: buildKpi(analyticsEvents, giftEvents),
    last24h: buildKpi(ae24h, ge24h),
  };

  // Daily breakdown
  const dailyMap = new Map<string, DailyRow>();

  for (const e of analyticsEvents) {
    const key = dayKey(e.timestamp);
    if (!key || key.length !== 10) continue;
    let row = dailyMap.get(key);
    if (!row) {
      row = { date: key, giftsFunded: 0, claimsCompleted: 0, volumeUsdc: 0 };
      dailyMap.set(key, row);
    }
    if (e.event === "gift_funded") row.giftsFunded++;
    if (e.event === "claim_success") row.claimsCompleted++;
  }

  for (const e of giftEvents) {
    if (e.event !== "gift_funded") continue;
    const key = dayKey(e.timestamp);
    if (!key || key.length !== 10) continue;
    let row = dailyMap.get(key);
    if (!row) {
      row = { date: key, giftsFunded: 0, claimsCompleted: 0, volumeUsdc: 0 };
      dailyMap.set(key, row);
    }
    row.volumeUsdc += formatUsdc(e.amountRaw ?? "0");
  }

  const daily = Array.from(dailyMap.values()).sort((a, b) =>
    a.date < b.date ? -1 : 1
  );

  // Funnel
  const funnelSteps: FunnelStep[] = [
    { label: "Create opened", count: analyticsEvents.filter((e) => e.event === "create_open").length },
    { label: "Gift funded", count: analyticsEvents.filter((e) => e.event === "gift_funded").length },
    { label: "Status viewed", count: analyticsEvents.filter((e) => e.event === "status_open").length },
    { label: "Claim completed", count: analyticsEvents.filter((e) => e.event === "claim_success").length },
  ];

  // Top sources
  const sourceMap = new Map<string, { opens: number; funded: number; claimed: number }>();
  for (const e of analyticsEvents) {
    const src = e.source?.trim() || "direct";
    let row = sourceMap.get(src);
    if (!row) {
      row = { opens: 0, funded: 0, claimed: 0 };
      sourceMap.set(src, row);
    }
    if (e.event === "create_open") row.opens++;
    if (e.event === "gift_funded") row.funded++;
    if (e.event === "claim_success") row.claimed++;
  }

  const topSources = Array.from(sourceMap.entries())
    .map(([source, r]) => ({ source, ...r }))
    .sort((a, b) => b.opens - a.opens)
    .slice(0, 10);

  return { onChain, kpi, daily, funnelSteps, topSources, recentActivity };
}
