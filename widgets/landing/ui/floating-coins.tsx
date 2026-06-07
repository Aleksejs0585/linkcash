"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

type Coin = {
  id: number;
  size: number;
  duration: number;
  left: number;
  top: number;
  delay: number;
};

const COIN_COUNT = 14;

export default function FloatingCoins() {
  const reduceMotion = useReducedMotion();
  const [coins, setCoins] = useState<Coin[]>([]);

  useEffect(() => {
    if (reduceMotion) return;
    // Random coin layout must be generated client-side only to avoid SSR hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCoins(
      Array.from({ length: COIN_COUNT }, (_, i) => ({
        id: i,
        size: 14 + Math.random() * 26,
        duration: 12 + Math.random() * 14,
        left: Math.random() * 100,
        top: 60 + Math.random() * 60,
        delay: -Math.random() * 16,
      })),
    );
  }, [reduceMotion]);

  if (reduceMotion || coins.length === 0) return null;

  return (
    <div className="landing-bg-coins" aria-hidden>
      {coins.map((coin) => (
        <span
          key={coin.id}
          className="landing-coin"
          style={{
            width: coin.size,
            height: coin.size,
            left: `${coin.left}%`,
            top: `${coin.top}%`,
            animationDuration: `${coin.duration}s`,
            animationDelay: `${coin.delay}s`,
          }}
        >
          <span className="landing-coin-mark" style={{ fontSize: coin.size * 0.5 }}>
            $
          </span>
        </span>
      ))}
    </div>
  );
}
