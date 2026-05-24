import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import "./landing.css";
import { loadLiveTxExamples } from "@/lib/server/load-live-tx-examples";
import { loadOnChainStats } from "@/lib/server/on-chain-stats";
import LandingPage from "@/widgets/landing/ui/landing-page";

export const metadata: Metadata = {
  title: "LinkCash — Send USDC like a message",
  description:
    "Share a link. Recipient signs in with Google or email, gets a Circle wallet, and claims USDC gaslessly on Arc.",
};

export const revalidate = 30;

const getCachedLiveTxExamples = unstable_cache(
  async () => loadLiveTxExamples(),
  ["landing-live-tx-examples-v4"],
  { revalidate: 30 }
);

const getCachedOnChainStats = unstable_cache(
  async () => loadOnChainStats(),
  ["landing-onchain-stats-v1"],
  { revalidate: 300 }
);

export default async function HomePage() {
  const [txExamples, stats] = await Promise.all([
    getCachedLiveTxExamples(),
    getCachedOnChainStats(),
  ]);
  return <LandingPage txExamples={txExamples} stats={stats} />;
}
