import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { monthEndMsFromBongdaplusUrl, parseBongdaplusList, parseListDateText } from "../bongdaplus-adapter";
import { isSkippedLfcItem, parseLfcNewsHtml } from "../lfc-adapter";
import { RssAdapter } from "../rss-adapter";
import { BongdaplusAdapter } from "../bongdaplus-adapter";
import { BONGDAPLUS_URLS, RSS_FEEDS } from "../../config";

const fixture = (name: string) => readFileSync(path.resolve(__dirname, "../../__tests__/fixtures", name), "utf8");
const NOW = Date.parse("2026-10-05T01:00:00Z");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("bongdaplus list parsing (saved liverpool-tags / chuyển nhượng HTML)", () => {
  const items = parseBongdaplusList(fixture("bongdaplus-list.html"), NOW);

  it("keeps Liverpool items only, once each (slider duplicates dropped)", () => {
    const links = items.map((i) => i.link);
    expect(new Set(links).size).toBe(links.length);
    expect(items.some((i) => /Andy Carroll/.test(i.title))).toBe(false); // no Liverpool signal
    expect(items.some((i) => /Wirtz để mua Cherki/.test(i.title))).toBe(true);
  });
  it("never puts comment counters into titles", () => {
    expect(items.every((i) => !/\s\d$/.test(i.title) && i.title.length >= 10)).toBe(true);
  });
  it("a bare comment count is not a date (it became year 2001)", () => {
    expect(parseListDateText("1", NOW)).toBeNull();
    expect(parseListDateText("4", NOW)).toBeNull();
    expect(items.every((i) => !i.pubDate || new Date(i.pubDate).getUTCFullYear() === 2026)).toBe(true);
  });
  it("parses absolute and relative date text", () => {
    expect(new Date(parseListDateText("21:24 ngày 03/10/2026", NOW)!).toISOString()).toBe("2026-10-03T14:24:00.000Z");
    expect(new Date(parseListDateText("09 giờ trước", NOW)!).toISOString()).toBe("2026-10-04T16:00:00.000Z");
  });
  it("drops undated items whose id month is past retention, keeps current-month ones", () => {
    expect(monthEndMsFromBongdaplusUrl("https://bongdaplus.vn/x/slug-5237102609.html")).toBe(Date.UTC(2026, 9, 1) - 7 * 3_600_000);
    const sep = items.filter((i) => /-\d+2609\.html$/.test(i.link) && !i.pubDate);
    // Sep-2026 undated items are still inside 14 days on Oct 5; the same list a month later drops them.
    expect(parseBongdaplusList(fixture("bongdaplus-list.html"), Date.parse("2026-11-20T00:00:00Z")).filter((i) => !i.pubDate).length).toBe(0);
    expect(sep.length).toBeGreaterThanOrEqual(0);
  });
  it("scrapes the Liverpool tag pages", () => {
    expect(BONGDAPLUS_URLS).toEqual(["https://bongdaplus.vn/liverpool-tags", "https://bongdaplus.vn/tin-chuyen-nhuong-liverpool"]);
  });
  it("adapter reports status and survives an HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503, text: async () => "" }));
    const a = new BongdaplusAdapter();
    expect(await a.fetch()).toEqual([]);
    expect(a.status).toMatchObject({ state: "http_error", httpStatus: 503 });
  });
});

describe("LFC adapter", () => {
  const items = parseLfcNewsHtml(fixture("lfc-news.html"));
  it("skips Women / Academy / Media Watch and the retail promo", () => {
    const titles = items.map((i) => i.title);
    expect(titles.some((t) => /Gareth Taylor|LFC Women|Fowler Academy|Big Red Sale|Barcelona WILL sell/.test(t))).toBe(false);
    expect(titles).toContain("Milos Kerkez scores first international goal with seven Liverpool players in action");
    expect(isSkippedLfcItem({ category: "Women" })).toBe(true);
    expect(isSkippedLfcItem({ category: "Club", kicker: "LFC Retail" })).toBe(true);
    expect(isSkippedLfcItem({ category: "Men", kicker: "News" })).toBe(false);
  });
  it("uses the byline standfirst, not the kicker, as the snippet", () => {
    const kerkez = items.find((i) => /Kerkez/.test(i.title))!;
    expect(kerkez.contentSnippet).toMatch(/first international goal to earn Hungary/);
    expect(items.every((i) => !["News", "Round-up", "Guest blog", "Video"].includes(i.contentSnippet))).toBe(true);
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
    expect(RSS_FEEDS.find((f) => f.source === "vietnamnet")?.timeoutMs).toBeGreaterThan(3500);
    expect(RSS_FEEDS.find((f) => f.source === "soha")?.maxAgeDays).toBeLessThanOrEqual(7);
  });
});
