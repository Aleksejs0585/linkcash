"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

export default function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const el = ref.current;
    if (!el) return;

    let gx = window.innerWidth / 2;
    let gy = window.innerHeight / 2;
    let cx = gx;
    let cy = gy;
    let raf = 0;

    const handlePointerMove = (e: PointerEvent) => {
      gx = e.clientX;
      gy = e.clientY;
      el.style.opacity = "1";
    };

    const loop = () => {
      cx += (gx - cx) * 0.12;
      cy += (gy - cy) * 0.12;
      el.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", handlePointerMove);
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      cancelAnimationFrame(raf);
    };
  }, [reduceMotion]);

  if (reduceMotion) return null;

  return <div ref={ref} className="landing-cursor-glow" aria-hidden />;
}
