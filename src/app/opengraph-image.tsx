import { ImageResponse } from "next/og";
import { BRAND, WORDMARK, brandTagline, brandUnofficial } from "@/lib/brand";

// Node runtime (the Edge runtime is deprecated). Everything is drawn from code:
// the wordmark is path data (src/lib/brand.ts), so nothing is fetched or read
// from disk and the image never depends on the live site being reachable,
// including at build time, when it is prerendered.
export const alt = `${BRAND.name} — ${BRAND.tagline.vi}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const WORDMARK_SCALE = 2.2;

export default function OGImage() {
  const { bar } = WORDMARK;
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

        <svg
          width={WORDMARK.width * WORDMARK_SCALE}
          height={WORDMARK.height * WORDMARK_SCALE}
          viewBox={`0 0 ${WORDMARK.width} ${WORDMARK.height}`}
          style={{ marginBottom: 44 }}
        >
          <path d={WORDMARK.letters} fill="#ffffff" />
          <rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} fill={BRAND.red} />
        </svg>

        <div style={{ fontSize: 42, fontWeight: 700, color: "#ffffff", lineHeight: 1.2, display: "flex" }}>
          {brandTagline("vi")}
        </div>

        <div style={{ fontSize: 26, color: "#a0a0a0", marginTop: 20, display: "flex" }}>
          {brandUnofficial("vi")}
        </div>
      </div>
    ),
    { ...size },
  );
}
