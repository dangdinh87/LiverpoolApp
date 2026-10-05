import { describe, expect, it } from "vitest";
import { articleUrlVariants, canonicalizeArticleUrl } from "../url";
import { decodeArticleSlug, encodeArticleSlug } from "@/lib/news-config";

// Real URL shapes from the Oct 2026 feeds.
const BBC_FEED = "https://www.bbc.co.uk/sport/football/articles/c6e3077kkde3o?at_medium=RSS&at_campaign=rss";
const TIA_FEED = "https://www.thisisanfield.com/2026/10/leny-yoro-talks-liverpool-jeremy-jacquet-transfer/";
const AW_FEED = "https://www.anfieldwatch.co.uk/liverpool-fc/news/liverpool-transfer-news-federico-chiesa/";

/** What the Next router hands the page: query dropped, trailing slash dropped, segments decoded. */
function routerRoundTrip(url: string): string | null {
  const u = new URL(`/news/${encodeArticleSlug(url)}`, "https://app.local");
  const segs = u.pathname.replace(/^\/news\//, "").replace(/\/+$/, "").split("/").map(decodeURIComponent);
  return decodeArticleSlug(segs);
}

describe("canonicalizeArticleUrl", () => {
  it("strips BBC feed tracking params", () => {
    expect(canonicalizeArticleUrl(BBC_FEED)).toBe("https://www.bbc.co.uk/sport/football/articles/c6e3077kkde3o");
  });
  it("drops utm_* / fbclid but keeps meaningful params", () => {
    expect(canonicalizeArticleUrl("https://x.com/a?id=5&utm_source=rss&fbclid=z")).toBe("https://x.com/a?id=5");
  });
  it("drops the trailing slash and fragment, keeps the bare root", () => {
    expect(canonicalizeArticleUrl(TIA_FEED + "#comments")).toBe(TIA_FEED.replace(/\/$/, ""));
    expect(canonicalizeArticleUrl("https://bongda.com.vn/")).toBe("https://bongda.com.vn");
  });
  it("is idempotent and leaves non-URLs alone", () => {
    const once = canonicalizeArticleUrl(BBC_FEED);
    expect(canonicalizeArticleUrl(once)).toBe(once);
    expect(canonicalizeArticleUrl("#")).toBe("#");
  });
});

describe("slug round-trip", () => {
  it.each([BBC_FEED, TIA_FEED, AW_FEED, "https://www.mirror.co.uk/sport/football/news/x-37732928"])(
    "decoded slug equals the canonical stored URL for %s",
    (feedUrl) => {
      const stored = canonicalizeArticleUrl(feedUrl);
      expect(routerRoundTrip(stored)).toBe(stored);
    }
  );
  it("raw feed URLs did NOT round-trip (the bug)", () => {
    expect(routerRoundTrip(TIA_FEED)).not.toBe(TIA_FEED);
    expect(routerRoundTrip(BBC_FEED)).not.toBe(BBC_FEED);
  });
  it("legacy rows are still found through variants of the decoded URL", () => {
    expect(articleUrlVariants(routerRoundTrip(TIA_FEED)!)).toContain(TIA_FEED);
    expect(articleUrlVariants(routerRoundTrip(BBC_FEED)!)).toContain(BBC_FEED);
  });
});

describe("articleUrlVariants", () => {
  it("lists canonical first and the slash spelling", () => {
    const v = articleUrlVariants("https://www.anfieldwatch.co.uk/a/b/");
    expect(v[0]).toBe("https://www.anfieldwatch.co.uk/a/b");
    expect(v).toContain("https://www.anfieldwatch.co.uk/a/b/");
  });
  it("adds the BBC feed suffix only for bbc hosts", () => {
    expect(articleUrlVariants("https://www.bbc.com/sport/x")).toContain("https://www.bbc.com/sport/x?at_medium=RSS&at_campaign=rss");
    expect(articleUrlVariants("https://www.skysports.com/x").some((u) => u.includes("at_medium"))).toBe(false);
  });
});
