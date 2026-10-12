import { ImageResponse } from "next/og";
import { BRAND, MARK, WORDMARK } from "@/lib/brand";
import { leagueGothicFontData } from "@/assets/fonts/league-gothic-base64";

/**
 * The share card for a single story.
 *
 * Every page on the site used to fall back to the one generic brand card at
 * /opengraph-image — the same logo and tagline whether you shared the home page
 * or a particular match report. Google's Discover guidance says the opposite in
 * as many words: "avoid generic images such as logos and text-heavy images".
 * A card carrying the headline is what makes a link look like a story.
 *
 * Drawn entirely from code, like the brand card: the wordmark is text in an
 * embedded font, so nothing is fetched and nothing is read from disk, and the
 * image still renders when the site itself is unreachable — including at build
 * time, when these are prerendered.
 */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

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

/**
 * Headline size by length, so a long one still fits the card.
 *
 * Satori has no text measurement to lay out against, so this is chosen from the
 * character count: the alternative is a headline running off the bottom edge.
 */
function headlineSize(length: number): number {
  if (length <= 60) return 68;
  if (length <= 100) return 56;
  if (length <= 150) return 46;
  return 38;
}

/** Trim to whole words — a card ending mid-word reads as broken, not as truncated. */
function clamp(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function renderStoryCard({
  kicker,
  headline,
  footer,
}: {
  /** Small line above the headline — the section, or the date. */
  kicker: string;
  headline: string;
  /** Small line at the bottom; the brand name when nothing better fits. */
  footer?: string;
}) {
  const text = clamp(headline, 180);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
          background: "linear-gradient(135deg, #0d0d0d 0%, #141414 62%, #1f0a10 100%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 16, background: BRAND.red }} />

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <LogoMark size={56} />
          <div
            style={{
              fontFamily: "League Gothic",
              fontSize: 52,
              lineHeight: 0.82,
              color: "#ffffff",
              textTransform: "uppercase",
              letterSpacing: 52 * Number(WORDMARK.bar.thicknessEm) * 2,
              display: "flex",
            }}
          >
            {BRAND.name}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {kicker && (
            <div
              style={{
                fontSize: 24,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: BRAND.gold,
                marginBottom: 18,
                display: "flex",
              }}
            >
              {clamp(kicker, 48)}
            </div>
          )}
          <div
            style={{
              fontSize: headlineSize(text.length),
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.14,
              display: "flex",
            }}
          >
            {text}
          </div>
        </div>

        <div style={{ fontSize: 22, color: "#a0a0a0", display: "flex" }}>{footer ?? BRAND.name}</div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "League Gothic", data: leagueGothicFontData(), weight: 400, style: "normal" },
      ],
    },
  );
}
