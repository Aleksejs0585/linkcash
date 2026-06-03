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
    if (!open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleToggle = (e: React.MouseEvent) => {
    // Prevent the document-level click handler from immediately closing the menu
    // that was just opened by this button press.
    e.nativeEvent.stopImmediatePropagation();
    setOpen((v) => !v);
  };

  return (
    <div ref={rootRef} className={`relative inline-flex ${className ?? ""}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="main-app-menu"
        onClick={handleToggle}
        className="app-btn-secondary inline-flex items-center gap-2 px-3 py-2 text-sm"
      >
        <HiOutlineMenuAlt2 className="h-5 w-5 shrink-0" aria-hidden />
        Menu
      </button>
      {open ? (
        <div
          id="main-app-menu"
          role="menu"
          aria-orientation="vertical"
          className="absolute left-0 top-full z-[200] mt-2 min-w-[220px] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg2)] py-1 shadow-xl"
        >
          <Link
            href="/"
            role="menuitem"
            className="block rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-[var(--bg3)]"
            onClick={() => setOpen(false)}
          >
            Home
          </Link>
          <Link
            href="/create"
            role="menuitem"
            className="block rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-[var(--bg3)]"
            onClick={() => setOpen(false)}
          >
            Send a gift
          </Link>
          <Link
            href="/request"
            role="menuitem"
            className="block rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-[var(--bg3)]"
            onClick={() => setOpen(false)}
          >
            Request payment
          </Link>
          <Link
            href="/wallet"
            role="menuitem"
            className="block rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-[var(--bg3)]"
            onClick={() => setOpen(false)}
          >
            My wallet
          </Link>
          <Link
            href="/requests"
            role="menuitem"
            className="block rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-[var(--bg3)]"
            onClick={() => setOpen(false)}
          >
            My requests
          </Link>
          <Link
            href="/gifts"
            role="menuitem"
            className="block rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-[var(--bg3)]"
            onClick={() => setOpen(false)}
          >
            Dashboard
          </Link>
          <a
            href={productUrl}
            role="menuitem"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-[var(--bg3)]"
            onClick={() => setOpen(false)}
          >
            Product site
            <span className="ml-1 text-xs text-[var(--muted)]" aria-hidden>
              ↗
            </span>
          </a>
        </div>
      ) : null}
    </div>
  );
}
