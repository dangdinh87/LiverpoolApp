// Client-safe. ONE canonical form for article URLs.
//
// Why: the in-app slug (`/news/{source}/{path}`) cannot carry a query string
// (`?` starts the real query) or a trailing slash (Next drops the empty last
// segment), so a slug always decodes to a "bare" URL. Feeds, however, hand us
// BBC links with `?at_medium=RSS&at_campaign=rss` and WordPress links with a
// trailing `/`. Stored as-is, the decoded URL never matched the stored row:
// DB content cache missed, translations were never cached (billed every time),
// comments/likes keyed by a different string.
//
// Rule: strip tracking params + fragment, drop the trailing slash (except for
// the bare root). Everything is stored in that form; lookups additionally try
// legacy variants so rows written before this rule still match.

const TRACKING_PARAM = /^(?:at_[a-z_]+|utm_[a-z_]+|ns_[a-z_]+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|ocid|cmpid|cmp|ito|igshid|_ga|spm)$/i;

export function canonicalizeArticleUrl(raw: string): string {
  const input = raw.trim();
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    return input;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return input;

  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) u.searchParams.delete(key);
  }
  u.hash = "";
  if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "") || "/";

  let out = u.toString();
  // URL#toString re-adds "/" for an empty path; keep the bare-root form.
  if (u.pathname === "/" && !u.search) out = out.replace(/\/$/, "");
  return out;
}

/**
 * Every spelling an `articles.url` / `article_comments.article_url` row might
 * hold for this article: canonical first, then trailing-slash form, the raw
 * input, and the BBC feed tracking suffix older rows were stored with.
 */
export function articleUrlVariants(raw: string): string[] {
  const canonical = canonicalizeArticleUrl(raw);
  const out = new Set<string>([canonical]);
  const trimmed = raw.trim();
  if (trimmed) out.add(trimmed);

  try {
    const u = new URL(canonical);
    const base = canonical;
    if (u.pathname !== "/" && !u.search) out.add(`${base}/`);
    if (!u.search && /(^|\.)bbc\.(com|co\.uk)$/i.test(u.hostname)) {
      const bare = base.replace(/\/+$/, "");
      out.add(`${bare}?at_medium=RSS&at_campaign=rss`);
      out.add(`${bare}/?at_medium=RSS&at_campaign=rss`);
    }
  } catch {
    // not a URL: the raw spelling is all we have
  }
  return [...out];
}
