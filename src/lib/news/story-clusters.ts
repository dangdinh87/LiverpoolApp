/**
 * Groups articles that report the same story ("Konate faces Real Madrid ban"
 * from five outlets) so the feed shows one card with "4 more outlets" instead
 * of five near-identical cards.
 *
 * Titles are compared on their rare words: a word's weight is its inverse
 * frequency across the batch, so "Liverpool" or "Man City" (in half the titles
 * on a match week) count for almost nothing while a player's name or a figure
 * carries the match. Only same-language articles published within a couple of
 * days of each other can join. Pure and deterministic; runs on the client over
 * the articles already loaded.
 */

import { tokenize } from "./dedup";

export interface ClusterableArticle {
  link: string;
  title: string;
  language: string;
  pubDate: string;
  source: string;
}

export interface StoryCluster<T extends ClusterableArticle> {
  /** The newest article: the card the reader sees. */
  lead: T;
  /** Other outlets' takes, newest first, one per outlet. */
  related: T[];
}

/** Weighted overlap needed to call two titles the same story. Tuned on live feed titles (Oct 2026). */
export const STORY_SIMILARITY = 0.34;
/** Shared rare words required besides the score, so two short titles cannot match on one name alone. */
const MIN_SHARED = 2;
const WINDOW_MS = 48 * 60 * 60 * 1000;
const IDF_PRIOR = 100;

function weightedOverlap(a: Set<string>, b: Set<string>, idf: Map<string, number>): { score: number; shared: number } {
  let inter = 0;
  let union = 0;
  let shared = 0;
  for (const w of a) {
    const weight = idf.get(w) ?? 0;
    union += weight;
    if (b.has(w)) {
      inter += weight;
      if (weight > 1) shared += 1;
    }
  }
  for (const w of b) if (!a.has(w)) union += idf.get(w) ?? 0;
  return { score: union === 0 ? 0 : inter / union, shared };
}

export function clusterStories<T extends ClusterableArticle>(articles: T[]): StoryCluster<T>[] {
  const sorted = [...articles].sort((x, y) => new Date(y.pubDate).getTime() - new Date(x.pubDate).getTime());
  const tokens = sorted.map((a) => tokenize(a.title));

  // Inverse document frequency over this batch.
  const df = new Map<string, number>();
  for (const set of tokens) for (const w of set) df.set(w, (df.get(w) ?? 0) + 1);
  // IDF_PRIOR pads the batch as if it held that many more unrelated titles, so
  // weights stay comparable between a 36-article first page and a 250-article feed.
  const n = sorted.length + IDF_PRIOR;
  const idf = new Map<string, number>();
  for (const [w, count] of df) idf.set(w, Math.log((n + 1) / count));

  const clusters: { cluster: StoryCluster<T>; tokens: Set<string>; time: number; outlets: Set<string> }[] = [];
  sorted.forEach((article, i) => {
    const time = new Date(article.pubDate).getTime();
    const home = clusters.find((c) => {
      if (c.cluster.lead.language !== article.language) return false;
      // One take per outlet: a second Echo piece on the story keeps its own card.
      if (c.outlets.has(article.source)) return false;
      if (Math.abs(c.time - time) > WINDOW_MS) return false;
      const { score, shared } = weightedOverlap(tokens[i], c.tokens, idf);
      return score >= STORY_SIMILARITY && shared >= MIN_SHARED;
    });
    if (!home) {
      clusters.push({ cluster: { lead: article, related: [] }, tokens: tokens[i], time, outlets: new Set([article.source]) });
      return;
    }
    home.outlets.add(article.source);
    home.cluster.related.push(article);
  });

  return clusters.map((c) => c.cluster);
}
