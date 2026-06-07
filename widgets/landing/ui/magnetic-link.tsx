"use client";

import Link from "next/link";
import type { ComponentProps, PointerEvent } from "react";
import { useReducedMotion } from "framer-motion";

type MagneticLinkProps = ComponentProps<typeof Link>;

export default function MagneticLink({ children, style, ...props }: MagneticLinkProps) {
  const reduceMotion = useReducedMotion();

  const handlePointerMove = (e: PointerEvent<HTMLAnchorElement>) => {
    if (reduceMotion || e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left - rect.width / 2;
    const my = e.clientY - rect.top - rect.height / 2;
    el.style.transform = `translate(${(mx * 0.25).toFixed(1)}px, ${(my * 0.35).toFixed(1)}px)`;
  };

  const handlePointerLeave = (e: PointerEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.transform = "";
  };

  return (
    <Link
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{ transition: "transform 0.25s var(--ease)", ...style }}
      {...props}
    >
      {children}
    </Link>
  );
}
