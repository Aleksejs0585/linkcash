import type { ReactNode } from "react";
import { DM_Sans, Inter, Syne } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import HelpManual from "../components/ui/help-manual";

const inter = Inter({
  subsets: ["latin"],
});

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
        className={`${inter.className} ${syne.variable} ${dmSans.variable} bg-app text-white antialiased`}
      >
        <Providers>{children}</Providers>
        <HelpManual />
      </body>
    </html>
  );
}
