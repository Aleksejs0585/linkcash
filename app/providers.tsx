"use client";

import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { PrivyOAuthLocationPatch } from "@/lib/client/privy-oauth-location-patch";

type ProvidersProps = {
  children: ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["google", "twitter"],
        embeddedWallets: {
          ethereum: {
            // Always create an embedded wallet so gifts have a deterministic receiver.
            createOnLogin: "all-users",
          },
        },
      }}
    >
      <PrivyOAuthLocationPatch />
      {children}
    </PrivyProvider>
  );
}
