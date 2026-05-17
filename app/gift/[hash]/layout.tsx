import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getGiftByHash } from "@/entities/gift/server/gift-service";
import { parseGiftHashInput } from "@/entities/gift/server/gift-validation";

type Props = {
  params: Promise<{ hash: string }>;
  children: ReactNode;
};

const DEFAULT_META = {
  title: "You received a USDC gift",
  description: "Claim your USDC gift — no wallet needed.",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { hash } = await params;
    const input = parseGiftHashInput(hash);
    const result = await getGiftByHash(input);

    if (result.ok) {
      const sender = result.senderDisplayName?.trim();
      const amount = result.amountUsdc;
      const title = sender
        ? `${sender} sent you ${amount} USDC`
        : `You received ${amount} USDC`;
      const description =
        result.giftMessage?.trim() ||
        "Claim your USDC gift on Arc Testnet — no wallet or setup needed.";

      return {
        title,
        description,
        openGraph: { title, description },
        twitter: { title, description },
      };
    }
  } catch {
    // hash invalid or gift not found — fall through to defaults
  }

  return DEFAULT_META;
}

export default function GiftLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
