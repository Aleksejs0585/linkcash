import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LinkCash — USDC Gifts",
    short_name: "LinkCash",
    description: "Send USDC with a link. No wallet needed.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a10",
    theme_color: "#0a0a10",
    orientation: "portrait",
    categories: ["finance", "utilities"],
    icons: [
      {
        src: "/linkcash-icon-512.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/linkcash-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Send a gift",
        short_name: "Gift",
        description: "Create a new USDC gift link",
        url: "/create",
        icons: [{ src: "/linkcash-icon-512.png", sizes: "512x512" }],
      },
      {
        name: "My wallet",
        short_name: "Wallet",
        description: "View your USDC balance",
        url: "/wallet",
        icons: [{ src: "/linkcash-icon-512.png", sizes: "512x512" }],
      },
    ],
  };
}
