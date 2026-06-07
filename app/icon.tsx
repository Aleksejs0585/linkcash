import { ImageResponse } from "next/og";
import { LOGO_MARK_DATA_URI } from "@/lib/brand-logo";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: 32, height: 32 }}>
        <img src={LOGO_MARK_DATA_URI} width={32} height={32} alt="" />
      </div>
    ),
    { ...size },
  );
}
