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
  // Horizontal chain link: Ring L (left, in front) + Ring R (right, passes through L).
  // SVG mask hides Ring R where Ring L's stroke is on top,
  // but reveals Ring R inside Ring L's opening — true interlocking effect.
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
        {/* Mask: hide Ring R behind Ring L's stroke, show Ring R through Ring L's hole */}
        <mask id="lc-m">
          <rect width="100" height="100" fill="white" />
          {/* Ring L outer boundary → black = Ring L stroke blocks Ring R */}
          <rect
            x="-30" y="-20" width="60" height="40" rx="20"
            fill="black"
            transform="translate(33 50)"
          />
          {/* Ring L inner hole → white = Ring R peeks through */}
          <rect
            x="-19" y="-9" width="38" height="18" rx="9"
            fill="white"
            transform="translate(33 50)"
          />
        </mask>
      </defs>

      <rect width="100" height="100" rx="22" fill="url(#lc-bg)" />

      {/* Ring R — right link, behind Ring L at crossing */}
      <rect
        x="-24" y="-14" width="48" height="28" rx="14"
        fill="none" stroke="white" strokeWidth="11"
        strokeOpacity="0.75"
        transform="translate(67 50)"
        mask="url(#lc-m)"
      />

      {/* Ring L — left link, in front */}
      <rect
        x="-24" y="-14" width="48" height="28" rx="14"
        fill="none" stroke="white" strokeWidth="11"
        transform="translate(33 50)"
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
