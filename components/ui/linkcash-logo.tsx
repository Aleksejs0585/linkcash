import LogoMark from "@/components/ui/logo-mark";

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
  if (iconOnly) return <LogoMark size={size} />;

  return (
    <span
      className={`linkcash-logo ${className ?? ""}`.trim()}
      style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
    >
      <LogoMark size={size} />
      <span
        style={{
          fontFamily: "var(--font-display), var(--font-body), sans-serif",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          fontSize: "inherit",
          color: "var(--text)",
        }}
      >
        LinkCash
      </span>
    </span>
  );
}
