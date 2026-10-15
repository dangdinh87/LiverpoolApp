import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LfcAdapter, mergeLfcNews, parseLfcCategoryPage, parseLfcNewsSitemap } from "../lfc-adapter";
import { RssAdapter } from "../rss-adapter";
import { RSS_FEEDS } from "../../config";

const fixture = (name: string) => readFileSync(path.resolve(__dirname, "../../__tests__/fixtures", name), "utf8");
const NOW = Date.parse("2026-10-05T01:00:00Z");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// liverpoolfc.com, captured 2026-10-14 after the site moved to the App Router (no __NEXT_DATA__).
describe("LFC adapter", () => {
  const sitemap = parseLfcNewsSitemap(fixture("lfc-sitemap-news-2026-10-14.xml"));
  const cards = [
    ...parseLfcCategoryPage(fixture("lfc-category-men-2026-10-14.html")),
    ...parseLfcCategoryPage(fixture("lfc-category-club-2026-10-14.html")),
  ];
  const items = mergeLfcNews(sitemap, cards);
  const titles = items.map((i) => i.title);

  it("reads every news-sitemap entry with its exact publication time", () => {
    expect(sitemap).toHaveLength(32);
    expect(sitemap[0]).toEqual({
      url: "https://www.liverpoolfc.com/news/kostas-tsimikas-so-grateful-after-captaining-liverpool-at-lask",
      title: "Kostas Tsimikas 'so grateful' after captaining Liverpool at LASK",
      publishedAt: "2026-10-14T21:12:00.000Z",
    });
  });

  it("reads the cards of a category page", () => {
    expect(cards).toHaveLength(24);
    expect(cards[0].url).toBe("https://www.liverpoolfc.com/news/kostas-tsimikas-so-grateful-after-captaining-liverpool-at-lask");
  });

  it("keeps Men and Club stories only: drops Women, Academy and Media Watch rumours", () => {
    expect(titles).toContain("Bradley Barcola scores hat-trick as Liverpool hit six in win at LASK");
    expect(titles).toContain("Team news: Confirmed Liverpool line-up v LASK");
    // Media Watch: other outlets' rumours, which would read as the club's own word.
    expect(titles.some((t) => /€70 million-plus Bundesliga star|strongly in the mix|Alex Scott sale/.test(t))).toBe(false);
    // Women / Academy.
    expect(titles.some((t) => /Gareth Taylor|Youth League|U19s|Cam Williams/.test(t))).toBe(false);
  });

  it("takes the date from the sitemap and the standfirst and image from the card page", () => {
    const report = items.find((i) => i.title.startsWith("Bradley Barcola scores hat-trick"))!;
    expect(report).toMatchObject({
      link: "https://www.liverpoolfc.com/news/bradley-barcola-hat-trick-lask-liverpool-champions-league-match-report",
      pubDate: "2026-10-14T18:42:00.000Z",
      contentSnippet: "Bradley Barcola scored a hat-trick as Liverpool won 6-3 away at LASK in the Champions League.",
      source: "lfc",
      language: "en",
    });
    // The card's <img> asks for the 2338x1315 original; resized to card width.
    expect(report.thumbnail).toBe(
      "https://contentfulproxy.stadion.io/rm6ms1yxue4m/qmYnGJHLhk0Qjz5rNrNrF/057c9bd1ceff713cae82590e4a196747/LASK_match_report_cover_14-10-2026.jpg?fm=webp&fit=fill&f=top&w=640&h=360"
    );
  });

  it("returns newest first", () => {
    const dates = items.map((i) => Date.parse(i.pubDate));
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });
});

describe("LfcAdapter.fetch", () => {
  const pages: Record<string, string> = {
    "https://www.liverpoolfc.com/sitemap-news.xml": fixture("lfc-sitemap-news-2026-10-14.xml"),
    "https://www.liverpoolfc.com/news/category/men": fixture("lfc-category-men-2026-10-14.html"),
    "https://www.liverpoolfc.com/news/category/club": fixture("lfc-category-club-2026-10-14.html"),
  };
  const stubPages = (override: Record<string, { status: number; body?: string }> = {}) =>
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const o = override[url];
      const status = o?.status ?? (pages[url] ? 200 : 404);
      return { ok: status === 200, status, text: async () => o?.body ?? pages[url] ?? "" };
    }));

  it("reports ok with the merged stories", async () => {
    stubPages();
    const adapter = new LfcAdapter();
    const out = await adapter.fetch();
    expect(out.length).toBeGreaterThan(10);
    expect(adapter.status).toEqual({ state: "ok" });
  });

  it("reports the HTTP status when the sitemap is down", async () => {
    stubPages({ "https://www.liverpoolfc.com/sitemap-news.xml": { status: 503 } });
    const adapter = new LfcAdapter();
    expect(await adapter.fetch()).toEqual([]);
    expect(adapter.status).toEqual({ state: "http_error", httpStatus: 503 });
  });

  it("names the page that timed out", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.endsWith("/news/category/men")) throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
      return { ok: true, status: 200, text: async () => pages[url] ?? "" };
    }));
    const adapter = new LfcAdapter();
    expect(await adapter.fetch()).toEqual([]);
    expect(adapter.status?.state).toBe("timeout");
    expect(adapter.status?.error).toContain("/news/category/men");
  });

  it("names the page whose body stalled after the headers arrived", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => ({
      ok: true,
      status: 200,
      text: async () => {
        if (url.endsWith("/news/category/club")) throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
        return pages[url] ?? "";
      },
    })));
    const adapter = new LfcAdapter();
    expect(await adapter.fetch()).toEqual([]);
    expect(adapter.status?.state).toBe("timeout");
    expect(adapter.status?.error).toMatch(/^\/news\/category\/club: body after \d+ms: The operation was aborted/);
  });

  it("reports a parse error when the pages answer 200 but carry no items", async () => {
    stubPages({ "https://www.liverpoolfc.com/news/category/men": { status: 200, body: "<html></html>" }, "https://www.liverpoolfc.com/news/category/club": { status: 200, body: "<html></html>" } });
    const adapter = new LfcAdapter();
    expect(await adapter.fetch()).toEqual([]);
    expect(adapter.status?.state).toBe("parse_error");
  });
});

const rss = (items: string) => `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>${items}</channel></rss>`;
const item = (title: string, link: string, date: string, extra = "") =>
  `<item><title>${title}</title><link>${link}</link><pubDate>${date}</pubDate><description>${extra}</description></item>`;
const stub = (xml: string) => {
  const fn = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => xml });
  vi.stubGlobal("fetch", fn);
  return fn;
};

describe("RssAdapter hygiene", () => {
  const cfg = { url: "https://example.com/rss", source: "thanhnien" as const, language: "vi" as const };
  it("decodes entities in titles/snippets and strips boilerplate", async () => {
    stub(rss(item("Liverpool v&amp;igrave; Klopp&amp;apos;s Anfield", "https://tuoitre.vn/a-1.htm", "Sun, 04 Oct 2026 10:00:00 +0700", "Anfield &amp;amp; The post X appeared first on This Is Anfield.")));
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(NOW);
    const [a] = await new RssAdapter(cfg).fetch();
    expect(a.title).toBe("Liverpool vì Klopp's Anfield");
    expect(a.contentSnippet).toBe("Anfield &");
  });
  it("filters on title + snippet with word boundaries, not on raw HTML", async () => {
    stub(rss(
      item("Tremendous weekend of football", "https://a.com/1", "Sun, 04 Oct 2026 10:00:00 GMT", `&lt;img src="https://cdn.x/leoni9f.jpg"&gt;nothing here`) +
      item("Giovanni Leoni transfer latest", "https://a.com/2", "Sun, 04 Oct 2026 10:00:00 GMT")
    ));
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(NOW);
    const out = await new RssAdapter({ ...cfg, source: "sky", language: "en", filter: "lfc" }).fetch();
    expect(out.map((i) => i.title)).toEqual(["Giovanni Leoni transfer latest"]);
  });
  it("sorts newest first and drops stale items BEFORE the 30-item cap (vietnamnet)", async () => {
    const old = Array.from({ length: 40 }, (_, i) => item(`Liverpool old ${i}`, `https://a.com/old${i}`, "Mon, 03 Aug 2026 10:00:00 +0700")).join("");
    stub(rss(old + item("Liverpool fresh story", "https://a.com/fresh", "Sun, 04 Oct 2026 10:00:00 +0700")));
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(NOW);
    const out = await new RssAdapter({ ...cfg, source: "vietnamnet", filter: "lfc", timeoutMs: 10_000 }).fetch();
    expect(out.map((i) => i.title)).toEqual(["Liverpool fresh story"]);
  });
  it("canonicalises links, drops Sky videos, and never serves a cached feed", async () => {
    const fn = stub(rss(
      item("Liverpool in BBC feed", "https://www.bbc.co.uk/sport/a?at_medium=RSS&amp;at_campaign=rss", "Thu, 01 Oct 2026 12:16:14 GMT")
    ));
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(NOW);
    const bbc = await new RssAdapter({ ...cfg, source: "bbc", language: "en" }).fetch();
    expect(bbc.map((i) => i.link)).toEqual(["https://www.bbc.co.uk/sport/a"]);
    stub(rss(`<item><title>Liverpool video clip</title><link>https://www.skysports.com/watch/video/1/x</link><pubDate>Thu, 01 Oct 2026 22:00:00 BST</pubDate><category>Video</category></item>`));
    expect(await new RssAdapter({ ...cfg, source: "sky", language: "en" }).fetch()).toEqual([]);
    expect(fn.mock.calls[0][1].cache).toBe("no-store");
    expect(fn.mock.calls[0][1]).not.toHaveProperty("next");
  });
  it("reports ok / http_error / timeout / parse_error", async () => {
    stub(rss(item("Liverpool news here", "https://a.com/1", "Sun, 04 Oct 2026 10:00:00 GMT")));
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(NOW);
    const ok = new RssAdapter(cfg); await ok.fetch(); expect(ok.status?.state).toBe("ok");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => "" }));
    const http = new RssAdapter(cfg); await http.fetch(); expect(http.status).toMatchObject({ state: "http_error", httpStatus: 403 });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" })));
    const t = new RssAdapter(cfg); await t.fetch(); expect(t.status?.state).toBe("timeout");
    stub("<html>not xml");
    const p = new RssAdapter(cfg); await p.fetch(); expect(p.status?.state).toBe("parse_error");
  });
});

describe("feed config", () => {
  it("uses redirect-free feed URLs and drops the ~empty MEN feed", () => {
    const urls = RSS_FEEDS.map((f) => f.url);
    expect(urls).toContain("https://www.thisisanfield.com/feed/");
    expect(urls).toContain("https://www.mirror.co.uk/all-about/liverpool-fc/?service=rss");
    expect(urls.some((u) => u.includes("manchestereveningnews"))).toBe(false);
    // The feed list is English-only now: no Vietnamese source to assert on.
    expect(RSS_FEEDS.every((f) => f.language === "en")).toBe(true);
  });
});
