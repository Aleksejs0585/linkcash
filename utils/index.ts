import { keccak256, randomBytes } from "ethers";

export const ARC_TESTNET = {
  chainId: 5042002,
  chainName: "Arc Testnet",
  rpcUrl: "https://rpc.testnet.arc.network",
  explorerBaseUrl: "https://testnet.arcscan.app",
} as const;

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

export function getArcExplorerTxUrl(txHash: string): string {
  return `${ARC_TESTNET.explorerBaseUrl}/tx/${txHash}`;
}

export function normalizeChainId(chainId?: string | number | null): number | null {
  if (typeof chainId === "number") return chainId;
  if (!chainId) return null;

  if (chainId.startsWith("eip155:")) {
    const value = Number(chainId.split(":")[1]);
    return Number.isNaN(value) ? null : value;
  }

  if (chainId.startsWith("0x")) {
    const value = Number.parseInt(chainId, 16);
    return Number.isNaN(value) ? null : value;
  }

  const value = Number(chainId);
  return Number.isNaN(value) ? null : value;
}
