# Research: News Aggregator Architecture & UX
Date: 2026-03-06 | Scope: LiverpoolApp news system

---

## 1. News Aggregator Code Architecture Patterns

### Current State Assessment
`rss-parser.ts` (570 lines) is a God Object: types, config, parsers, scrapers, dedup, OG enrichment, sort — all in one file. This causes tight coupling and hard-to-test units.

### Module Separation: Adapter Pattern

Split by responsibility boundary:

```
src/lib/news/
  types.ts          ← NewsArticle, NewsSource, RssFeedConfig (shared, no server-only)
  config.ts         ← RSS_FEEDS array, SOURCE_CONFIG (server-only)
  adapters/
    rss-adapter.ts  ← fetchRssFeed() per source → NewsArticle[]
    scraper-adapter.ts ← bongdaplus HTML scraper → NewsArticle[]
  enrichers/
    og-enricher.ts  ← OG image fallback fetcher
  pipeline.ts       ← orchestrates: fetch all → enrich → dedup → sort → return
  dedup.ts          ← URL dedup + near-duplicate detection
  relevance.ts      ← Liverpool keyword scoring
```

Each adapter implements one interface:
```ts
interface NewsAdapter {
  source: NewsSource;
  fetch(): Promise<NewsArticle[]>;
}
```

Pipeline calls `Promise.allSettled()` over all adapters — one failure doesn't kill the feed.

### Error Handling: Graceful Degradation (Current) vs Circuit Breaker

**Current approach** (adequate for ~100 req/day free tier):
- `fetchRssFeed` wraps in try/catch, returns `[]` on failure — already correct
- `Promise.allSettled` in aggregator ensures partial results

**Circuit Breaker** (only needed if sources are repeatedly flaky):
- Track failure count per source in memory (Map)
- After N consecutive failures, skip for X minutes
- Reset on success
- Complexity cost: ~50 lines + state management
- **Verdict for this project: YAGNI** — `allSettled` + warn logging is sufficient

### Type Safety: Zod for RSS Items

RSS items from external feeds are `unknown` at runtime. Current code uses `as unknown as Record<string, unknown>` casts — not safe.

```ts
import { z } from "zod";

const RssItemSchema = z.object({
  title: z.string().optional(),
  link: z.string().url().optional(),
  pubDate: z.string().optional(),
  contentSnippet: z.string().optional(),
  mediaThumbnail: z.unknown().optional(),
  enclosure: z.unknown().optional(),
});

// Usage: safeParse, fall back to defaults on failure
const parsed = RssItemSchema.safeParse(item);
if (!parsed.success) return null; // skip malformed items
```

- `z.safeParse()` (not `parse()`) — never throws, returns discriminated union
- Add to pipeline: filter out `null` results from failed parses
- Cost: +`zod` dep (already likely installed for auth forms)

### Testing Strategy for Scrapers

**Snapshot testing with mock HTTP** is the most practical approach:

```ts
// __tests__/rss-adapter.test.ts
import { fetchRssFeed } from "@/lib/news/adapters/rss-adapter";

// Mock fetch globally
global.fetch = jest.fn().mockResolvedValue({
  text: () => Promise.resolve(BBC_RSS_FIXTURE), // saved XML string
});

it("parses BBC feed", async () => {
  const articles = await fetchRssFeed(bbcConfig);
  expect(articles).toMatchSnapshot(); // first run saves, subsequent runs diff
  expect(articles[0].source).toBe("bbc");
});
```

- Store fixture XMLs in `__tests__/fixtures/*.xml`
- For scrapers: store sample HTML in `__tests__/fixtures/*.html`
- Update snapshots deliberately when scraper logic changes (`--updateSnapshot`)
- **No network calls in tests** — scrapers break when sites change, tests should not

---

## 2. News UX Patterns for Sports Fan Sites

### Infinite Scroll vs Pagination vs Load More

| Pattern | Pros | Cons | Best For |
|---|---|---|---|
| Infinite scroll | Seamless, modern feel | No URL anchor, poor SEO, hard to share position | Social feeds |
| Pagination | SEO-friendly, bookmarkable pages | Jarring UX, interrupts reading flow | Archive/search |
| **Load More button** | User-controlled, works with SSR, SEO OK | Requires click | **News feeds** ✓ |

**Recommendation: Load More** — matches sports news consumption (scan headlines, load more when interested). Implement with `useState(page)` + server action or API route. Initial load: 12 articles. Each load: +8 articles.

### Category/Tag Filtering

Rule-based tagging (see Section 3) enables filter UI:

```tsx
const CATEGORIES = ["All", "Match Report", "Transfer", "Injury", "Opinion", "Team News"];
// URL param: /news?cat=transfer
// Server component reads searchParams, filters before render
```

- Filter on server side for SEO + no JS required
- Use `<Link href="?cat=transfer">` not `onClick` — preserves browser history
- Highlight active filter with `lfc-red` border

### Article Bookmarking with Supabase

```sql
-- Migration
create table user_bookmarks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  article_url text not null,
  title       text not null,
  source      text not null,
  thumbnail   text,
  bookmarked_at timestamptz default now(),
  unique(user_id, article_url)
);

-- RLS
alter table user_bookmarks enable row level security;
create policy "own bookmarks" on user_bookmarks
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Client component bookmark toggle (mirrors existing `FavouriteButton` pattern):
```ts
const { data: { session } } = await supabase.auth.getSession();
await supabase.from("user_bookmarks").upsert({ user_id: session.user.id, article_url, title, source });
```

**No server-side bookmark count needed** — YAGNI. Just per-user toggle.

### Web Share API + Copy Link

```tsx
async function shareArticle(title: string, url: string) {
  if (navigator.share) {
    await navigator.share({ title, url }); // native OS sheet on mobile
  } else {
    await navigator.clipboard.writeText(url); // desktop fallback
    toast("Link copied!");
  }
}
```

- `navigator.share` requires HTTPS + user gesture
- Check support with `"share" in navigator` — Chrome/Safari mobile support is good
- No social SDK needed — Web Share API covers mobile, clipboard covers desktop

### Reading Time Estimation

Standard algorithm: 200 words per minute (casual reading), 238 wpm average adult.

```ts
function estimateReadingTime(text: string): string {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} min read`;
}
```

Apply to `contentSnippet` (snippet only — underestimates full article, but accurate enough for previews). Show on article cards and detail page.

### Related Articles

**Keyword-based** (rule-based, no ML, KISS):
```ts
function findRelated(current: NewsArticle, all: NewsArticle[], limit = 4): NewsArticle[] {
  const keywords = extractKeywords(current.title); // split on spaces, filter stopwords
  return all
    .filter(a => a.link !== current.link)
    .map(a => ({ article: a, score: keywords.filter(k => a.title.toLowerCase().includes(k)).length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => r.article);
}
```

- Category-based: simpler — same `category` tag first, then recency
- Collaborative filtering: needs user event tracking — YAGNI for this phase

### Push Notifications / Supabase Realtime

Supabase Realtime can broadcast DB changes, but for external RSS news there's no DB row to watch — RSS is polled server-side.

**Realistic approach:**
- `revalidatePath("/news")` on a cron (Vercel cron job, every 15 min)
- If truly need push: store new articles in Supabase table, use Realtime to notify client, trigger `useRouter().refresh()`
- Web Push API (service worker) — significant complexity, YAGNI unless breaking news is a core feature

---

## 3. Content Relevance & Deduplication

### Liverpool Relevance Scoring (Weighted Keywords)

Current: single `filter: "liverpool"` keyword on 24h feed only.

Improved weighted scorer:

```ts
const LIVERPOOL_KEYWORDS: Record<string, number> = {
  // High weight — unambiguous
  "liverpool": 10, "lfc": 10, "anfield": 10, "reds": 8,
  // Player names — weight 6
  "salah": 6, "van dijk": 6, "alisson": 6, "trent": 5, "nunez": 5,
  "gakpo": 5, "mac allister": 5, "szoboszlai": 5, "jota": 4,
  // Manager
  "slot": 6, "arne slot": 8,
  // Competitions
  "premier league": 3, "champions league": 3, "fa cup": 2, "carabao": 2,
};

function scoreLiverpoolRelevance(title: string, snippet: string): number {
  const titleLower = title.toLowerCase();
  const snippetLower = snippet.toLowerCase();
  let score = 0;
  for (const [kw, weight] of Object.entries(LIVERPOOL_KEYWORDS)) {
    if (titleLower.includes(kw)) score += weight * 2; // title weight 2x
    else if (snippetLower.includes(kw)) score += weight;
  }
  return score;
}
// Filter: score >= 6 (must have at least one strong signal)
```

### Near-Duplicate Detection (Jaccard on Title Tokens)

```ts
function tokenize(title: string): Set<string> {
  const STOPWORDS = new Set(["a","an","the","is","in","of","to","and","for","on","at"]);
  return new Set(
    title.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => !STOPWORDS.has(w))
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const intersection = [...a].filter(x => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function deduplicate(articles: NewsArticle[]): NewsArticle[] {
  const result: NewsArticle[] = [];
  const tokenSets = articles.map(a => tokenize(a.title));
  for (let i = 0; i < articles.length; i++) {
    const isDuplicate = result.some((_, j) =>
      jaccardSimilarity(tokenSets[i], tokenSets[j]) > 0.6
    );
    if (!isDuplicate) result.push(articles[i]);
  }
  return result;
}
```

- Threshold 0.6: "Salah scores vs Arsenal" vs "Salah nets goal against Arsenal" → likely duplicates
- O(n²) but n is small (~50-100 articles total) — acceptable
- Run **after** URL dedup (cheaper check first)

### Rule-Based Article Categorization

```ts
const CATEGORY_RULES: { category: string; patterns: RegExp[] }[] = [
  { category: "Match Report", patterns: [/\b(vs|v\.?s|match|result|win|loss|draw|goal|score|beat|defeat)\b/i] },
  { category: "Transfer",     patterns: [/\b(sign|transfer|deal|fee|bid|move|join|depart|loan|window)\b/i] },
  { category: "Injury",       patterns: [/\b(injur|doubt|ruled out|return|fit|fitness|hamstring|knee|muscle)\b/i] },
  { category: "Opinion",      patterns: [/\b(opinion|column|analysis|verdict|review|ratings|player of)\b/i] },
  { category: "Team News",    patterns: [/\b(lineup|squad|team news|starting|bench|selection|formation)\b/i] },
];

function categorize(article: NewsArticle): string {
  const text = `${article.title} ${article.contentSnippet}`;
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some(p => p.test(text))) return rule.category;
  }
  return "General";
}
```

- First match wins — order rules by priority (Match Report > Transfer > Injury)
- Add `category` field to `NewsArticle` type

### Content Freshness Ranking (Time Decay + Source Priority)

```ts
const SOURCE_PRIORITY: Record<NewsSource, number> = {
  lfc: 10,      // official
  bbc: 8,
  guardian: 7,
  bongda: 4,
  "24h": 4,
  bongdaplus: 3,
};

function freshnessScore(article: NewsArticle): number {
  const ageHours = (Date.now() - new Date(article.pubDate).getTime()) / 3600000;
  const decayFactor = Math.exp(-ageHours / 24); // half-life ~17h
  const relevance = scoreLiverpoolRelevance(article.title, article.contentSnippet);
  const sourcePriority = SOURCE_PRIORITY[article.source] / 10;
  return (decayFactor * 0.5) + (relevance / 20 * 0.3) + (sourcePriority * 0.2);
}

articles.sort((a, b) => freshnessScore(b) - freshnessScore(a));
```

- Three factors: recency (50%), relevance (30%), source authority (20%)
- Exponential decay with 24h half-life — articles >48h old rank very low
- Tune weights in `news-config.ts` without touching algorithm

---

## Implementation Priority (YAGNI-ordered)

1. **Module split** — immediate maintainability win, no behavior change
2. **Zod validation** — catches runtime RSS surprises, low cost
3. **Jaccard dedup** — eliminates "same story 3 times" UX problem
4. **Category tagging + filter UI** — high UX value, rule-based = no ML
5. **Load More pagination** — better than dumping 50 articles at once
6. **Bookmarks** — requires Supabase migration, moderate effort
7. **Freshness scoring** — replaces naive `pubDate` sort
8. **Web Share API** — 10 lines, high mobile value
9. **Reading time** — 3 lines, nice touch
10. **Circuit breaker** — skip unless sources prove repeatedly flaky
11. **Push notifications** — skip unless explicit requirement

---

## Unresolved Questions

1. **Bongdaplus scraper stability** — HTML scrapers break on site redesign; is there an RSS alternative for bongdaplus.vn?
2. **OG enrichment cost** — how many articles trigger extra HTTP fetches? Could this cause rate-limit issues or slow page loads?
3. **Category persistence** — should `category` be computed at fetch time (stored in cache) or at render time? React.cache TTL matters here.
4. **Bookmark page** — does `/profile` show bookmarks, or does a `/bookmarks` route make more sense UX-wise?
5. **Vietnamese NLP for relevance** — current English keyword list won't match Vietnamese variations (e.g. "Liverpool" → "Lữpool"). Need VN-specific keyword list.
6. **Supabase Realtime for news** — only viable if news is stored in DB; is that worth the storage + polling complexity vs simple ISR revalidation?
