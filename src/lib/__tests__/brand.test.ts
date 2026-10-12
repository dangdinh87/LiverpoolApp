import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BRAND, MARK, WORDMARK, brandDescription, brandLocale, brandTagline, brandTitle } from "../brand";

describe("brand constant", () => {
  it("keeps the display name and tagline in one place", () => {
    expect(BRAND.name).toBe("Anfield Daily");
    expect(brandTagline("vi")).toBe("Tin Liverpool nhanh · Tổng hợp và tóm tắt mỗi ngày");
    expect(brandTagline("en")).toBe("Liverpool news, fast · Gathered and summed up daily");
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
  const points = (list: string) => list.split(" ").map((p) => p.split(",").map(Number) as [number, number]);

  it("public/brand/icon.svg draws the same mark as MARK (run scripts/build-brand-icons.ts after changing it)", () => {
    const svg = readFileSync(join(process.cwd(), "public/brand/icon.svg"), "utf8");
    expect(svg).toContain(`points="${MARK.back}"`);
    expect(svg).toContain(`points="${MARK.front}"`);
    const { x, y, width, height } = MARK.rule;
    expect(svg).toContain(`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${BRAND.gold}"/>`);
  });

  it("keeps the art inside the maskable safe zone once shrunk", () => {
    const { size, maskableScale, rule } = MARK;
    const c = size / 2;
    const corners = [
      ...points(MARK.back),
      ...points(MARK.front),
      [rule.x, rule.y],
      [rule.x + rule.width, rule.y + rule.height],
    ];
    for (const [x, y] of corners) {
      expect(Math.hypot((x - c) * maskableScale, (y - c) * maskableScale)).toBeLessThanOrEqual(size * 0.4);
    }
  });
});
