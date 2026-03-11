"use server";

import { getNewsPaginated } from "@/lib/news/db";
import type { NewsArticle } from "@/lib/news/types";

export async function loadMoreNews(
  offset: number,
  limit: number,
  language?: "en" | "vi"
): Promise<{ articles: NewsArticle[]; hasMore: boolean }> {
  return getNewsPaginated(offset, limit, language);
}
