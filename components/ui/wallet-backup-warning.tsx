"use client";

import Link from "next/link";

type WalletBackupWarningProps = {
  className?: string;
  /** On /wallet we omit the link and point to Circle recovery context instead */
  variant?: "withWalletLink" | "inlineExportHint";
};

export function WalletBackupWarning({
  className,
  variant = "withWalletLink",
}: WalletBackupWarningProps) {
  return (
    <p
      role="alert"
      className={`rounded-xl border border-red-500/75 bg-red-950/55 px-4 py-3 text-center text-sm font-semibold leading-snug text-red-100 shadow-[0_0_28px_rgba(220,38,38,0.18)] ${className ?? ""}`}
    >
      Your funds are in a Circle user-controlled wallet (MPC). Keep access to
      your Google account; lost social access is between you and the provider.
      {variant === "withWalletLink" ? (
        <>
          {" "}
          <Link
            href="/wallet"
            className="text-red-50 underline decoration-red-300/80 underline-offset-2 transition hover:text-white"
          >
            View address on My wallet
          </Link>
          .
        </>
      ) : (
        <> Review your address below before funding large amounts.</>
      )}
    </p>
  );
}
