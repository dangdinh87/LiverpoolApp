import { describe, expect, it, vi, afterEach } from "vitest";
import {
  mapPlaylistItems,
  pickThumbnail,
  YouTubeChannelAdapter,
} from "../youtube-data-api";

/**
 * The shape here is `playlistItems.list?part=snippet` as the API documents it.
 * Asserting against a recorded response rather than a live call keeps the suite
 * offline — the rest of this directory had to be moved off the network for the
 * same reason.
 */
const NOW = Date.parse("2026-10-12T00:00:00.000Z");

const snippet = (over: Record<string, unknown> = {}) => ({
  snippet: {
    title: "Slot on City, Wirtz and a long month",
    description: "\n\nArne Slot speaks to the press.\nSubscribe for more.",
    publishedAt: "2026-10-11T14:00:00Z",
    channelTitle: "Liverpool FC",
    resourceId: { kind: "youtube#video", videoId: "aBcDeFgHiJk" },
    thumbnails: {
      default: { url: "https://i.ytimg.com/vi/x/default.jpg", width: 120 },
      medium: { url: "https://i.ytimg.com/vi/x/mqdefault.jpg", width: 320 },
      maxres: { url: "https://i.ytimg.com/vi/x/maxresdefault.jpg", width: 1280 },
    },
    ...over,
  },
});

describe("mapPlaylistItems", () => {
  it("turns an upload into a link-out item pointing at the watch page", () => {
    const [item] = mapPlaylistItems({ items: [snippet()] }, NOW);
    expect(item.link).toBe("https://www.youtube.com/watch?v=aBcDeFgHiJk");
    expect(item.source).toBe("lfctv");
    expect(item.language).toBe("en");
    expect(item.title).toBe("Slot on City, Wirtz and a long month");
    expect(item.author).toBe("Liverpool FC");
    expect(item.pubDate).toBe("2026-10-11T14:00:00.000Z");
  });

  it("takes the first non-empty description line, not the whole blurb", () => {
    // The club's descriptions open with blank lines and close with sign-up
    // boilerplate; the card shows one line.
    const [item] = mapPlaylistItems({ items: [snippet()] }, NOW);
    expect(item.contentSnippet).toBe("Arne Slot speaks to the press.");
  });

  it("prefers the widest thumbnail available", () => {
    expect(pickThumbnail(snippet().snippet.thumbnails)).toBe(
      "https://i.ytimg.com/vi/x/maxresdefault.jpg",
    );
    // Older uploads have neither maxres nor standard.
    expect(
      pickThumbnail({ default: { url: "https://i/d.jpg", width: 120 } }),
    ).toBe("https://i/d.jpg");
    expect(pickThumbnail(undefined)).toBeUndefined();
  });

  it("drops rows whose video is gone", () => {
    // A deleted or private upload keeps its playlist row but loses the id and
    // gets one of these two titles, which would otherwise be published as news.
    const items = mapPlaylistItems(
      {
        items: [
          snippet({ title: "Deleted video", description: "This video is unavailable." }),
          snippet({ title: "Private video" }),
          snippet({ resourceId: {} }),
          snippet({ title: "   " }),
        ],
      },
      NOW,
    );
    expect(items).toEqual([]);
  });

  it("drops uploads older than the pipeline keeps", () => {
    // Retention deletes at 14 days, so ingesting anything older just makes work
    // for cleanup. The uploads playlist is newest-first but goes back years.
    const items = mapPlaylistItems(
      { items: [snippet({ publishedAt: "2026-09-01T10:00:00Z" })] },
      NOW,
    );
    expect(items).toEqual([]);
  });

  it("drops an unparseable date rather than inventing one", () => {
    const items = mapPlaylistItems({ items: [snippet({ publishedAt: "soon" })] }, NOW);
    expect(items).toEqual([]);
  });

  it("survives an empty or field-less response", () => {
    expect(mapPlaylistItems({}, NOW)).toEqual([]);
    expect(mapPlaylistItems({ items: [] }, NOW)).toEqual([]);
    expect(mapPlaylistItems({ items: [{}] }, NOW)).toEqual([]);
  });
});

describe("YouTubeChannelAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.YOUTUBE_API_KEY;
  });

  it("does nothing and stays 'ok' without an API key", async () => {
    // The site is expected to run without the key; a missing key is a
    // configuration choice, not a source failure, so it must not trip the
    // sync workflow's sourceFailures alert.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const adapter = new YouTubeChannelAdapter();
    expect(await adapter.fetch()).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(adapter.status).toEqual({ state: "ok" });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("asks for the uploads playlist, which costs one quota unit", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [snippet({ publishedAt: new Date().toISOString() })] }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const items = await new YouTubeChannelAdapter("UC9LQwHZoucFT94I2h6JOcjw").fetch();
    expect(items).toHaveLength(1);

    const url = new URL(String(fetchSpy.mock.calls[0][0]));
    expect(url.pathname).toBe("/youtube/v3/playlistItems");
    // UU + the channel id without its UC prefix. search.list would cost 100.
    expect(url.searchParams.get("playlistId")).toBe("UU9LQwHZoucFT94I2h6JOcjw");
    expect(url.searchParams.get("part")).toBe("snippet");
  });

  it("records the HTTP status so an exhausted quota is visible", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    const adapter = new YouTubeChannelAdapter();
    expect(await adapter.fetch()).toEqual([]);
    expect(adapter.status).toEqual({ state: "http_error", httpStatus: 403 });
    error.mockRestore();
  });

  it("reports a timeout as a timeout", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("The operation was aborted due to timeout");
    err.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(err));

    const adapter = new YouTubeChannelAdapter();
    expect(await adapter.fetch()).toEqual([]);
    expect(adapter.status?.state).toBe("timeout");
    error.mockRestore();
  });
});
