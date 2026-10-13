/**
 * Groups articles that report the same story ("Konate faces Real Madrid ban"
 * from five outlets) so the feed shows one card with "4 more" instead of five
 * near-identical cards.
 *
 * Articles are compared on their rare words: a word's weight is its inverse
 * frequency across the batch, so "Liverpool" or "Man City" (in half the titles
 * on a match week) count for almost nothing while a player's name or a figure
 * carries the match. Words come from the headline and, at half weight, the
 * first lines of the excerpt: outlets reword a headline ("Rooney chê
 * Gravenberch" / "Wayne Rooney chỉ trích Ryan Gravenberch") but their excerpts
 * keep the names. Matching ignores tone marks and treats a few Vietnamese
 * synonyms as one word. Only same-language articles published within a couple
 * of days of each other can join. Pure and deterministic; runs on the client
 * over the articles already loaded.
 */

export interface ClusterableArticle {
  link: string;
  title: string;
  language: string;
  pubDate: string;
  source: string;
  /** First lines of the article. Optional: without it only the headline counts. */
  contentSnippet?: string;
}

export interface StoryCluster<T extends ClusterableArticle> {
  /** The newest article: the card the reader sees. */
  lead: T;
  /** Other takes on the story, newest first. One per outlet unless an outlet ran a near-copy of its own piece. */
  related: T[];
}

/** Weighted overlap needed to call two articles the same story. Tuned on live feed titles (Oct 2026). */
export const STORY_SIMILARITY = 0.34;
/** A second piece from an outlet already in the story must be a near-copy, not just another angle. */
export const SAME_OUTLET_SIMILARITY = 0.75;
/** Shared rare words required besides the score, so two short titles cannot match on one name alone. */
const MIN_SHARED = 2;
const WINDOW_MS = 48 * 60 * 60 * 1000;
const IDF_PRIOR = 100;
/** An excerpt word counts this much next to a headline word. */
const SNIPPET_WEIGHT = 0.5;
/** Only the opening of the excerpt is used: later sentences drift to background. */
const SNIPPET_CHARS = 220;

/**
 * Words that mean the same in a football headline, written as one word before
 * comparing. Group 1 keeps the character before the phrase: a lookbehind would
 * be tidier, but older iOS Safari rejects one at parse time and this runs in the browser.
 */
const SYNONYMS: readonly [RegExp, string][] = [
  [/(^|[^\p{L}\p{N}])(?:chỉ trích|phê phán|chê bai|chê|đả kích)(?![\p{L}\p{N}])/gu, "synchitrich"],
  [/(^|[^\p{L}\p{N}])(?:đánh bại|hạ gục|đè bẹp|hủy diệt|huỷ diệt|nghiền nát|vùi dập|chiến thắng|thắng)(?![\p{L}\p{N}])/gu, "synthang"],
  [/(^|[^\p{L}\p{N}])(?:thảm bại|thất bại|thua)(?![\p{L}\p{N}])/gu, "synthua"],
  [/(^|[^\p{L}\p{N}])(?:criticises|criticised|criticise|slams|slammed|blasts|blasted|hits out at|takes aim at)(?![\p{L}\p{N}])/gu, "synchitrich"],
];

/** Function words that carry no story. English: the ingest dedup's list; Vietnamese: tone marks already removed. */
const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "but", "not", "are", "was",
  "cua", "cho", "voi", "nhung", "cac", "mot", "nay", "khi", "duoc", "khong", "nhu", "nao", "dang", "van", "cung", "vao",
  "trong", "ngoai", "theo", "hon", "nhat", "rat", "qua", "nhieu", "moi", "day",
]);

function matchWords(text: string): string[] {
  let s = text.normalize("NFC").toLowerCase().replace(/<[^>]*>/g, " ");
  for (const [pattern, canon] of SYNONYMS) s = s.replace(pattern, `$1 ${canon} `);
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** A word's place in one article: where it appeared. */
interface Presence {
  title: boolean;
  snippet: boolean;
}

function presenceOf(article: ClusterableArticle): Map<string, Presence> {
  const words = new Map<string, Presence>();
  for (const w of matchWords(article.title)) words.set(w, { title: true, snippet: false });
  for (const w of matchWords((article.contentSnippet ?? "").slice(0, SNIPPET_CHARS))) {
    const seen = words.get(w);
    if (seen) seen.snippet = true;
    else words.set(w, { title: false, snippet: true });
  }
  return words;
}

/**
 * Weighted Jaccard of two articles' words. Scored twice and the better one
 * kept: on the headlines alone (a long excerpt must not dilute a headline that
 * matches) and with the excerpts (a reworded headline still shares the names).
 */
function similarity(
  a: Map<string, Presence>,
  b: Map<string, Presence>,
  idf: Map<string, number>,
): { score: number; shared: number } {
  const best = { score: 0, shared: 0 };
  for (const withSnippets of [false, true]) {
    const weigh = (p: Presence) => (p.title ? 1 : withSnippets ? SNIPPET_WEIGHT : 0);
    let inter = 0;
    let union = 0;
    let shared = 0;
    let sharedInTitle = false;
    for (const [w, pa] of a) {
      const idfWeight = idf.get(w) ?? 0;
      const wa = weigh(pa) * idfWeight;
      const pb = b.get(w);
      const wb = pb ? weigh(pb) * idfWeight : 0;
      inter += Math.min(wa, wb);
      union += Math.max(wa, wb);
      if (pb && wa > 0 && wb > 0 && idfWeight > 1) {
        shared += 1;
        if (pa.title || pb.title) sharedInTitle = true;
      }
    }
    for (const [w, pb] of b) if (!a.has(w)) union += weigh(pb) * (idf.get(w) ?? 0);
    // A story is anchored by a word of a headline: excerpts alone share too much background.
    const score = union === 0 || !sharedInTitle ? 0 : inter / union;
    if (shared >= MIN_SHARED && score > best.score) {
      best.score = score;
      best.shared = shared;
    }
  }
  return best;
}

export function clusterStories<T extends ClusterableArticle>(articles: T[]): StoryCluster<T>[] {
  const sorted = [...articles].sort((x, y) => new Date(y.pubDate).getTime() - new Date(x.pubDate).getTime());
  const words = sorted.map(presenceOf);

  // Inverse document frequency over this batch.
  const df = new Map<string, number>();
  for (const set of words) for (const w of set.keys()) df.set(w, (df.get(w) ?? 0) + 1);
  // IDF_PRIOR pads the batch as if it held that many more unrelated articles, so
  // weights stay comparable between a 36-article first page and a 250-article feed.
  const n = sorted.length + IDF_PRIOR;
  const idf = new Map<string, number>();
  for (const [w, count] of df) idf.set(w, Math.log((n + 1) / count));

  interface Member {
    words: Map<string, Presence>;
    time: number;
    source: string;
  }
  const clusters: { cluster: StoryCluster<T>; members: Member[] }[] = [];
  sorted.forEach((article, i) => {
    const time = new Date(article.pubDate).getTime();
    const home = clusters.find((c) => {
      if (c.cluster.lead.language !== article.language) return false;
      // One take per outlet: a second Echo piece on the story keeps its own card
      // unless it is a near-copy of the Echo piece already there.
      const sameOutlet = c.members.some((m) => m.source === article.source);
      const [pool, needed] = sameOutlet
        ? [c.members.filter((m) => m.source === article.source), SAME_OUTLET_SIMILARITY]
        : [c.members, STORY_SIMILARITY];
      // Any member can vouch for the newcomer: a story drifts as outlets reword it.
      return pool.some((m) => {
        if (Math.abs(m.time - time) > WINDOW_MS) return false;
        const { score, shared } = similarity(words[i], m.words, idf);
        return score >= needed && shared >= MIN_SHARED;
      });
    });
    const member = { words: words[i], time, source: article.source };
    if (!home) {
      clusters.push({ cluster: { lead: article, related: [] }, members: [member] });
      return;
    }
    home.members.push(member);
    home.cluster.related.push(article);
  });

  return clusters.map((c) => c.cluster);
}
