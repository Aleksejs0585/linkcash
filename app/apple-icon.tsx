import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: 180,
          height: 180,
          borderRadius: 50,
          background: "linear-gradient(135deg, #22c55e, #16a34a)",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 101,
            height: 39,
            borderRadius: 22,
            border: "14px solid white",
            top: 45,
            left: 68,
            transform: "rotate(-45deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 101,
            height: 39,
            borderRadius: 22,
            border: "14px solid white",
            top: 101,
            left: 11,
            transform: "rotate(-45deg)",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
