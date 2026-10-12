/**
 * Liverpool's official YouTube channel, through the YouTube Data API v3.
 *
 * Why an API key and not RSS: YouTube's legacy feed endpoint
 * (`/feeds/videos.xml?channel_id=…`) is still alive, but not for this channel.
 * Checked 2026-10-12 — the club's channel, The Redmen TV, The Anfield Wrap,
 * Anfield Index and LFC Transfer Room all answer 404 or return a feed with no
 * entries, while an unrelated control channel answers 200 with 15 entries on
 * the same request. Google has disabled it per channel, so RSS cannot reach the
 * club's own video output at all.
 *
 * The Data API's free quota is 10,000 units a day. `playlistItems.list` costs
 * 1 unit per call, so the hourly sync spends 24 units a day — three orders of
 * magnitude inside the limit, and no reason to ask for billing.
 *
 * Without `YOUTUBE_API_KEY` this returns nothing and says so once per run,
 * matching the football layer: no mock data, no silent empty state.
 */

import "server-only";

import type { NewsArticle } from "./types";
import { NEWS_USER_AGENT } from "./http";
import { type FeedAdapter, type SourceFetchStatus, statusFromError } from "./adapters/base";

/**
 * Liverpool FC's channel id, from the canonical link on youtube.com/@LiverpoolFC.
 *
 * Every channel's uploads live in a playlist whose id is the channel id with
 * `UC` swapped for `UU`. Listing that playlist costs 1 quota unit, where
 * `search.list` costs 100 for the same thing.
 */
const LFC_CHANNEL_ID = "UC9LQwHZoucFT94I2h6JOcjw";
const uploadsPlaylistId = (channelId: string) => `UU${channelId.slice(2)}`;

const API = "https://www.googleapis.com/youtube/v3/playlistItems";
const MAX_ITEMS = 15;
const FETCH_TIMEOUT_MS = 6_000;
/** Match the news pipeline's retention so nothing is ingested that cleanup would drop. */
const MAX_AGE_DAYS = 14;

/** Only the fields used; the API returns far more. */
interface PlaylistItemsResponse {
  items?: Array<{
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
      channelTitle?: string;
      resourceId?: { videoId?: string };
      thumbnails?: Record<string, { url?: string; width?: number } | undefined>;
    };
  }>;
}

/** Widest thumbnail on offer; `maxres` and `standard` are absent on older uploads. */
export function pickThumbnail(
  thumbnails: Record<string, { url?: string; width?: number } | undefined> | undefined,
): string | undefined {
  if (!thumbnails) return undefined;
  const widest = Object.values(thumbnails)
    .filter((t): t is { url?: string; width?: number } => !!t?.url)
    .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
  return widest?.url;
}

/**
 * Map one API response to news items.
 *
 * Exported so the shape can be asserted against a recorded response without a
 * network call or an API key.
 */
export function mapPlaylistItems(
  data: PlaylistItemsResponse,
  now: number = Date.now(),
): NewsArticle[] {
  const oldest = now - MAX_AGE_DAYS * 86_400_000;

  return (data.items ?? []).flatMap((item) => {
    const s = item.snippet;
    const videoId = s?.resourceId?.videoId;
    const title = s?.title?.trim();
    // A deleted or private upload keeps its playlist row but loses both.
    if (!videoId || !title) return [];
    // YouTube uses these two titles for rows whose video is gone.
    if (title === "Deleted video" || title === "Private video") return [];

    const published = s?.publishedAt ? Date.parse(s.publishedAt) : NaN;
    if (Number.isNaN(published) || published < oldest) return [];

    return [
      {
        title,
        // The watch page, not the embed: these are link-out items and the club's
        // own page carries its own player, description and comments.
        link: `https://www.youtube.com/watch?v=${videoId}`,
        source: "lfctv" as const,
        language: "en" as const,
        pubDate: new Date(published).toISOString(),
        // First line only. The full description is the club's copy, and these
        // cards show a one-line excerpt.
        contentSnippet: s?.description?.split("\n").find((l) => l.trim())?.slice(0, 220) ?? "",
        thumbnail: pickThumbnail(s?.thumbnails),
        author: s?.channelTitle ?? undefined,
      } satisfies NewsArticle,
    ];
  });
}

/** The club's YouTube uploads as news items. */
export class YouTubeChannelAdapter implements FeedAdapter {
  readonly name = "lfctv";
  status?: SourceFetchStatus;

  constructor(private readonly channelId: string = LFC_CHANNEL_ID) {}

  async fetch(): Promise<NewsArticle[]> {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) {
      // Not an error: the site is expected to run without the key. Saying so
      // beats an empty section nobody can explain.
      console.warn("[youtube] YOUTUBE_API_KEY is not set — skipping the video source");
      this.status = { state: "ok" };
      return [];
    }

    const url = new URL(API);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("playlistId", uploadsPlaylistId(this.channelId));
    url.searchParams.set("maxResults", String(MAX_ITEMS));
    url.searchParams.set("key", key);

    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: { "User-Agent": NEWS_USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!res.ok) {
        // 403 here is nearly always quota exhausted or a key restricted to the
        // wrong referrer, both of which need a human; keep the status specific.
        this.status = { state: "http_error", httpStatus: res.status };
        console.error(`[youtube] HTTP ${res.status} listing the uploads playlist`);
        return [];
      }

      let data: PlaylistItemsResponse;
      try {
        data = (await res.json()) as PlaylistItemsResponse;
      } catch (err) {
        this.status = statusFromError(err, "parse");
        return [];
      }

      const items = mapPlaylistItems(data);
      this.status = { state: "ok" };
      return items;
    } catch (err) {
      this.status = statusFromError(err);
      console.error("[youtube] fetch failed:", err);
      return [];
    }
  }
}
