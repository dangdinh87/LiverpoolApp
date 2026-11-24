import { afterEach, describe, expect, it, vi } from "vitest";
import { BlueskyAdapter, parseBlueskyXml } from "../bluesky-adapter";

const NOW = Date.parse("2026-11-23T12:00:00.000Z");

const BLUESKY_GORST_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>@ptgorst.bsky.social - Paul Gorst</title>
    <item>
      <link>https://bsky.app/profile/ptgorst.bsky.social/post/3n2wjprrwbs2i</link>
      <description>Verdict from Anfield as Liverpool brush aside Manchester United in front of the Kop. tinyurl.com/4us5euae https://tinyurl.com/4us5euae</description>
      <pubDate>22 Nov 2026 21:11 +0000</pubDate>
    </item>
    <item>
      <link>https://bsky.app/profile/ptgorst.bsky.social/post/reply1</link>
      <description>@someone Agree with you completely on that point.</description>
      <pubDate>22 Nov 2026 20:00 +0000</pubDate>
    </item>
    <item>
      <link>https://bsky.app/profile/ptgorst.bsky.social/post/short1</link>
      <description>Full time.</description>
      <pubDate>22 Nov 2026 19:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

const BLUESKY_ORNSTEIN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>@david-ornstein.bsky.social - David Ornstein</title>
    <item>
      <link>https://bsky.app/profile/david-ornstein.bsky.social/post/lfc1</link>
      <description>EXCL: Liverpool advancing on contract extension talks at Anfield ahead of the January window.</description>
      <pubDate>22 Nov 2026 15:00 +0000</pubDate>
    </item>
    <item>
      <link>https://bsky.app/profile/david-ornstein.bsky.social/post/afc1</link>
      <description>Arsenal complete agreement with defensive target ahead of north London derby.</description>
      <pubDate>22 Nov 2026 14:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

describe("parseBlueskyXml", () => {
  it("extracts post text from description, strips trailing URLs, skips replies and short posts", async () => {
    const items = await parseBlueskyXml(
      BLUESKY_GORST_XML,
      { handle: "ptgorst.bsky.social", source: "bsky-gorst", authorName: "Paul Gorst" },
      NOW,
    );
    expect(items).toHaveLength(1);
    expect(items[0].source).toBe("bsky-gorst");
    expect(items[0].author).toBe("Paul Gorst");
    expect(items[0].tags).toEqual(["@ptgorst.bsky.social"]);
    expect(items[0].title).toBe(
      "Verdict from Anfield as Liverpool brush aside Manchester United in front of the Kop.",
    );
  });

  it("filters general journalists to LFC posts only when filter='lfc' is set", async () => {
    const items = await parseBlueskyXml(
      BLUESKY_ORNSTEIN_XML,
      { handle: "david-ornstein.bsky.social", source: "bsky-ornstein", authorName: "David Ornstein", filter: "lfc" },
      NOW,
    );
    expect(items).toHaveLength(1);
    expect(items[0].link).toContain("/lfc1");
  });
});

describe("BlueskyAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("records http_error when a Bluesky feed fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    const adapter = new BlueskyAdapter({
      handle: "ptgorst.bsky.social",
      source: "bsky-gorst",
      authorName: "Paul Gorst",
    });
    expect(await adapter.fetch()).toEqual([]);
    expect(adapter.status).toEqual({ state: "http_error", httpStatus: 404 });
    warn.mockRestore();
  });
});
