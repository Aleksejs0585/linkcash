"use client";

import { useEffect, useState } from "react";
import { readLoginMethod } from "@/lib/client/google-display-name";
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
  const [lastUsed, setLastUsed] = useState<"google" | "email" | null>(null);

  useEffect(() => {
    setLastUsed(readLoginMethod());
  }, []);

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
      <div className="relative">
        <button
          type="button"
          onClick={onGoogleLogin}
          disabled={disabled || emailLoading}
          className={`accent-gradient w-full rounded-[var(--radius)] ${sizeClass} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {googleLabel}
        </button>
        {lastUsed === "google" && (
          <span className="absolute -top-2 right-3 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50">
            last used
          </span>
        )}
      </div>

      <OAuthNavHint />

      <div className="flex items-center gap-2 text-xs text-white/30">
        <span className="flex-1 border-t border-white/10" />
        or
        <span className="flex-1 border-t border-white/10" />
      </div>

      <div className="relative">
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
            className="w-full rounded-[var(--radius)] border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder-white/30 focus:border-white/30 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={disabled || emailLoading || !email.trim()}
            className="app-btn-secondary w-full px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {emailLoading ? "Sending code…" : "Continue with email"}
          </button>
        </form>
        {lastUsed === "email" && (
          <span className="absolute -top-2 right-3 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50">
            last used
          </span>
        )}
      </div>

      {(authError ?? emailError) ? (
        <p className="text-center text-xs text-rose-400">{authError ?? emailError}</p>
      ) : null}
    </div>
  );
}
