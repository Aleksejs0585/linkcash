export function shortTxHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

export function txStatusLabel(label: string): string {
  if (label.toLowerCase().includes("claim")) return "Claimed";
  if (label.toLowerCase().includes("fund")) return "Funded";
  if (label.toLowerCase().includes("reclaim")) return "Reclaimed";
  return "Onchain";
}

export function txRowIcon(label: string): string {
  if (label.toLowerCase().includes("reclaim")) return "↩️";
  if (label.toLowerCase().includes("fund")) return "💸";
  return "🎁";
}
