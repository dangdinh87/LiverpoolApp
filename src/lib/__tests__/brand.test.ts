import { describe, expect, it } from "vitest";
import { BRAND, WORDMARK, brandDescription, brandLocale, brandTagline, brandTitle } from "../brand";

describe("brand constant", () => {
  it("keeps the display name and tagline in one place", () => {
    expect(BRAND.name).toBe("LFCVN");
    expect(brandTagline("vi")).toBe("Fan Liverpool Việt Nam · Giờ đá, kết quả, tin nhanh");
    expect(brandTagline("en")).toBe("Liverpool fans in Vietnam · Kick-off times, results, quick news");
  });

  it("falls back to Vietnamese, the default locale", () => {
    expect(brandLocale("vi")).toBe("vi");
    expect(brandLocale("en")).toBe("en");
    expect(brandLocale("fr")).toBe("vi");
    expect(brandTitle("fr")).toBe(`LFCVN — ${BRAND.tagline.vi}`);
  });

  it("says in the description that the site is unofficial", () => {
    expect(brandDescription("vi")).toMatch(/không chính thức/);
    expect(brandDescription("en")).toMatch(/Unofficial/);
  });

  it("never uses the club crest as its own mark", () => {
    for (const path of Object.values(BRAND.assets)) expect(path).not.toMatch(/crest|liverbird/i);
  });

  it("ships the wordmark as path data inside its viewBox", () => {
    expect(WORDMARK.letters.startsWith("M0 100V0")).toBe(true);
    expect(WORDMARK.bar.y + WORDMARK.bar.height).toBe(WORDMARK.height);
  });
});
