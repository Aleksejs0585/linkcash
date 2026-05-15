type LinkCashLogoProps = {
  className?: string;
};

/** Wordmark: Link (main text) + Cash (accent). Use on dark backgrounds. */
export default function LinkCashLogo({ className }: LinkCashLogoProps) {
  return (
    <span className={`linkcash-logo ${className ?? ""}`.trim()}>
      <span className="linkcash-logo-link">Link</span>
      <span className="linkcash-logo-cash">Cash</span>
    </span>
  );
}
