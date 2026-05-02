"use client";

const STORAGE_PREFIX = "arc.exp.";

export function getOrAssignVariant(
  experiment: string,
  variants: readonly string[]
): string {
  const fallback = variants[0] ?? "a";
  if (typeof window === "undefined") return fallback;
  if (variants.length === 0) return fallback;

  const search = new URLSearchParams(window.location.search);
  const forced = search.get(`exp_${experiment}`);
  if (forced && variants.includes(forced)) {
    window.localStorage.setItem(`${STORAGE_PREFIX}${experiment}`, forced);
    return forced;
  }

  const key = `${STORAGE_PREFIX}${experiment}`;
  const existing = window.localStorage.getItem(key);
  if (existing && variants.includes(existing)) {
    return existing;
  }

  const assigned = variants[Math.floor(Math.random() * variants.length)] ?? fallback;
  window.localStorage.setItem(key, assigned);
  return assigned;
}

