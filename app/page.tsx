import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import "./landing.css";
import { claimAuditStore } from "@/lib/server/claim-audit-store";
import { senderGiftStore } from "@/lib/server/sender-gift-store";
import LandingPage, {
  type LandingTxExample,
} from "@/widgets/landing/ui/landing-page";

export const metadata: Metadata = {
  title: "LinkCash — Send USDC like a message",
  description:
    "Share a link. Recipient signs in with Google or X, gets a wallet, and claims USDC gaslessly on Arc.",
};

async function loadLiveTxExamples(): Promise<LandingTxExample[]> {
  const [senderEvents, claimEvents] = await Promise.all([
    senderGiftStore.readRecent(120),
    claimAuditStore.readRecent(240),
  ]);

  const funded = senderEvents
    .filter((event) => event.event === "gift_funded")
    .map((event) => ({
      txHash: event.txHash,
      label: "Gift funded by sender",
      timestamp: event.timestamp,
    }));

  const reclaimed = senderEvents
    .filter((event) => event.event === "gift_reclaimed")
    .map((event) => ({
      txHash: event.txHash,
      label: "Expired gift reclaimed",
      timestamp: event.timestamp,
    }));

  const claimed = claimEvents
    .filter((event) => event.event === "claim_success" && event.txHash)
    .map((event) => ({
      txHash: event.txHash!,
      label: "Recipient claim settled",
      timestamp: event.timestamp,
    }));

  const seen = new Set<string>();
  const merged = [...claimed, ...funded, ...reclaimed]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .filter((item) => {
      const key = item.txHash.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return merged.slice(0, 6);
}

const getCachedLiveTxExamples = unstable_cache(
  async () => loadLiveTxExamples(),
  ["landing-live-tx-examples"],
  { revalidate: 30 }
);

export default async function HomePage() {
  const txExamples = await getCachedLiveTxExamples();
  return <LandingPage txExamples={txExamples} />;
}
