import { ImageResponse } from "next/og";
import { LOGO_MARK_DATA_URI } from "@/lib/brand-logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: 180, height: 180 }}>
        <img src={LOGO_MARK_DATA_URI} width={180} height={180} alt="" />
      </div>
    ),
    { ...size },
  );
}
