import { ImageResponse } from "next/og";
import { BRAND, MARK, WORDMARK, brandTagline, brandUnofficial } from "@/lib/brand";
import { leagueGothicFontData } from "@/assets/fonts/league-gothic-base64";

// Node runtime (the Edge runtime is deprecated). Everything is drawn from code:
// the wordmark is text in an embedded font (src/assets/fonts), so nothing is
// fetched or read from disk and the image never depends on the live site being
// reachable, including at build time, when it is prerendered.
export const alt = `${BRAND.name} — ${BRAND.tagline.en}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The mark tile (MARK in src/lib/brand.ts, same drawing as public/brand/icon.svg). */
function LogoMark({ size: s }: { size: number }) {
  const { size, radius, back, front, backFill, rule } = MARK;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} rx={radius} fill={BRAND.red} />
      <polygon points={back} fill={backFill} />
      <polygon points={front} fill="#ffffff" />
      <rect x={rule.x} y={rule.y} width={rule.width} height={rule.height} fill={BRAND.gold} />
    </svg>
  );
}

export default function OGImage() {
  const wordmarkSize = 132;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "linear-gradient(135deg, #0d0d0d 0%, #141414 62%, #1f0a10 100%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Brand-red edge */}
        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 16, background: BRAND.red }} />

        <div style={{ display: "flex", alignItems: "center", gap: 36, marginBottom: 40 }}>
          <LogoMark size={132} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontFamily: "League Gothic",
                fontSize: wordmarkSize,
                lineHeight: 0.82,
                color: "#ffffff",
                textTransform: "uppercase",
                letterSpacing: wordmarkSize * 0.18,
                display: "flex",
              }}
            >
              {BRAND.name}
            </div>
            <div
              style={{
                width: 132,
                height: wordmarkSize * Number(WORDMARK.bar.thicknessEm),
                marginTop: wordmarkSize * Number(WORDMARK.bar.gapEm),
                background: BRAND.red,
              }}
            />
          </div>
        </div>

        <div style={{ fontSize: 42, fontWeight: 700, color: "#ffffff", lineHeight: 1.2, display: "flex" }}>
          {brandTagline("en")}
        </div>

        <div style={{ fontSize: 26, color: "#a0a0a0", marginTop: 20, display: "flex" }}>
          {brandUnofficial("en")}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "League Gothic",
          data: leagueGothicFontData(),
          weight: 400,
          style: "normal",
        },
      ],
    },
  );
}
