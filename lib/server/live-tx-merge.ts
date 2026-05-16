/** Rows shown on the landing “Recent claims” block (deduped, newest first). */
export const LANDING_LIVE_TX_LIMIT = 10;

export type LandingTxExample = {
  txHash: string;
  label: string;
  timestamp: string;
};

export function mergeTxExamples(items: LandingTxExample[]): LandingTxExample[] {
  const seen = new Set<string>();
  return items
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .filter((item) => {
      const key = item.txHash.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, LANDING_LIVE_TX_LIMIT);
}
