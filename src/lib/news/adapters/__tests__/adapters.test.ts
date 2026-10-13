import { afterEach, describe, expect, it, vi } from "vitest";
import { RssAdapter } from "../rss-adapter";
import { NEWS_USER_AGENT } from "../../http";
import { RSS_FEEDS } from "../../config";

function stubFetch(body: string) {
  const fn = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => body });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});


function rssXml(pubDate: string) {
  return `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>
  <item><title>Liverpool news</title><link>https://www.bbc.co.uk/sport/football/a-1</link><pubDate>${pubDate}</pubDate><description>Liverpool</description></item>
  </channel></rss>`;
}

describe("RssAdapter dates", () => {
  const tuoitre = { url: "https://tuoitre.vn/rss/the-thao.rss", source: "tuoitre" as const, language: "vi" as const };

  it("reads zone-less Vietnamese dates as +07:00 regardless of machine zone", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-04T15:30:00.000Z"));
    stubFetch(rssXml("10/1/2026 12:02:00 PM"));
    const [item] = await new RssAdapter(tuoitre).fetch();
    expect(item.pubDate).toBe("2026-10-01T05:02:00.000Z");
  });

  it("passes a future pubDate through for sync to clamp", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-04T15:30:00.000Z"));
    stubFetch(rssXml("10/4/2026 11:59:00 PM")); // 16:59Z, i.e. in the future
    const [item] = await new RssAdapter(tuoitre).fetch();
    expect(item.pubDate).toBe("2026-10-04T16:59:00.000Z");
  });

  it("sends the shared honest user agent", async () => {
    const fetchMock = stubFetch(rssXml("Sun, 04 Oct 2026 10:00:00 +0700"));
    await new RssAdapter(tuoitre).fetch();
    expect(fetchMock.mock.calls[0][1].headers["User-Agent"]).toBe(NEWS_USER_AGENT);
  });
});

describe("RSS_FEEDS", () => {
  it("only lists feeds verified live (no dead or blocked hosts)", () => {
    const urls = RSS_FEEDS.map((f) => f.url);
    expect(urls).toContain("https://www.skysports.com/rss/11669");
    expect(urls).not.toContain("https://www.skysports.com/rss/12040");
    expect(urls.some((u) => u.includes("independent.co.uk/topic"))).toBe(false);
    expect(urls.some((u) => u.includes("webthethao.vn") || u.includes("thethao247.vn"))).toBe(false);
  });

  it("is English-only: the Vietnamese feeds were dropped for a global audience", () => {
    expect(RSS_FEEDS.length).toBeGreaterThan(0);
    expect(RSS_FEEDS.every((f) => f.language === "en")).toBe(true);
  });
});
