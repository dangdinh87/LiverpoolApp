import { unstable_cache } from "next/cache";
import { getLatestDigest, getSeoArticleFromDigest, type DigestRecord } from "./digest";

/**
 * The newest daily digest, read once and cached for every page that shows it.
 *
 * `/` and `/news` each kept their own cache entry (`home-digest-v1`,
 * `news-page-digest-v1`) with the same 30-minute window but not the same
 * start, so for up to half an hour after a new briefing one page led with
 * today's and the other with the day before's. One key, one entry.
 *
 * getLatestDigest throws on a database error, so a failure is not cached.
 * `/api/news/digest/generate` busts the "news-digest" tag.
 */
export const getCachedLatestDigest = unstable_cache(async () => getLatestDigest(), ["latest-digest-v1"], {
  revalidate: 1800,
  tags: ["news-digest"],
});

/**
 * The digest's headline for every page that links to it: the SEO article's
 * title, which is the one the digest page itself opens with. The stored
 * `title` is the plain "Liverpool Daily — date" label.
 */
export function getDigestHeadline(digest: Pick<DigestRecord, "title" | "sections" | "seo_article">): string {
  return getSeoArticleFromDigest(digest)?.title || digest.title;
}
