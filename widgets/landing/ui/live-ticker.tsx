import { shortTxHash, txStatusLabel } from "../lib/tx-display";
import type { LandingTxExample } from "@/lib/server/load-live-tx-examples";

type LiveTickerProps = {
  items: LandingTxExample[];
};

function tickerKind(label: string): "claim" | "fund" {
  return label.toLowerCase().includes("fund") ? "fund" : "claim";
}

export default function LiveTicker({ items }: LiveTickerProps) {
  if (items.length === 0) return null;

  const chips = [...items, ...items];

  return (
    <div className="landing-ticker" aria-hidden>
      <div className="landing-ticker-row">
        {chips.map((item, index) => {
          const kind = tickerKind(item.label);
          return (
            <span
              key={`${item.txHash}-${index}`}
              className={`landing-ticker-chip landing-ticker-chip--${kind}`}
            >
              <span className="landing-ticker-dot" aria-hidden />
              <span className="landing-ticker-label">{item.label}</span>
              <span className="landing-ticker-hash">{shortTxHash(item.txHash)}</span>
              <span className="landing-ticker-status">{txStatusLabel(item.label)}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
