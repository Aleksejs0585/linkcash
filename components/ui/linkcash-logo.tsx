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
        {/* Ring 1 (front) blocks Ring 2 at crossing; Ring 2 stays visible through Ring 1's hole */}
        <mask id="lc-m">
          <rect width="100" height="100" fill="white" />
          <rect x="-33" y="-19" width="66" height="38" rx="19"
            fill="black" transform="translate(63 37) rotate(-45)" />
          <rect x="-20" y="-6" width="40" height="12" rx="6"
            fill="white" transform="translate(63 37) rotate(-45)" />
        </mask>
      </defs>

      <rect width="100" height="100" rx="24" fill="url(#lc-g)" />

      {/* Ring 2 — lower-left, behind Ring 1 */}
      <rect
        x="-26" y="-12" width="52" height="24" rx="12"
        fill="none" stroke="white" strokeWidth="13"
        strokeOpacity="0.72"
        transform="translate(37 63) rotate(-45)"
        mask="url(#lc-m)"
      />

      {/* Ring 1 — upper-right, in front */}
      <rect
        x="-26" y="-12" width="52" height="24" rx="12"
        fill="none" stroke="white" strokeWidth="13"
        transform="translate(63 37) rotate(-45)"
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
