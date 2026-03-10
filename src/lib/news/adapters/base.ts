import type { NewsArticle } from "../types";

export interface FeedAdapter {
  readonly name: string;
  fetch(): Promise<NewsArticle[]>;
}
