// Fetch article engagement data (likes + comments count) for trending/hot articles.
// Uses service client to bypass RLS — called server-side only.
// Uses count queries to avoid fetching all rows.

import "server-only";
import { cache } from "react";
import { getServiceClient } from "./supabase-service";

export interface ArticleEngagement {
  url: string;
  likes: number;
  comments: number;
  total: number;
}

/**
 * Get engagement counts (likes + comments) for articles with any engagement.
 * Uses two lightweight queries: one for likes, one for comments,
 * each limited to articles with recent activity (last 30 days).
 * Returns a Map keyed by article URL for O(1) lookup.
 * Cached per-request via React.cache().
 */
export const getArticleEngagement = cache(
  async (): Promise<Map<string, ArticleEngagement>> => {
    const map = new Map<string, ArticleEngagement>();

    try {
      const supabase = getServiceClient();
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch likes per article (only recent, limit 500 rows max)
      const { data: likesData } = await supabase
        .from("article_likes")
        .select("article_url")
        .gte("created_at", cutoff)
        .limit(500);

      // Fetch comments per article (only recent, limit 500 rows max)
      const { data: commentsData } = await supabase
        .from("article_comments")
        .select("article_url")
        .gte("created_at", cutoff)
        .limit(500);

      // Aggregate likes
      const likesMap = new Map<string, number>();
      for (const row of likesData ?? []) {
        likesMap.set(row.article_url, (likesMap.get(row.article_url) ?? 0) + 1);
      }

      // Aggregate comments
      const commentsMap = new Map<string, number>();
      for (const row of commentsData ?? []) {
        commentsMap.set(row.article_url, (commentsMap.get(row.article_url) ?? 0) + 1);
      }

      // Merge: engagement = likes + comments*2 (comments weigh more)
      const allUrls = new Set([...likesMap.keys(), ...commentsMap.keys()]);
      for (const url of allUrls) {
        const likes = likesMap.get(url) ?? 0;
        const comments = commentsMap.get(url) ?? 0;
        map.set(url, { url, likes, comments, total: likes + comments * 2 });
      }
    } catch (err) {
      console.error("[engagement] Failed to fetch:", err);
    }

    return map;
  }
);

/** Threshold for "Hot" badge — article needs at least this engagement score */
export const HOT_THRESHOLD = 3;
