"use client";

import type { ReactNode } from "react";
import { CircleWalletProvider } from "@/features/circle-wallet/model/circle-wallet-provider";

type ProvidersProps = {
  children: ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  return <CircleWalletProvider>{children}</CircleWalletProvider>;
}
