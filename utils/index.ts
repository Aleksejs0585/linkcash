import { keccak256, randomBytes } from "ethers";

export function generateSecret(): string {
  const bytes = randomBytes(32);
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  return `0x${hex}`;
}

export function generateHash(secret: string): string {
  return keccak256(secret);
}

export function generateLink(hash: string, secret: string): string {
  const base =
    typeof window !== "undefined" ? window.location.origin : "";

  return `${base}/gift/${hash}#${secret}`;
}

export function getSecretFromHash(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.location.hash.replace("#", "").trim();
  return value || null;
}
