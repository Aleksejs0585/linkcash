import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import HelpManual from "../components/ui/help-manual";

const inter = Inter({
  subsets: ["latin"],
});

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-app text-white antialiased`}>
        <Providers>{children}</Providers>
        <HelpManual />
      </body>
    </html>
  );
}
