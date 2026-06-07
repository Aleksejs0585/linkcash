import { ImageResponse } from "next/og";
import { getGiftByHash } from "@/entities/gift/server/gift-service";
import { parseGiftHashInput } from "@/entities/gift/server/gift-validation";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ hash: string }> };

export default async function GiftOgImage({ params }: Props) {
  const { hash } = await params;

  let sender: string | null = null;
  let amount: string | null = null;
  let message: string | null = null;

  try {
    const input = parseGiftHashInput(hash);
    const result = await getGiftByHash(input);
    if (result.ok) {
      sender = result.senderDisplayName?.trim() || null;
      amount = result.amountUsdc;
      message = result.giftMessage?.trim() || null;
    }
  } catch {
    // fall through to generic image
  }

  const headline = sender ? `${sender} sent you a gift` : "You received a gift";
  const amountLine = amount ? `${amount} USDC` : "USDC Gift";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: 1200,
          height: 630,
          background: "#0a0a0f",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 100px",
          gap: 72,
        }}
      >
        {/* Gift icon */}
        <div
          style={{
            display: "flex",
            width: 220,
            height: 220,
            borderRadius: 60,
            background: "linear-gradient(135deg, #23B56E, #1c8f58)",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 32px 80px rgba(35,181,110,0.35)",
            fontSize: 100,
          }}
        >
          🎁
        </div>

        {/* Text */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 28,
              color: "#7ddcae",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            LinkCash · Arc Testnet
          </div>

          <div
            style={{
              fontSize: sender ? 48 : 56,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-1px",
              lineHeight: 1.15,
            }}
          >
            {headline}
          </div>

          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "#23B56E",
              letterSpacing: "-2px",
              lineHeight: 1,
            }}
          >
            {amountLine}
          </div>

          {message && (
            <div
              style={{
                fontSize: 28,
                color: "#8888a0",
                fontStyle: "italic",
                letterSpacing: "-0.2px",
              }}
            >
              &ldquo;{message.slice(0, 60)}{message.length > 60 ? "…" : ""}&rdquo;
            </div>
          )}

          <div
            style={{
              fontSize: 24,
              color: "#44445a",
              letterSpacing: "0.04em",
              marginTop: 4,
            }}
          >
            Claim with Google → No wallet needed
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
