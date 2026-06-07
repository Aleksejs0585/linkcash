"use client";

import { useId } from "react";

type LogoMarkProps = {
  size?: number;
  className?: string;
};

/**
 * Brand mark — chrome-chain rings on a blue→green gradient tile.
 * Gradient/mask/filter ids are derived from useId() so multiple
 * instances (nav + footer + elsewhere) don't collide.
 */
export default function LogoMark({ size = 28, className }: LogoMarkProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const t = `lm-t-${uid}`;
  const s = `lm-s-${uid}`;
  const bg = `lm-bg-${uid}`;
  const sh = `lm-sh-${uid}`;
  const mk0 = `lm-mk0-${uid}`;
  const mk1 = `lm-mk1-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
      style={{ flexShrink: 0, filter: "drop-shadow(0 2px 9px rgba(59, 142, 240, 0.4))" }}
    >
      <defs>
        <linearGradient id={t} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5BA8FF" />
          <stop offset="1" stopColor="#23B56E" />
        </linearGradient>
        <linearGradient id={s} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".22" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={bg} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7fafc" />
          <stop offset=".16" stopColor="#b7c2cb" />
          <stop offset=".34" stopColor="#697785" />
          <stop offset=".47" stopColor="#f3f8fb" />
          <stop offset=".57" stopColor="#586673" />
          <stop offset=".75" stopColor="#aeb9c3" />
          <stop offset="1" stopColor="#e9eef3" />
        </linearGradient>
        <filter id={sh} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0.5" dy="1.4" stdDeviation="1.4" floodColor="#00111a" floodOpacity="0.55" />
        </filter>
        <mask id={mk0}>
          <rect x="-60" y="-60" width="120" height="120" fill="#fff" />
          <circle cx="0" cy="10.95" r="6.96" fill="#000" />
        </mask>
        <mask id={mk1}>
          <rect x="-60" y="-60" width="120" height="120" fill="#fff" />
          <circle cx="0" cy="-10.95" r="6.96" fill="#000" />
        </mask>
      </defs>

      <rect x="3" y="3" width="94" height="94" rx="24" fill={`url(#${t})`} />
      <rect x="3" y="3" width="94" height="94" rx="24" fill={`url(#${s})`} />

      <g transform="translate(50,50) rotate(45) scale(0.84)" fill="none" strokeLinecap="round">
        <g filter={`url(#${sh})`}>
          <g mask={`url(#${mk0})`}>
            <rect x="-34" y="-13" width="40" height="26" rx="13" stroke="#39454f" strokeWidth="11.6" />
            <rect x="-34" y="-13" width="40" height="26" rx="13" stroke={`url(#${bg})`} strokeWidth="9.2" />
            <rect
              x="-34" y="-13" width="40" height="26" rx="13"
              stroke="#ffffff" strokeWidth="2.3" opacity=".92"
              transform="translate(-0.6,-1)"
            />
          </g>
        </g>
        <g filter={`url(#${sh})`}>
          <g mask={`url(#${mk1})`}>
            <rect x="-6" y="-13" width="40" height="26" rx="13" stroke="#39454f" strokeWidth="11.6" />
            <rect x="-6" y="-13" width="40" height="26" rx="13" stroke={`url(#${bg})`} strokeWidth="9.2" />
            <rect
              x="-6" y="-13" width="40" height="26" rx="13"
              stroke="#ffffff" strokeWidth="2.3" opacity=".92"
              transform="translate(-0.6,-1)"
            />
          </g>
        </g>
      </g>
    </svg>
  );
}
