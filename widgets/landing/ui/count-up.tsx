"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

const EASE = [0.22, 0.61, 0.36, 1] as const;

type CountUpProps = {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
};

export default function CountUp({
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1.4,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(reduceMotion ? to : 0);

  useEffect(() => {
    if (reduceMotion || !inView) return;
    const controls = animate(0, to, {
      duration,
      ease: EASE,
      onUpdate: (next) => setValue(next),
    });
    return () => controls.stop();
  }, [inView, reduceMotion, to, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}
