"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HiOutlineMenuAlt2 } from "react-icons/hi";
import { getProductSiteUrl } from "@/lib/client/product-site";

type MainMenuProps = {
  className?: string;
};

export default function MainMenu({ className }: MainMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const productUrl = getProductSiteUrl();

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDocPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative inline-flex ${className ?? ""}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="main-app-menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-sm text-white/85 transition hover:bg-white/10"
      >
        <HiOutlineMenuAlt2 className="h-5 w-5 shrink-0" aria-hidden />
        Menu
      </button>
      {open ? (
        <div
          id="main-app-menu"
          role="menu"
          aria-orientation="vertical"
          className="absolute left-0 top-full z-50 mt-2 min-w-[220px] rounded-xl border border-white/15 bg-black/90 py-1 shadow-xl backdrop-blur-md"
        >
          <Link
            href="/"
            role="menuitem"
            className="block rounded-lg px-3 py-2.5 text-left text-sm text-white/90 transition hover:bg-white/10"
            onClick={() => setOpen(false)}
          >
            Home
          </Link>
          <a
            href={productUrl}
            role="menuitem"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg px-3 py-2.5 text-left text-sm text-white/90 transition hover:bg-white/10"
            onClick={() => setOpen(false)}
          >
            Product site
            <span className="ml-1 text-xs text-white/45" aria-hidden>
              ↗
            </span>
          </a>
        </div>
      ) : null}
    </div>
  );
}
