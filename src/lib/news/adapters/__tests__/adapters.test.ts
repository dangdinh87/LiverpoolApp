import { afterEach, describe, expect, it, vi } from "vitest";
import { BongdaplusAdapter } from "../bongdaplus-adapter";
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

const BDP_HTML = `
<ul class="lst">
  <li class="news">
    <a class="thumb" href="/ngoai-hang-anh/liverpool-thang-lon-5242452610.html"><img alt="Liverpool thắng lớn trước Chelsea" src="https://cdn.bongdaplus.vn/a.jpg" /></a>
    <a class="title" href="/ngoai-hang-anh/liverpool-thang-lon-5242452610.html">
      Liverpool thắng lớn trước Chelsea
    </a>
    <span class="info"><span> 15 giờ trước</span></span>
  </li>
  <li class="news">
    <a class="thumb" href="/ngoai-hang-anh/liverpool-mua-tien-ve-5241972610.html"><img alt="Liverpool mua tiền vệ mới từ Bundesliga" src="https://cdn.bongdaplus.vn/b.jpg" /></a>
    <span class="info"><span>18:20 ngày 03/10/2026</span></span>
  </li>
  <li class="news">
    <a class="thumb" href="/ngoai-hang-anh/arsenal-thang-5241000000.html"><img alt="Arsenal thắng trận" src="https://cdn.bongdaplus.vn/c.jpg" /></a>
    <a class="title" href="/ngoai-hang-anh/arsenal-thang-5241000000.html">Arsenal thắng trận</a>
  </li>
</ul>`;

describe("BongdaplusAdapter", () => {
  it("takes titles from a.title or img[alt] (not the empty a.thumb) and parses dates", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-04T15:30:00.000Z"));
    const fetchMock = stubFetch(BDP_HTML);

    const items = await new BongdaplusAdapter().fetch();
    // Both configured URLs return the same HTML; compare the first page only.
    const first = items.slice(0, 2);
    expect(first[0].title).toBe("Liverpool thắng lớn trước Chelsea");
    expect(first[0].pubDate).toBe("2026-10-04T00:30:00.000Z");
    expect(first[1].title).toBe("Liverpool mua tiền vệ mới từ Bundesliga"); // img[alt] fallback
    expect(first[1].pubDate).toBe("2026-10-03T11:20:00.000Z");
    expect(items.every((i) => i.title.length >= 10)).toBe(true);
    expect(fetchMock.mock.calls[0][1].headers["User-Agent"]).toBe(NEWS_USER_AGENT);
  });
});

function rssXml(pubDate: string) {
  return `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>
  <item><title>Liverpool news</title><link>https://tuoitre.vn/a-1.htm</link><pubDate>${pubDate}</pubDate><description>Liverpool</description></item>
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
    expect(urls).toContain("https://vietnamnet.vn/rss/the-thao/bong-da-quoc-te.rss");
  });
});
