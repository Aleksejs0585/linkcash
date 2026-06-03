import { ImageResponse } from "next/og";
import { requestStore } from "@/lib/server/request-store";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ requestId: string }> };

export default async function PayOgImage({ params }: Props) {
  const { requestId } = await params;

  let displayName: string | null = null;
  let amountUsdc: string | null = null;
  let message: string | null = null;

  try {
    if (/^[0-9a-f]{24}$/.test(requestId)) {
      const req = await requestStore.read(requestId);
      if (req) {
        displayName = req.displayName.trim() || null;
        amountUsdc = req.amountUsdc;
        message = req.message?.trim() || null;
      }
    }
  } catch {
    // fall through to generic image
  }

  const headline = displayName
    ? `${displayName} is requesting`
    : "Payment request";
  const amountLine = amountUsdc ? `${amountUsdc} USDC` : "USDC";

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
        {/* Icon */}
        <div
          style={{
            display: "flex",
            width: 200,
            height: 200,
            borderRadius: 56,
            background: "linear-gradient(135deg, #22c55e22, #16a34a22)",
            border: "2px solid #22c55e44",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: 88,
          }}
        >
          💸
        </div>

        {/* Text */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              fontSize: 26,
              color: "#6ee7a0",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            LinkCash · Arc Testnet
          </div>

          <div
            style={{
              fontSize: displayName ? 50 : 58,
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
              fontSize: 80,
              fontWeight: 800,
              color: "#22c55e",
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
            Pay with Google → No wallet needed
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
