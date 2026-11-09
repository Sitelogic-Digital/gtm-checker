import { ImageResponse } from "next/og";

export const alt = "Lactiq — Lactate testing for everyday runners";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return await (await fetch(url)).arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OgImage() {
  const [bold, regular] = await Promise.all([loadFont("Barlow+Semi+Condensed", 700), loadFont("Barlow", 500)]);
  const fonts = [
    ...(bold ? [{ name: "Barlow Semi Condensed", data: bold, weight: 700 as const }] : []),
    ...(regular ? [{ name: "Barlow", data: regular, weight: 500 as const }] : []),
  ];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#0B1220", color: "#F4F6F8", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, fontFamily: "Barlow Semi Condensed" }}>
        <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: "-0.02em", display: "flex" }}>Lactiq</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 108, fontWeight: 700, lineHeight: 1.02, letterSpacing: "-0.01em", maxWidth: 900, display: "flex" }}>
            Lactate testing for everyday runners.
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 40, fontFamily: "Barlow", fontSize: 30, color: "#9AA8B8" }}>
            <div style={{ width: 16, height: 16, borderRadius: 8, background: "#2FBF71", marginRight: 16, display: "flex" }} />
            Launching for the spring marathon season
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
