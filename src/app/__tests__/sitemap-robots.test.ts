import { describe, expect, it, vi, beforeAll } from "vitest";

/**
 * The sitemap and robots.txt are the two files search engines read before
 * anything else, and both had defects that nothing would have surfaced.
 *
 * The sitemap declared all three hreflang alternates as the English URL on
 * every entry, so it told Google the Vietnamese page lived at the English
 * address and never named a single `/vi/` URL. It also declared a list of the
 * site's own articles and never filled it. robots.txt disallowed every URL with
 * a query string, which stops Google fetching those URLs at all — and so from
 * ever reading the canonical that would have folded them into the clean page.
 *
 * The external calls are stubbed; this is about the document's shape.
 */
vi.mock("@/lib/squad-data", () => ({
  getAllPlayers: () => [{ slug: "alisson-becker" }, { slug: "mohamed-salah" }],
}));
vi.mock("@/lib/news/digest", () => ({
  getAllDigestDates: async () => [{ digest_date: "2026-10-11", generated_at: "2026-10-11T00:00:00Z" }],
}));
vi.mock("@/lib/football", () => ({
  getFixtures: async () => [
    {
      fixture: { id: 560611, date: "2026-10-11T15:30:00Z" },
      teams: { home: { name: "Liverpool" }, away: { name: "Man City" } },
    },
  ],
}));
vi.mock("@/lib/site-articles/db", () => ({
  listSiteArticles: async () => [
    {
      slug: "liverpool-v-man-city-review-2026-10-11",
      published_at: "2026-10-11T20:00:00Z",
      content_en: { title: "Review" },
      content_vi: { title: "Nhận định" },
    },
    // Written in English only: the /vi URL serves the same English text.
    {
      slug: "english-only-preview",
      published_at: "2026-10-10T20:00:00Z",
      content_en: { title: "Preview" },
      content_vi: null,
    },
    // A draft with no date must not reach the sitemap.
    { slug: "unpublished", published_at: null, content_en: { title: "Draft" }, content_vi: null },
  ],
}));

let xml = "";
let robots = "";
let entries: string[] = [];
const locOf = (block: string) => /<loc>(.*?)<\/loc>/.exec(block)?.[1] ?? "";
const altsOf = (block: string) =>
  Object.fromEntries(
    [...block.matchAll(/hreflang="([\w-]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]),
  );

beforeAll(async () => {
  const { GET: sitemapGet } = await import("../sitemap.xml/route");
  xml = await (await sitemapGet()).text();
  entries = [...xml.matchAll(/ {2}<url>[\s\S]*?<\/url>/g)].map((m) => m[0]);

  const { GET: robotsGet } = await import("../robots.txt/route");
  robots = await robotsGet().text();
});

describe("sitemap.xml", () => {
  // Pages that exist in every language; an article written in one language is
  // checked on its own below.
  const bilingual = () => entries.filter((e) => !locOf(e).includes("english-only-preview"));

  it("lists every page once per locale, not just the default one", () => {
    const locs = bilingual().map(locOf);
    const vi = locs.filter((l) => /\/vi(\/|$)/.test(l));
    expect(vi.length).toBeGreaterThan(0);
    // Each page contributes exactly one URL per locale.
    expect(locs.length).toBe(vi.length * 2);
    expect(new Set(locs).size).toBe(locs.length); // no duplicate <loc>
  });

  it("points each hreflang at that language's own URL", () => {
    for (const block of bilingual()) {
      const alts = altsOf(block);
      expect(Object.keys(alts).sort()).toEqual(["en", "vi", "x-default"]);
      // The bug: all three were the same string.
      expect(alts.en, locOf(block)).not.toBe(alts.vi);
      expect(alts.vi, locOf(block)).toMatch(/\/vi(\/|$)/);
      expect(alts.en, locOf(block)).not.toMatch(/\/vi(\/|$)/);
      // x-default is the default locale, which is English.
      expect(alts["x-default"], locOf(block)).toBe(alts.en);
    }
  });

  it("every entry declares itself among its own alternates", () => {
    for (const block of entries) {
      expect(Object.values(altsOf(block)), locOf(block)).toContain(locOf(block));
    }
  });

  it("lists the site's own articles, which it used to declare and never fetch", () => {
    const locs = entries.map(locOf);
    expect(locs.some((l) => l.endsWith("/analysis/liverpool-v-man-city-review-2026-10-11"))).toBe(true);
    expect(locs.some((l) => l.includes("/vi/analysis/liverpool-v-man-city-review-2026-10-11"))).toBe(true);
    // Unpublished rows have no date and must not be submitted.
    expect(locs.some((l) => l.includes("unpublished"))).toBe(false);
  });

  it("lists an article only in the languages it was written in", () => {
    const own = entries.filter((e) => locOf(e).includes("/analysis/english-only-preview"));
    expect(own.map(locOf)).toEqual([expect.stringMatching(/\/analysis\/english-only-preview$/)]);
    expect(own.map(locOf)[0]).not.toContain("/vi/");
    // No hreflang offers a Vietnamese version that does not exist.
    expect(Object.keys(altsOf(own[0]))).toEqual(["en", "x-default"]);
  });

  it("keeps the scraped news mirrors out", () => {
    // They are noindex: listing them would ask for exactly what the noindex
    // is there to prevent.
    const locs = entries.map(locOf);
    expect(locs.some((l) => /\/news\/[a-z0-9-]+\//.test(l) && !l.includes("/news/digest/"))).toBe(false);
  });

  it("escapes anything that would break the XML", () => {
    // Archive URLs carry a query string; a bare & in a <loc> is invalid XML and
    // the whole file is rejected, not just that entry.
    const locs = entries.map(locOf);
    for (const loc of locs) {
      expect(loc, `unescaped & in ${loc}`).not.toMatch(/&(?!amp;|lt;|gt;)/);
    }
  });

  it("is well-formed enough to parse, with the xhtml namespace declared", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(xml.match(/<url>/g)?.length).toBe(xml.match(/<\/url>/g)?.length);
  });
});

// /chat was in both lists until the AI chat was removed (Oct 2026); there is
// no such route now, so blocking it would be fiction.
describe("robots.txt", () => {
  it("does not blanket-block query strings", () => {
    // `Disallow: /*?*` kept Googlebot from ever fetching /news?source=… or
    // /fixtures?view=results, and so from reading their canonicals.
    expect(robots).not.toContain("?");
  });

  it("blocks the routes that are meant to stay out, and allows the rest", () => {
    for (const path of ["/api/", "/profile", "/auth/"]) {
      expect(robots).toContain(`Disallow: ${path}`);
    }
    expect(robots).toContain("Allow: /");
  });

  it("blocks the private routes under the Vietnamese prefix too", () => {
    for (const path of ["/vi/profile", "/vi/auth/"]) {
      expect(robots).toContain(`Disallow: ${path}`);
    }
  });

  it("shuts out SEO-tool crawlers but leaves search engines on the open group", () => {
    const groups = robots.split(/\n\s*\n/);
    const seo = groups.find((g) => /User-agent: SemrushBot/.test(g)) ?? "";
    for (const bot of ["SemrushBot", "AhrefsBot", "MJ12bot", "SERankingBacklinksBot", "DotBot"]) {
      expect(seo).toContain(`User-agent: ${bot}`);
    }
    expect(seo).toMatch(/^Disallow: \/$/m);
    // A search engine named in that group would drop out of the index.
    expect(robots).not.toMatch(/User-agent: (Googlebot|Bingbot|Applebot|OAI-SearchBot)/i);
  });

  it("advertises the sitemap on an absolute URL", () => {
    const line = /^Sitemap: (\S+)$/m.exec(robots);
    expect(line).not.toBeNull();
    expect(() => new URL(line![1])).not.toThrow();
    expect(line![1]).toMatch(/\/sitemap\.xml$/);
  });
});
