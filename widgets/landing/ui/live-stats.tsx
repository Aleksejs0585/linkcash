"use client";

import { useEffect, useRef, useState } from "react";
import type { OnChainStats } from "@/lib/server/on-chain-stats";

function formatUsdcStat(raw: string): string {
  const n = parseFloat(raw);
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K+`;
  return `$${Math.round(n)}+`;
}

function StatNum({ value }: { value: string }) {
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 500);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <span
      className="landing-stat-num"
      style={{
        transition: "opacity 0.3s, transform 0.3s",
        opacity: flash ? 0.5 : 1,
        transform: flash ? "scale(1.08)" : "scale(1)",
        display: "inline-block",
      }}
    >
      {value}
    </span>
  );
}

export default function LiveStats({ initial }: { initial: OnChainStats }) {
  const [stats, setStats] = useState(initial);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats");
        if (!res.ok) return;
        const data = (await res.json()) as OnChainStats;
        setStats(data);
      } catch { /* ignore network errors */ }
    };

    void fetchStats();
    const id = setInterval(() => void fetchStats(), 30_000);
    return () => clearInterval(id);
  }, []);

  const claimedDisplay =
    stats.totalClaimed > 0 ? `${stats.totalClaimed.toLocaleString()}+` : "48+";
  const usdcDisplay =
    parseFloat(stats.totalUsdcClaimed) > 0
      ? formatUsdcStat(stats.totalUsdcClaimed)
      : "$480+";

  return (
    <>
      <div>
        <StatNum value={claimedDisplay} />
        <span className="landing-stat-label">Gifts claimed</span>
      </div>
      <div className="landing-stat-divider" aria-hidden />
      <div>
        <StatNum value={usdcDisplay} />
        <span className="landing-stat-label">USDC gifted</span>
      </div>
    </>
  );
}
