"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HiOutlineMenuAlt2 } from "react-icons/hi";
import { getProductSiteUrl } from "@/lib/client/product-site";

type MainMenuProps = {
  className?: string;
};

export default function MainMenu({ className }: MainMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
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
    e.nativeEvent.stopImmediatePropagation();
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 8, left: rect.left });
    }
    setOpen((v) => !v);
  };

  return (
    <div ref={rootRef} className={`relative inline-flex ${className ?? ""}`}>
      <button
        ref={buttonRef}
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
      {open && typeof document !== "undefined" ? createPortal(
        <div
          id="main-app-menu"
          role="menu"
          aria-orientation="vertical"
          style={{ position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
          className="min-w-[200px] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg2)] py-1.5 shadow-xl"
        >
          {/* Home */}
          <Link href="/" role="menuitem" onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--bg3)]">
            Home
          </Link>

          {/* Send section */}
          <div className="mx-3 my-1.5 border-t border-[var(--border)]" />
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Send</p>
          <Link href="/create" role="menuitem" onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--bg3)]">
            Gift
          </Link>
          <Link href="/bulk" role="menuitem" onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--bg3)]">
            Bulk gifts
          </Link>
          <Link href="/campaign/new" role="menuitem" onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--bg3)]">
            Campaign
          </Link>

          {/* Receive section */}
          <div className="mx-3 my-1.5 border-t border-[var(--border)]" />
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Receive</p>
          <Link href="/request" role="menuitem" onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--bg3)]">
            Request payment
          </Link>
          <Link href="/requests" role="menuitem" onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--bg3)]">
            My requests
          </Link>

          {/* Account section */}
          <div className="mx-3 my-1.5 border-t border-[var(--border)]" />
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Account</p>
          <Link href="/wallet" role="menuitem" onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--bg3)]">
            My wallet
          </Link>
          <Link href="/gifts" role="menuitem" onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--bg3)]">
            Dashboard
          </Link>

          {/* Footer */}
          <div className="mx-3 my-1.5 border-t border-[var(--border)]" />
          <a href={productUrl} role="menuitem" target="_blank" rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-left text-sm text-[var(--muted)] transition hover:bg-[var(--bg3)] hover:text-[var(--fg)]">
            Product site
            <span className="ml-1 text-xs" aria-hidden>↗</span>
          </a>
        </div>,
        document.body
      ) : null}
    </div>
  );
}
