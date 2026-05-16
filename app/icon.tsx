import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: 32,
          height: 32,
          borderRadius: 9,
          background: "linear-gradient(135deg, #22c55e, #16a34a)",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 18,
            height: 7,
            borderRadius: 4,
            border: "2.5px solid white",
            top: 8,
            left: 12,
            transform: "rotate(-45deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 18,
            height: 7,
            borderRadius: 4,
            border: "2.5px solid white",
            top: 18,
            left: 2,
            transform: "rotate(-45deg)",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
