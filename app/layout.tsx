import type { Metadata } from "next";
import type { ReactNode } from "react";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import HelpManual from "@/components/ui/help-manual";
import ToastContainer from "@/components/ui/toast-container";
import PwaInstallPrompt from "@/components/ui/pwa-install-prompt";
import ServiceWorkerRegistration from "@/components/ui/service-worker-registration";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://linkcash.app"
  ),
  title: {
    default: "LinkCash — Send USDC like a message",
    template: "%s | LinkCash",
  },
  description:
    "Share a link. Recipient signs in with Google or email, gets a Circle wallet, and claims USDC gaslessly on Arc.",
  openGraph: {
    siteName: "LinkCash",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-landing-display",
});

const spaceGroteskBody = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-landing-body",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-landing-mono",
});

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://accounts.google.com" />
        <link rel="preconnect" href="https://oauth2.googleapis.com" />
        <link rel="dns-prefetch" href="https://accounts.google.com" />
        <link rel="dns-prefetch" href="https://oauth2.googleapis.com" />
      </head>
      <body
        className={`${spaceGroteskBody.className} ${spaceGrotesk.variable} ${spaceGroteskBody.variable} ${jetBrainsMono.variable} bg-app antialiased`}
      >
        <Providers>{children}</Providers>
        <HelpManual />
        <ToastContainer />
        <PwaInstallPrompt />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
