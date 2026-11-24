import Parser from "rss-parser";
import type { FeedAdapter, SourceFetchStatus } from "./base";
import { statusFromError } from "./base";
import type { NewsArticle, NewsSource } from "../types";
import { NEWS_USER_AGENT as USER_AGENT } from "../http";
import { getValidDateMs, normalizeFeedDate } from "../date";
import { sanitizeImageUrl } from "../image";
import { cleanFeedText, cleanSnippet } from "../text";
import { canonicalizeArticleUrl } from "../url";

export interface PodcastFeedConfig {
  url: string;
  source: NewsSource;
  showName: string;
  timeoutMs?: number;
  maxAgeDays?: number;
}

const FETCH_TIMEOUT_MS = 6_000;
const MAX_STREAM_BYTES = 196_608;
const MAX_XML_ITEMS = 6;
const MAX_EPISODES_PER_SHOW = 5;
const DEFAULT_MAX_AGE_DAYS = 14;

const parser = new Parser({
  customFields: {
    item: [
      ["itunes:image", "itunesImage"],
      ["itunes:duration", "itunesDuration"],
      ["itunes:summary", "itunesSummary"],
    ],
  },
});

const AD_BOILERPLATE =
  /(?:Learn more about your ad choices\.?\s*Visit\s+\S+|Podcast choices:\s*\S+|Subscribe to The Anfield Wrap[^.]*\.?)/gi;

/** Trim a potentially multi-megabyte podcast archive XML down to the newest N items. */
export function truncatePodcastXmlHead(xml: string, maxItems = MAX_XML_ITEMS): string {
  let count = 0;
  let pos = 0;
  let cutIndex = -1;

  while (count < maxItems) {
    const idx = xml.indexOf("</item>", pos);
    if (idx === -1) break;
    count++;
    pos = idx + "</item>".length;
    cutIndex = pos;
  }

  let head = xml;
  if (count === maxItems && cutIndex !== -1) {
    head = xml.slice(0, cutIndex);
  } else if (!/<\/rss>/i.test(xml)) {
    const lastClosedItem = xml.lastIndexOf("</item>");
    if (lastClosedItem !== -1) {
      head = xml.slice(0, lastClosedItem + "</item>".length);
    }
  }

  if (/<channel\b/i.test(head) && !/<\/channel>/i.test(head)) {
    head += "\n</channel>";
  }
  if (/<rss\b/i.test(head) && !/<\/rss>/i.test(head)) {
    head += "\n</rss>";
  }
  return head;
}

/** Format `<itunes:duration>` (seconds or `HH:MM:SS`/`MM:SS`) into compact display duration. */
export function formatDuration(raw: unknown): string | undefined {
  if (typeof raw !== "string" && typeof raw !== "number") return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;

  if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(s)) {
    return s === "0:00" || s === "00:00" ? undefined : s;
  }

  const totalSec = Number.parseInt(s, 10);
  if (!Number.isFinite(totalSec) || totalSec <= 0) return undefined;

  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function readItunesImage(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return typeof raw === "string" ? raw : undefined;
  const obj = raw as Record<string, unknown>;
  const attrs = obj["$"] as Record<string, unknown> | undefined;
  if (typeof attrs?.href === "string") return attrs.href;
  if (typeof obj.href === "string") return obj.href;
  if (typeof obj.url === "string") return obj.url;
  return undefined;
}

function httpUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : undefined;
}

/** Parse trimmed podcast RSS XML into direct link-out episode items. */
export async function parsePodcastXml(
  xml: string,
  config: PodcastFeedConfig,
  nowMs = Date.now(),
): Promise<NewsArticle[]> {
  const feed = await parser.parseString(truncatePodcastXmlHead(xml));
  const channelRecord = feed as unknown as {
    itunes?: { image?: string };
    image?: { url?: string };
  };
  const showImage = sanitizeImageUrl(
    channelRecord.itunes?.image ?? channelRecord.image?.url,
    config.url,
  );
  const cutoffMs = nowMs - (config.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS) * 86_400_000;
  const episodes: NewsArticle[] = [];

  for (const item of feed.items) {
    const title = cleanFeedText(item.title);
    if (!title) continue;

    const itemRecord = item as unknown as Record<string, unknown>;
    const enclosureUrl = httpUrl(item.enclosure?.url);
    const rawLink = httpUrl(item.link) ?? enclosureUrl;
    if (!rawLink) continue;

    const pubDate = normalizeFeedDate(item.pubDate ?? item.isoDate, "en");
    const ms = getValidDateMs(pubDate);
    if (ms === null || ms < cutoffMs) continue;

    const rawDesc = String(item.contentSnippet ?? itemRecord.itunesSummary ?? item.content ?? "")
      .replace(AD_BOILERPLATE, " ")
      .replace(/\s+/g, " ")
      .trim();
    const duration = formatDuration(itemRecord.itunesDuration);
    const episodeImage = sanitizeImageUrl(
      readItunesImage(itemRecord.itunesImage) ?? readItunesImage((itemRecord.itunes as { image?: unknown } | undefined)?.image),
      rawLink,
    );

    episodes.push({
      title,
      link: canonicalizeArticleUrl(rawLink),
      pubDate,
      contentSnippet: cleanSnippet(rawDesc, 200),
      thumbnail: episodeImage ?? showImage,
      source: config.source,
      language: "en",
      author: config.showName,
      tags: duration ? [duration] : undefined,
    });
  }

  episodes.sort((a, b) => (getValidDateMs(b.pubDate) ?? 0) - (getValidDateMs(a.pubDate) ?? 0));
  return episodes.slice(0, MAX_EPISODES_PER_SHOW);
}

async function readHeadXml(res: Response, maxBytes = MAX_STREAM_BYTES): Promise<string> {
  if (!res.body) return res.text();

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let xml = "";
  let totalBytes = 0;

  try {
    while (totalBytes < maxBytes) {
      const { value, done } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      xml += decoder.decode(value, { stream: true });

      const itemCount = (xml.match(/<\/item>/gi) ?? []).length;
      if (itemCount >= MAX_XML_ITEMS) break;
    }
    xml += decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
  }

  return xml;
}

export class PodcastAdapter implements FeedAdapter {
  readonly name: string;
  status?: SourceFetchStatus;

  constructor(private readonly config: PodcastFeedConfig) {
    this.name = config.source;
  }

  async fetch(): Promise<NewsArticle[]> {
    this.status = undefined;
    try {
      const res = await fetch(this.config.url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(this.config.timeoutMs ?? FETCH_TIMEOUT_MS),
        cache: "no-store",
      });

      if (!res.ok) {
        console.warn(`[podcast-adapter] ${this.config.source}: HTTP ${res.status}`);
        this.status = { state: "http_error", httpStatus: res.status };
        return [];
      }

      const xml = await readHeadXml(res);
      try {
        const items = await parsePodcastXml(xml, this.config);
        this.status = { state: "ok" };
        return items;
      } catch (err) {
        this.status = statusFromError(err, "parse");
        console.warn(`[podcast-adapter] ${this.config.source}: parse failed`, this.status.error);
        return [];
      }
    } catch (err) {
      this.status = statusFromError(err);
      console.warn(
        `[podcast-adapter] Failed ${this.config.source}:`,
        err instanceof Error ? err.message : err,
      );
      return [];
    }
  }
}
