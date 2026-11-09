import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0B1220", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <div style={{ color: "#F4F6F8", fontSize: 340, fontWeight: 700, lineHeight: 1, marginTop: -20 }}>L</div>
        <div style={{ position: "absolute", right: 120, top: 150, width: 56, height: 56, borderRadius: 28, background: "#2FBF71" }} />
      </div>
    ),
    size,
  );
}
