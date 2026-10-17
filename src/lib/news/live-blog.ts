// Live blogs: one URL whose headline and body keep changing through a match or press conference.
//
// Sync rewrites a stored row's title on every run, but the scraped body is kept for
// 24h. Without a refresh, a reader saw "City cruise to victory" above a body scraped
// before kick-off (Independent, Liverpool v Man City, 2026-10-11).

// Upper-case "LIVE" is the Reach / Independent / Mirror convention; a bare lower-case
// "live" also appears in "live stream" how-to-watch pieces, so only these phrases count.
const LIVE_CAPS = /\bLIVE\b/;
const LIVE_PHRASE = /\blive (updates|blog|coverage|reaction)\b|\bas it happened\b|\bminute-by-minute\b/i;
const LIVE_URL = /live-updates|live-score|live-blog|liveblog|\/live\//i;

export function isLiveBlog(title: string, url: string): boolean {
  return LIVE_CAPS.test(title) || LIVE_PHRASE.test(title) || LIVE_URL.test(url);
}

/** URLs of stored live blogs whose incoming headline differs from the stored one. */
export function liveBlogsWithNewHeadline(
  rows: { url: string; title: string }[],
  existing: { get(url: string): { title?: unknown } | undefined }
): string[] {
  return rows
    .filter((row) => {
      const old = existing.get(row.url);
      return !!old && typeof old.title === "string" && old.title !== row.title && isLiveBlog(row.title, row.url);
    })
    .map((row) => row.url);
}

/** The slice of the Supabase client this module needs (kept structural for tests). */
interface ArticlesUpdater {
  from(table: "articles"): {
    update(values: Record<string, null>): {
      in(column: "url", values: string[]): PromiseLike<{ error: { message: string } | null }>;
    };
  };
}

/**
 * Forget the cached body (and its translation) of live blogs whose headline moved
 * on, so the scrape step later in the same sync stores the current version.
 * A separate update, not part of the bulk upsert: PostgREST writes NULL into any
 * column a batch row omits. Returns how many rows were cleared; never throws.
 */
export async function dropStaleLiveBlogContent(supabase: ArticlesUpdater, urls: string[]): Promise<number> {
  if (urls.length === 0) return 0;
  const { error } = await supabase
    .from("articles")
    .update({ content_en: null, content_vi: null, content_scraped_at: null })
    .in("url", urls);
  if (error) {
    console.warn(`[sync] Could not refresh ${urls.length} live blog(s): ${error.message}`);
    return 0;
  }
  return urls.length;
}
