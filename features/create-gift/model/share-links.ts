"use client";

import type { IconType } from "react-icons";
import {
  FaSnapchatGhost,
  FaTelegramPlane,
  FaWhatsapp,
} from "react-icons/fa";
import { SiGmail } from "react-icons/si";

export type ShareLinkItem = {
  label: string;
  href: string | null;
  icon: IconType;
  iconColor: string;
};

export function buildShareLinks(link: string): ShareLinkItem[] {
  const shareText = "I sent you a USDC gift on LinkCash. Claim it here";
  const encodedLink = encodeURIComponent(link);
  const encodedText = encodeURIComponent(shareText);

  return [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodedText}%20${encodedLink}`,
      icon: FaWhatsapp,
      iconColor: "#25D366",
    },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodedLink}&text=${encodedText}`,
      icon: FaTelegramPlane,
      iconColor: "#229ED9",
    },
    {
      label: "Gmail",
      href: `mailto:?subject=${encodeURIComponent(
        "You received a USDC gift"
      )}&body=${encodedText}%0A${encodedLink}`,
      icon: SiGmail,
      iconColor: "#EA4335",
    },
    {
      label: "Snapchat",
      href: `https://www.snapchat.com/share?link=${encodedLink}`,
      icon: FaSnapchatGhost,
      iconColor: "#FFFC00",
    },
  ];
}

