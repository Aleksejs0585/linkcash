"use client";

import { useEffect, useState } from "react";

type Platform = "ios" | "android" | null;

function detectPlatform(): Platform {
  if (typeof window === "undefined") return null;
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
  const isAndroid = /Android/.test(ua);
  const isStandalone =
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone) ||
    window.matchMedia("(display-mode: standalone)").matches;
  if (isStandalone) return null;
  if (isIOS) return "ios";
  if (isAndroid) return "android";
  return null;
}

const DISMISSED_KEY = "pwa_prompt_dismissed";

export default function PwaInstallPrompt() {
  const [platform] = useState<Platform>(() => {
    if (typeof window === "undefined") return null;
    if (sessionStorage.getItem(DISMISSED_KEY)) return null;
    return detectPlatform();
  });
  const [androidPrompt, setAndroidPrompt] = useState<{ prompt: () => void } | null>(null);
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    if (sessionStorage.getItem(DISMISSED_KEY)) return false;
    return detectPlatform() === "ios";
  });

  useEffect(() => {
    if (!platform || platform !== "android") return;
    const handler = (e: Event) => {
      e.preventDefault();
      setAndroidPrompt(e as unknown as { prompt: () => void });
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [platform]);

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  const installAndroid = () => {
    androidPrompt?.prompt();
    dismiss();
  };

  if (!visible || !platform) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl border border-white/15 bg-[#111118]/95 p-4 shadow-2xl backdrop-blur-md">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-2xl">📲</span>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold text-white">Add to Home Screen</p>
          {platform === "ios" ? (
            <p className="text-xs text-white/55">
              Tap <span className="text-white/80">Share</span> then{" "}
              <span className="text-white/80">Add to Home Screen</span> for the best experience.
            </p>
          ) : (
            <p className="text-xs text-white/55">
              Install LinkCash for quick access to your wallet and gifts.
            </p>
          )}
          {platform === "android" && (
            <button
              type="button"
              onClick={installAndroid}
              className="mt-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15"
            >
              Install
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-white/30 hover:text-white/60 text-lg leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
