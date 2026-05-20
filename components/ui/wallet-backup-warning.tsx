"use client";

type WalletBackupWarningProps = {
  className?: string;
  variant?: "withWalletLink" | "inlineExportHint";
};

export function WalletBackupWarning({ className, variant = "withWalletLink" }: WalletBackupWarningProps) {
  void variant;
  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/4 px-4 py-3 text-left text-sm text-white/70 ${className ?? ""}`}
    >
      <p className="font-medium text-white/90">🔑 Secured by your Google account</p>
      <p className="mt-1 text-xs leading-relaxed text-white/55">
        No seed phrase. If you lose access — just sign in with Google again.
        Circle never stores your private key.
      </p>
    </div>
  );
}
