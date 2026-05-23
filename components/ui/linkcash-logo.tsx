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
        <linearGradient id="lc-g" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
      </defs>

      <rect width="100" height="100" rx="24" fill="url(#lc-g)" />

      {/* Ring B — "/"  diagonal (−45°), behind, slightly lower-left */}
      <rect
        x="-28" y="-14" width="56" height="28" rx="14"
        fill="none" stroke="white" strokeWidth="11" strokeOpacity="0.55"
        transform="translate(46 54) rotate(-45)"
      />

      {/* Seamless cut: Ring A's body filled with background erases Ring B at crossing */}
      <rect
        x="-28" y="-14" width="56" height="28" rx="14"
        fill="url(#lc-g)"
        transform="translate(54 46) rotate(45)"
      />

      {/* Ring A — "\"  diagonal (+45°), in front, slightly upper-right */}
      <rect
        x="-28" y="-14" width="56" height="28" rx="14"
        fill="none" stroke="white" strokeWidth="11"
        transform="translate(54 46) rotate(45)"
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
        <span style={{ color: "#22c55e" }}>Cash</span>
      </span>
    </span>
  );
}
