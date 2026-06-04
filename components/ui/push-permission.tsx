"use client";

import { useEffect, useRef, useState } from "react";

const DISMISSED_KEY = "push_permission_dismissed";

type Props = { walletAddress: string | null };

export default function PushPermission({ walletAddress }: Props) {
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!walletAddress) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "granted") {
      // Already granted — silently subscribe in background
      void ensureSubscribed(walletAddress);
      return;
    }
    if (Notification.permission === "denied") return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    // Show prompt after short delay so it doesn't appear immediately
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, [walletAddress]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  const handleEnable = async () => {
    if (!walletAddress) return;
    setSaving(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await ensureSubscribed(walletAddress);
        setVisible(false);
      } else {
        dismiss();
      }
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl border border-white/15 bg-[#111118]/95 p-4 shadow-2xl backdrop-blur-md">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-2xl">🔔</span>
        <div className="flex-1 space-y-1.5">
          <p className="text-sm font-semibold text-white">Enable notifications</p>
          <p className="text-xs text-white/55">
            Get notified when someone sends you USDC or claims your gift.
          </p>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => void handleEnable()} disabled={saving}
              className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/30 disabled:opacity-60">
              {saving ? "Enabling…" : "Enable"}
            </button>
            <button type="button" onClick={dismiss}
              className="rounded-lg bg-white/8 px-3 py-1.5 text-xs text-white/40 transition hover:bg-white/15">
              Not now
            </button>
          </div>
        </div>
        <button type="button" onClick={dismiss} className="text-white/30 hover:text-white/60 text-lg leading-none">×</button>
      </div>
    </div>
  );
}

async function ensureSubscribed(walletAddress: string) {
  try {
    const reg = await navigator.serviceWorker.ready;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;

    const existing = await reg.pushManager.getSubscription();
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        walletAddress,
        subscription: {
          endpoint: sub.endpoint,
          keys: {
            p256dh: bufferToBase64(sub.getKey("p256dh")!),
            auth: bufferToBase64(sub.getKey("auth")!),
          },
        },
      }),
    });
  } catch { /* SW not ready or push not supported */ }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
