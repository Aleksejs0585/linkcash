"use client";

import Link from "next/link";

type WalletBackupWarningProps = {
  className?: string;
  /** On /wallet we omit the link and point to the export button instead */
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
      Do not forget to save your wallet seed phrase or private key.
      {variant === "withWalletLink" ? (
        <>
          {" "}
          <Link
            href="/wallet"
            className="text-red-50 underline decoration-red-300/80 underline-offset-2 transition hover:text-white"
          >
            Export from My wallet
          </Link>
          .
        </>
      ) : (
        <> Use the Export wallet button below.</>
      )}
    </p>
  );
}
