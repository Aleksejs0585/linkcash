"use client";

import { useRouter } from "next/navigation";

type BackButtonProps = {
  fallbackHref?: string;
  label?: string;
  className?: string;
};

export default function BackButton({
  fallbackHref = "/",
  label = "Back",
  className,
}: BackButtonProps) {
  const router = useRouter();

  const onBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={onBack}
      className={`inline-flex items-center gap-2 rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-sm text-white/85 transition hover:bg-white/10 ${className ?? ""}`}
    >
      <span aria-hidden>←</span>
      {label}
    </button>
  );
}

