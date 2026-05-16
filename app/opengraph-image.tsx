import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
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
          gap: 80,
          padding: "0 100px",
        }}
      >
        {/* Icon */}
        <div
          style={{
            display: "flex",
            width: 240,
            height: 240,
            borderRadius: 67,
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            flexShrink: 0,
            boxShadow: "0 32px 80px rgba(34,197,94,0.35)",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 135,
              height: 53,
              borderRadius: 30,
              border: "19px solid white",
              top: 60,
              left: 90,
              transform: "rotate(-45deg)",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 135,
              height: 53,
              borderRadius: 30,
              border: "19px solid white",
              top: 135,
              left: 15,
              transform: "rotate(-45deg)",
            }}
          />
        </div>

        {/* Text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: "-4px",
              lineHeight: 1,
            }}
          >
            <span style={{ color: "#ffffff" }}>Link</span>
            <span style={{ color: "#22c55e" }}>Cash</span>
          </div>
          <div
            style={{
              fontSize: 36,
              color: "#8888a0",
              letterSpacing: "-0.5px",
              lineHeight: 1.4,
            }}
          >
            Send crypto like a message.
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 8,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: "#22c55e",
              }}
            />
            <span style={{ fontSize: 22, color: "#555566", letterSpacing: "0.02em" }}>
              Arc Testnet · Gasless USDC · Circle Wallets
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
