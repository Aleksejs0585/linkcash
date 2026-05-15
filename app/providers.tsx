"use client";

import type { ReactNode } from "react";
import OAuthReturnResume from "@/components/ui/oauth-return-resume";
import { CircleWalletProvider } from "@/features/circle-wallet/model/circle-wallet-provider";

type ProvidersProps = {
  children: ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  return (
    <CircleWalletProvider>
      <OAuthReturnResume />
      {children}
    </CircleWalletProvider>
  );
}
