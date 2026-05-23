type LinkCashLogoProps = {
  className?: string;
  iconOnly?: boolean;
  size?: number;
};

export default function LinkCashLogo({
  className,
  iconOnly = false,
  size = 28,
}: LinkCashLogoProps) {
  // Two pill-shaped rings, coaxial at -45°, centered at (62,38) and (38,62).
  // Ring1 (upper) is in front — SVG mask hides Ring2 where Ring1's stroke
  // overlaps, but keeps Ring2 visible through Ring1's inner hole so the
  // interlocking chain-link effect is clear.
  const icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="lc-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5b47f5" />
          <stop offset="100%" stopColor="#00c48c" />
        </linearGradient>
        {/* Mask: hide Ring2 where Ring1's stroke is; show Ring2 through Ring1's hole */}
        <mask id="lc-m">
          <rect width="100" height="100" fill="white" />
          {/* Ring1 outer boundary — black = Ring1 stroke blocks Ring2 */}
          <rect
            x="-32" y="-18" width="64" height="36" rx="18"
            fill="black"
            transform="translate(62 38) rotate(-45)"
          />
          {/* Ring1 inner hole — white = Ring2 peeks through */}
          <rect
            x="-20" y="-6" width="40" height="12" rx="6"
            fill="white"
            transform="translate(62 38) rotate(-45)"
          />
        </mask>
      </defs>

      <rect width="100" height="100" rx="22" fill="url(#lc-bg)" />

      {/* Ring 2 — lower-left, behind at crossing */}
      <rect
        x="-26" y="-12" width="52" height="24" rx="12"
        fill="none" stroke="white" strokeWidth="12"
        transform="translate(38 62) rotate(-45)"
        mask="url(#lc-m)"
      />

      {/* Ring 1 — upper-right, in front */}
      <rect
        x="-26" y="-12" width="52" height="24" rx="12"
        fill="none" stroke="white" strokeWidth="12"
        transform="translate(62 38) rotate(-45)"
      />
    </svg>
  );

  if (iconOnly) return icon;

  return (
    <span
      className={`linkcash-logo ${className ?? ""}`.trim()}
      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
    >
      {icon}
      <span
        style={{
          fontFamily: "Inter, var(--font-body), sans-serif",
          fontWeight: 800,
          letterSpacing: "-2px",
          lineHeight: 1,
          fontSize: "inherit",
        }}
      >
        <span style={{ color: "#ffffff" }}>Link</span>
        <span style={{ color: "#00e5a0" }}>Cash</span>
      </span>
    </span>
  );
}
