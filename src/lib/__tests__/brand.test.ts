import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BRAND, MARK, WORDMARK, brandDescription, brandLocale, brandTagline, brandTitle } from "../brand";

describe("brand constant", () => {
  it("keeps the display name and tagline in one place", () => {
    expect(BRAND.name).toBe("Anfield Daily");
    expect(brandTagline("vi")).toBe("Tin Liverpool mới nhất, đầy đủ ở một nơi");
    expect(brandTagline("en")).toBe("The latest Liverpool news, all in one place");
  });

  it("falls back to English, the default locale", () => {
    expect(brandLocale("vi")).toBe("vi");
    expect(brandLocale("en")).toBe("en");
    expect(brandLocale("fr")).toBe("en");
    expect(brandTitle("fr")).toBe(`Anfield Daily — ${BRAND.tagline.en}`);
  });

  it("says in the description that the site is unofficial", () => {
    expect(brandDescription("vi")).toMatch(/không chính thức/);
    expect(brandDescription("en")).toMatch(/Unofficial/);
  });

  it("never uses the club crest as its own mark", () => {
    for (const path of Object.values(BRAND.assets)) expect(path).not.toMatch(/crest|liverbird/i);
  });

  it("does not put the club's name or initials in its own name", () => {
    // A fan site carrying the club's marks is the weakest position in a
    // trademark dispute; the rename exists to avoid exactly that.
    expect(BRAND.name).not.toMatch(/liverpool|lfc/i);
  });

  it("describes the wordmark as type, so a rename needs no new artwork", () => {
    // The name used to ship as SVG outlines of its own letters, which meant a
    // rename could not be done in this file alone.
    expect(WORDMARK.letterSpacing).toMatch(/em$/);
    expect(WORDMARK.bar.widthRatio).toBeGreaterThan(0);
    expect(WORDMARK.bar.widthRatio).toBeLessThan(1);
  });
});

describe("mark", () => {
  it("public/brand/icon.svg draws the same mark as MARK (run scripts/build-brand-icons.ts after changing it)", () => {
    const svg = readFileSync(join(process.cwd(), "public/brand/icon.svg"), "utf8");
    const { size, line, circle, spot } = MARK;
    const c = size / 2;
    expect(svg).toContain(`<rect x="${line.x}" y="0" width="${line.width}" height="${size}" fill="#ffffff"/>`);
    expect(svg).toContain(`<circle cx="${c}" cy="${c}" r="${circle.r}" fill="none" stroke="#ffffff" stroke-width="${circle.stroke}"/>`);
    expect(svg).toContain(`<circle cx="${c}" cy="${c}" r="${spot.r}" fill="#ffffff"/>`);
  });

  it("keeps the halfway line vertical and centred, so the mark never reads as the Underground roundel", () => {
    const { size, line } = MARK;
    expect(line.x + line.width / 2).toBeCloseTo(size / 2);
    expect(line.width).toBeLessThan(MARK.circle.r);
  });

  it("keeps the circle inside the maskable safe zone once shrunk (the halfway line is meant to bleed off)", () => {
    const { size, maskableScale, circle } = MARK;
    expect((circle.r + circle.stroke / 2) * maskableScale).toBeLessThanOrEqual(size * 0.4);
  });
});
