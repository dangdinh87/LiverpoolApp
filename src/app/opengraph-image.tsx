import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Liverpool FC Việt Nam — Tin tức, Đội hình, Lịch thi đấu";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function OGImage() {
  // Fetch crest as ArrayBuffer for edge runtime compatibility
  const crestData = await fetch(new URL("/assets/lfc/crest-red.png", SITE_URL)).then(
    (res) => res.arrayBuffer()
  );
  const crestBase64 = `data:image/png;base64,${Buffer.from(crestData).toString("base64")}`;

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
          position: "relative",
        }}
      >
        {/* Top accent line */}
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
          src={crestBase64}
          alt=""
          width={140}
          height={254}
          style={{ marginBottom: 20 }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            color: "#FFFFFF",
            letterSpacing: "0.05em",
            lineHeight: 1,
            textAlign: "center",
          }}
        >
          LIVERPOOL FC VIỆT NAM
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 20,
            color: "#F6EB61",
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
            fontSize: 16,
            color: "#a0a0a0",
            marginTop: 16,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Tin tức · Đội hình · Lịch thi đấu · Bảng xếp hạng · Thống kê · Lịch sử
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
