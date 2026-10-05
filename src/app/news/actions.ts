"use server";

import { getNewsPaginated } from "@/lib/news/db";
import type { NewsArticle } from "@/lib/news/types";

// Server actions are public endpoints: arguments come straight from the client.
const MAX_PAGE_SIZE = 50;

export async function loadMoreNews(
  offset: number,
  limit: number,
  language?: "en" | "vi"
): Promise<{ articles: NewsArticle[]; hasMore: boolean }> {
  const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  const safeLimit = Number.isFinite(limit)
    ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(limit)))
    : 20;
  const safeLanguage = language === "en" || language === "vi" ? language : undefined;
  return getNewsPaginated(safeOffset, safeLimit, safeLanguage);
}
