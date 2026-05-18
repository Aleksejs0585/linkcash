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
    icons: [
      {
        src: "/linkcash-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
