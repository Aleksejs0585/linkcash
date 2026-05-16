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
        <linearGradient id="lc-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="28" fill="url(#lc-g)" />
      {/* Ring 1 — top-right, rotated -45° around its center at (63,37) */}
      <rect
        x="-23"
        y="-10"
        width="46"
        height="20"
        rx="10"
        fill="none"
        stroke="white"
        strokeWidth={9}
        transform="translate(63 37) rotate(-45)"
      />
      {/* Ring 2 — bottom-left, rotated -45° around its center at (37,63) */}
      <rect
        x="-23"
        y="-10"
        width="46"
        height="20"
        rx="10"
        fill="none"
        stroke="white"
        strokeWidth={9}
        transform="translate(37 63) rotate(-45)"
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
