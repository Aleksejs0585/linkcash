import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Sans, Syne } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import HelpManual from "@/components/ui/help-manual";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://linkcash.app"
  ),
};

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-landing-display",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-landing-body",
});

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.className} ${syne.variable} ${dmSans.variable} bg-app antialiased`}
      >
        <Providers>{children}</Providers>
        <HelpManual />
      </body>
    </html>
  );
}
