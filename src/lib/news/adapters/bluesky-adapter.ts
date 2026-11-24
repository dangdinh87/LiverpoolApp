import Parser from "rss-parser";
import type { FeedAdapter, SourceFetchStatus } from "./base";
import { statusFromError } from "./base";
import type { NewsArticle, NewsSource } from "../types";
import { LFC_KEYWORDS } from "../config";
import { matchesAnyKeyword } from "../keywords";
import { NEWS_USER_AGENT as USER_AGENT } from "../http";
import { getValidDateMs, normalizeFeedDate } from "../date";
import { cleanFeedText, cleanSnippet } from "../text";
import { canonicalizeArticleUrl } from "../url";

export interface BlueskyFeedConfig {
  handle: string;
  source: NewsSource;
  authorName: string;
  filter?: "lfc";
  timeoutMs?: number;
  maxAgeDays?: number;
}

const FETCH_TIMEOUT_MS = 4_000;
const MIN_POST_LENGTH = 24;
const MAX_POSTS_PER_ACCOUNT = 8;
const DEFAULT_MAX_AGE_DAYS = 14;

const parser = new Parser();

const TRAILING_URL_RE = /(?:https?:\/\/\S+|(?:tinyurl\.com|bit\.ly|t\.co|buff\.ly)\/\S+)/gi;

function cleanPostText(raw: string): string {
  return cleanFeedText(raw)
    .replace(TRAILING_URL_RE, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse Bluesky profile RSS XML into clean reporter pulse items. */
export async function parseBlueskyXml(
  xml: string,
  config: BlueskyFeedConfig,
  nowMs = Date.now(),
): Promise<NewsArticle[]> {
  const feed = await parser.parseString(xml);
  const cutoffMs = nowMs - (config.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS) * 86_400_000;
  const posts: NewsArticle[] = [];

  for (const item of feed.items) {
    const rawText = item.contentSnippet ?? item.content ?? item.title ?? "";
    const text = cleanPostText(rawText);
    if (text.length < MIN_POST_LENGTH || text.startsWith("@")) continue;

    if (config.filter === "lfc" && !matchesAnyKeyword(text, LFC_KEYWORDS)) continue;

    const rawLink = typeof item.link === "string" && /^https?:\/\//i.test(item.link.trim()) ? item.link.trim() : null;
    if (!rawLink) continue;

    const pubDate = normalizeFeedDate(item.pubDate ?? item.isoDate, "en");
    const ms = getValidDateMs(pubDate);
    if (ms === null || ms < cutoffMs) continue;

    posts.push({
      title: cleanSnippet(text, 160),
      link: canonicalizeArticleUrl(rawLink),
      pubDate,
      contentSnippet: cleanSnippet(text, 320),
      source: config.source,
      language: "en",
      author: config.authorName,
      tags: [`@${config.handle}`],
    });
  }

  posts.sort((a, b) => (getValidDateMs(b.pubDate) ?? 0) - (getValidDateMs(a.pubDate) ?? 0));
  return posts.slice(0, MAX_POSTS_PER_ACCOUNT);
}

export class BlueskyAdapter implements FeedAdapter {
  readonly name: string;
  status?: SourceFetchStatus;

  constructor(private readonly config: BlueskyFeedConfig) {
    this.name = config.source;
  }

  async fetch(): Promise<NewsArticle[]> {
    this.status = undefined;
    const url = `https://bsky.app/profile/${this.config.handle}/rss`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(this.config.timeoutMs ?? FETCH_TIMEOUT_MS),
        cache: "no-store",
      });

      if (!res.ok) {
        console.warn(`[bluesky-adapter] ${this.config.source}: HTTP ${res.status}`);
        this.status = { state: "http_error", httpStatus: res.status };
        return [];
      }

      const xml = await res.text();
      try {
        const items = await parseBlueskyXml(xml, this.config);
        this.status = { state: "ok" };
        return items;
      } catch (err) {
        this.status = statusFromError(err, "parse");
        console.warn(`[bluesky-adapter] ${this.config.source}: parse failed`, this.status.error);
        return [];
      }
    } catch (err) {
      this.status = statusFromError(err);
      console.warn(
        `[bluesky-adapter] Failed ${this.config.source}:`,
        err instanceof Error ? err.message : err,
      );
      return [];
    }
  }
}
