import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatDuration,
  parsePodcastXml,
  PodcastAdapter,
  truncatePodcastXmlHead,
} from "../podcast-adapter";

const NOW = Date.parse("2026-11-23T12:00:00.000Z");

const MEGAPHONE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtd/podcast-1.0.dtd">
  <channel>
    <title>The Anfield Wrap</title>
    <itunes:image href="https://megaphone-images.spotifycdn.com/taw-show.png"/>
    <item>
      <title>Why Liverpool Need Big Win | Friday Live!</title>
      <description>Neil Atkinson previews Manchester United at Anfield. Learn more about your ad choices. Visit podcastchoices.com/adchoices</description>
      <pubDate>Fri, 20 Nov 2026 14:34:00 -0000</pubDate>
      <itunes:duration>3190</itunes:duration>
      <enclosure url="https://pscrb.fm/rss/p/traffic.megaphone.fm/COMG4125575067.mp3" length="0" type="audio/mpeg"/>
    </item>
    <item>
      <title>Old Archive Episode</title>
      <description>Older than 14 days.</description>
      <pubDate>Fri, 01 Nov 2026 10:00:00 -0000</pubDate>
      <itunes:duration>1800</itunes:duration>
      <enclosure url="https://pscrb.fm/rss/p/traffic.megaphone.fm/OLD.mp3" length="0" type="audio/mpeg"/>
    </item>
  </channel>
</rss>`;

const ACAST_XML = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtd/podcast-1.0.dtd">
  <channel>
    <title>Walk On: The Athletic FC's Liverpool show</title>
    <itunes:image href="https://assets.acast.com/show.jpg"/>
    <item>
      <title>Liverpool sweep aside United at Anfield</title>
      <link>https://shows.acast.com/walk-on/episodes/liverpool-sweep-aside-united</link>
      <pubDate>Mon, 23 Nov 2026 02:14:56 GMT</pubDate>
      <itunes:duration>46:13</itunes:duration>
      <itunes:image href="https://assets.acast.com/ep1.jpg"/>
      <description>Reaction from Anfield with James Pearce and Simon Hughes.</description>
    </item>
  </channel>
</rss>`;

describe("podcast-adapter helpers", () => {
  it("formats numeric seconds and preformatted MM:SS / HH:MM:SS durations", () => {
    expect(formatDuration("3190")).toBe("53:10");
    expect(formatDuration("4210")).toBe("1:10:10");
    expect(formatDuration("46:13")).toBe("46:13");
    expect(formatDuration("0")).toBeUndefined();
    expect(formatDuration("")).toBeUndefined();
  });

  it("truncates long archive feeds to maxItems and closes XML cleanly", () => {
    const items = Array.from({ length: 10 }, (_, i) => `<item><title>Ep ${i}</title></item>`).join("");
    const full = `<rss version="2.0"><channel>${items}</channel></rss>`;
    const trimmed = truncatePodcastXmlHead(full, 3);
    expect(trimmed.match(/<item>/g)).toHaveLength(3);
    expect(trimmed).toContain("</channel>");
    expect(trimmed).toContain("</rss>");
  });
});

describe("parsePodcastXml", () => {
  it("falls back to enclosure URL and channel artwork on Megaphone feeds, strips ad boilerplate, and drops >14d items", async () => {
    const items = await parsePodcastXml(
      MEGAPHONE_XML,
      { url: "https://feeds.megaphone.fm/COMG6516013185", source: "pod-taw", showName: "The Anfield Wrap" },
      NOW,
    );
    expect(items).toHaveLength(1);
    expect(items[0].link).toBe("https://pscrb.fm/rss/p/traffic.megaphone.fm/COMG4125575067.mp3");
    expect(items[0].thumbnail).toBe("https://megaphone-images.spotifycdn.com/taw-show.png");
    expect(items[0].tags).toEqual(["53:10"]);
    expect(items[0].author).toBe("The Anfield Wrap");
    expect(items[0].contentSnippet).not.toContain("podcastchoices.com");
  });

  it("prefers item link and episode artwork on Acast feeds", async () => {
    const items = await parsePodcastXml(
      ACAST_XML,
      { url: "https://feeds.acast.com/public/shows/681ccc398b1f3232bc1e68ae", source: "pod-walkon", showName: "Walk On · The Athletic" },
      NOW,
    );
    expect(items).toHaveLength(1);
    expect(items[0].link).toBe("https://shows.acast.com/walk-on/episodes/liverpool-sweep-aside-united");
    expect(items[0].thumbnail).toBe("https://assets.acast.com/ep1.jpg");
    expect(items[0].tags).toEqual(["46:13"]);
  });
});

describe("PodcastAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("records http_error on non-200 responses", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    const adapter = new PodcastAdapter({
      url: "https://feeds.megaphone.fm/COMG6516013185",
      source: "pod-taw",
      showName: "The Anfield Wrap",
    });
    expect(await adapter.fetch()).toEqual([]);
    expect(adapter.status).toEqual({ state: "http_error", httpStatus: 503 });
    warn.mockRestore();
  });
});
