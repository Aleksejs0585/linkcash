"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HiOutlineMenuAlt2 } from "react-icons/hi";
import { getProductSiteUrl } from "@/lib/client/product-site";

function MenuItem({ href, label, desc, onClick }: { href: string; label: string; desc: string; onClick: () => void }) {
  return (
    <Link href={href} role="menuitem" onClick={onClick}
      className="block rounded-lg px-3 py-2 text-left transition hover:bg-[var(--bg3)]">
      <span className="block text-sm leading-tight">{label}</span>
      <span className="block text-[11px] text-[var(--muted)] leading-tight mt-0.5">{desc}</span>
    </Link>
  );
}

function MenuDivider({ label }: { label: string }) {
  return (
    <>
      <div className="mx-3 my-1.5 border-t border-[var(--border)]" />
      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</p>
    </>
  );
}

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
          className="min-w-[240px] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg2)] py-1.5 shadow-xl"
        >
          {/* Home */}
          <MenuItem href="/" label="Home" desc="Landing page" onClick={() => setOpen(false)} />

          {/* Send section */}
          <MenuDivider label="Send" />
          <MenuItem href="/create" label="Gift" desc="One link → one recipient claims USDC" onClick={() => setOpen(false)} />
          <MenuItem href="/bulk" label="Bulk gifts" desc="N links in one transaction, share individually" onClick={() => setOpen(false)} />
          <MenuItem href="/campaign/new" label="Campaign" desc="One link for everyone, tracks who claimed" onClick={() => setOpen(false)} />
          <MenuItem href="/campaigns" label="My campaigns" desc="Status and claim history for all campaigns" onClick={() => setOpen(false)} />

          {/* Receive section */}
          <MenuDivider label="Receive" />
          <MenuItem href="/request" label="Request payment" desc="Pay-me link — payer confirms once" onClick={() => setOpen(false)} />
          <MenuItem href="/requests" label="My requests" desc="History + paid / active status" onClick={() => setOpen(false)} />

          {/* Account section */}
          <MenuDivider label="Account" />
          <MenuItem href="/wallet" label="My wallet" desc="USDC balance and received gifts" onClick={() => setOpen(false)} />
          <MenuItem href="/gifts" label="Dashboard" desc="All sent gifts — claimed / active / expired" onClick={() => setOpen(false)} />

          {/* Footer */}
          <div className="mx-3 my-1.5 border-t border-[var(--border)]" />
          <a href={productUrl} role="menuitem" target="_blank" rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-left text-sm text-[var(--muted)] transition hover:bg-[var(--bg3)] hover:text-[var(--fg)]">
            Product site <span className="text-xs" aria-hidden>↗</span>
          </a>
        </div>,
        document.body
      ) : null}
    </div>
  );
}
