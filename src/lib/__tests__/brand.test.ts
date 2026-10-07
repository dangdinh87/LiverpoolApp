import { describe, expect, it } from "vitest";
import { BRAND, WORDMARK, brandDescription, brandLocale, brandTagline, brandTitle } from "../brand";

describe("brand constant", () => {
  it("keeps the display name and tagline in one place", () => {
    expect(BRAND.name).toBe("Reds Abroad");
    expect(brandTagline("vi")).toBe("Fan Liverpool khắp thế giới · Giờ đá theo giờ của bạn");
    expect(brandTagline("en")).toBe("Liverpool fans everywhere · Kick-off times in your time zone");
  });

  it("falls back to English, the default locale", () => {
    expect(brandLocale("vi")).toBe("vi");
    expect(brandLocale("en")).toBe("en");
    expect(brandLocale("fr")).toBe("en");
    expect(brandTitle("fr")).toBe(`Reds Abroad — ${BRAND.tagline.en}`);
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
