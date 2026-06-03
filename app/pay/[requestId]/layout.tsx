import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requestStore } from "@/lib/server/request-store";

type Props = {
  params: Promise<{ requestId: string }>;
  children: ReactNode;
};

const DEFAULT_META = {
  title: "Payment request",
  description: "Pay with Google sign-in — no wallet or setup needed.",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { requestId } = await params;
    if (!/^[0-9a-f]{24}$/.test(requestId)) return DEFAULT_META;

    const req = await requestStore.read(requestId);
    if (!req) return DEFAULT_META;

    const title = `${req.displayName} is requesting ${req.amountUsdc} USDC`;
    const description =
      req.message?.trim() ||
      "Pay with Google sign-in — no wallet or setup needed.";

    return {
      title,
      description,
      openGraph: { title, description },
      twitter: { card: "summary_large_image", title, description },
    };
  } catch {
    return DEFAULT_META;
  }
}

export default function PayLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
