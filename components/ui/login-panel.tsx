"use client";

import { useState } from "react";
import OAuthNavHint from "./oauth-nav-hint";

type LoginPanelProps = {
  onGoogleLogin: () => void;
  onEmailLogin: (email: string) => Promise<void>;
  googleLabel?: string;
  disabled?: boolean;
  authError?: string | null;
  className?: string;
  buttonSize?: "default" | "large";
};

export default function LoginPanel({
  onGoogleLogin,
  onEmailLogin,
  googleLabel = "Continue with Google",
  disabled,
  authError,
  className,
  buttonSize = "default",
}: LoginPanelProps) {
  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const sizeClass =
    buttonSize === "large"
      ? "px-5 py-3.5 text-base sm:px-6 sm:py-4 sm:text-lg"
      : "px-5 py-3.5 text-base";

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setEmailError(null);
    setEmailLoading(true);
    try {
      await onEmailLogin(trimmed);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Failed to send code.");
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className={`space-y-3 ${className ?? ""}`.trim()}>
      <button
        type="button"
        onClick={onGoogleLogin}
        disabled={disabled || emailLoading}
        className={`accent-gradient w-full rounded-[var(--radius)] ${sizeClass} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {googleLabel}
      </button>

      <OAuthNavHint />

      <div className="flex items-center gap-2 text-xs text-white/30">
        <span className="flex-1 border-t border-white/10" />
        or
        <span className="flex-1 border-t border-white/10" />
      </div>

      <form
        onSubmit={(e) => void handleEmailSubmit(e)}
        className="space-y-2"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          disabled={disabled || emailLoading}
          className="w-full rounded-[var(--radius)] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || emailLoading || !email.trim()}
          className="app-btn-secondary w-full px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {emailLoading ? "Sending code…" : "Continue with email"}
        </button>
      </form>

      {(authError ?? emailError) ? (
        <p className="text-center text-xs text-rose-400">{authError ?? emailError}</p>
      ) : null}
    </div>
  );
}
