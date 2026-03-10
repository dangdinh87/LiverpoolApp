import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Liverpool FC — Anfield's Finest";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0D0D0D 0%, #1a0a0e 40%, #2a0a12 70%, #0D0D0D 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Red accent line at top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, transparent, #C8102E, #F6EB61, #C8102E, transparent)",
          }}
        />

        {/* Crest */}
        <img
          src="https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg"
          alt=""
          width={120}
          height={120}
          style={{ marginBottom: 24 }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: "#FFFFFF",
            letterSpacing: "0.05em",
            lineHeight: 1,
            textAlign: "center",
          }}
        >
          LIVERPOOL FC
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 22,
            color: "#C8102E",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            marginTop: 16,
            fontWeight: 700,
          }}
        >
          You&apos;ll Never Walk Alone
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 18,
            color: "#a0a0a0",
            marginTop: 20,
            textAlign: "center",
            maxWidth: 700,
            lineHeight: 1.5,
          }}
        >
          Squad · Fixtures · Standings · Stats · News · History
        </div>

        {/* Bottom accent */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, transparent, #C8102E, transparent)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
