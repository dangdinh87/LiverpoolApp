# LiverpoolApp Codebase Summary

**Generated:** 11/03/2026
**Status:** Phase 04 Complete (AI Daily Digest)
**Stack:** Next.js 16 + TypeScript + Tailwind CSS v4 + shadcn/ui + Supabase

---

## Project Overview

LiverpoolApp is a comprehensive Liverpool FC fan site featuring:
- **Squad Management:** Player profiles, statistics, favorites
- **Match Data:** Fixtures timeline, standings, statistics
- **News System:** Multi-source RSS aggregation + AI digest
- **Fan Community:** Authentication, user profiles, read history
- **Historical Archive:** Trophies, timeline, legends (JSON-driven)

**Design Language:** Dark Stadium theme (#0D0D0D bg, #C8102E red, #F6EB61 gold)

---

## Architecture Highlights

### 1. Data Layer — Provider Pattern

Football data abstraction (`src/lib/football/`):
- **FootballDataProvider interface** — pluggable design
- **ApiFootballProvider** — api-football.com (100 req/day free, seasons 2022-2024)
- **MockProvider** — fallback static data
- All exports wrapped in `React.cache()` for request dedup

### 2. News System (Phase 01-04)

**Pipeline:**
```
13 RSS Sources + 2 Scrapers
  ↓
Dedup (URL + Jaccard title)
  ↓
Categorize + Score (freshness + keywords + source priority)
  ↓
Enrich (OG meta, content cache)
  ↓
DB storage (articles table)
  ↓
Non-blocking sync (stale check every 15 min)
```

**AI Digest (Phase 04):**
- Daily Groq llama-3.3-70b-versatile summary
- Cron: 00:00 UTC via Vercel
- Vietnamese output with 3-7 category sections
- Pinned card on `/news` page
- Detail view at `/news/digest/[date]`

### 3. Authentication & Storage

**Supabase (Auth + PostgreSQL + Storage):**
- `user_profiles` — display name, avatar, metadata
- `favourite_players` — player favorites
- `articles` — news articles + content_en JSONB cache
- `news_digests` — daily summaries + sections JSONB
- RLS policies for data isolation

**Client Split:**
- `src/lib/supabase.ts` — browser client (client components)
- `src/lib/supabase-server.ts` — server-only (server components + API routes)

### 4. Multi-Language (i18n)

**Framework:** next-intl

**Languages:** EN (default), VI (Vietnamese)

**Key Strings:**
- News categories, digest labels, article actions
- Player positions, match statuses
- UI labels, error messages

**Structure:**
- `src/messages/en.json`, `vi.json` — flat namespace
- Server: `getTranslations("News.digest")`
- Client: `useTranslations("News.categories")`

---

## File Structure

```
src/
├── app/                              # Next.js App Router
│   ├── page.tsx                      # / (homepage)
│   ├── layout.tsx                    # Root layout + theme provider
│   ├── globals.css                   # Design tokens (CSS vars)
│   ├── squad/page.tsx                # Squad grid + filter
│   ├── player/[id]/page.tsx          # Player detail
│   ├── fixtures/page.tsx             # Match timeline
│   ├── standings/page.tsx            # PL table
│   ├── stats/page.tsx                # Statistics charts
│   ├── history/page.tsx              # Trophies + timeline (static)
│   ├── news/
│   │   ├── page.tsx                  # [Phase 01] Feed + DigestCard
│   │   ├── actions.ts                # loadMoreNews() server action
│   │   ├── [...slug]/page.tsx        # Article reader
│   │   └── digest/[date]/page.tsx    # [Phase 04] Digest detail page
│   ├── profile/page.tsx              # [Protected] User profile + favorites
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── callback/route.ts         # OAuth callback
│   ├── api/
│   │   ├── favourite/route.ts        # Add/remove favorite player
│   │   ├── news/
│   │   │   ├── sync/route.ts         # Manual sync endpoint
│   │   │   └── digest/generate/route.ts  # [Phase 04] Cron endpoint
│   ├── robots.txt/route.ts           # SEO
│   └── sitemap.xml/route.ts          # SEO
│
├── components/
│   ├── layout/
│   │   ├── navbar.tsx                # Server: auth check
│   │   ├── navbar-client.tsx         # Client: nav UI + theme toggle
│   │   └── footer.tsx
│   ├── home/
│   │   ├── hero.tsx
│   │   ├── bento-grid.tsx
│   │   ├── squad-carousel.tsx
│   │   ├── standings-preview.tsx
│   │   └── news-section.tsx
│   ├── squad/squad-grid.tsx          # Client: position filter
│   ├── player/player-detail.tsx
│   ├── fixtures/fixture-timeline.tsx
│   ├── standings/standings-table.tsx
│   ├── stats/stat-chart.tsx          # recharts
│   ├── history/club-timeline.tsx     # JSON-driven
│   ├── profile/
│   │   ├── profile-form.tsx          # Avatar upload
│   │   ├── favourite-button.tsx      # Add/remove
│   │   └── favourite-list.tsx        # Server/client split
│   ├── auth/
│   │   ├── login-form.tsx
│   │   └── register-form.tsx
│   ├── news/
│   │   ├── news-feed.tsx             # [Phase 01] Load-more pagination
│   │   ├── category-tabs.tsx
│   │   ├── article-sidebar.tsx
│   │   ├── article-actions.tsx       # Like, Save, Share
│   │   ├── related-articles.tsx
│   │   ├── reading-progress.tsx
│   │   ├── read-tracker.tsx
│   │   └── digest-card.tsx           # [Phase 04] Dismissable card
│   └── ui/                            # shadcn/ui exports
│
├── lib/
│   ├── football/
│   │   ├── provider.ts               # Interface definition
│   │   ├── index.ts                  # Factory + barrel
│   │   ├── api-football-provider.ts
│   │   ├── mock-provider.ts
│   │   └── mock-data.ts
│   ├── news/
│   │   ├── types.ts                  # NewsArticle, ArticleContent types
│   │   ├── config.ts                 # RSS_FEEDS, LFC_KEYWORDS_WEIGHTED
│   │   ├── index.ts                  # Export: getNewsFromDB, searchArticles
│   │   ├── db.ts                     # DB sync + queries
│   │   ├── sync.ts                   # [Phase 02] Shared syncPipeline()
│   │   ├── supabase-service.ts       # [Phase 02] getServiceClient()
│   │   ├── source-detect.ts          # [Phase 02] detectSource() + VI_SOURCES
│   │   ├── digest.ts                 # [Phase 04] AI digest generation
│   │   ├── pipeline.ts               # Dedup + categorize + score
│   │   ├── dedup.ts                  # URL + Jaccard title
│   │   ├── categories.ts             # Regex categorization
│   │   ├── relevance.ts              # Scoring algorithm
│   │   ├── read-history.ts           # localStorage (client-safe)
│   │   ├── mock.ts                   # Mock fallback data
│   │   ├── adapters/
│   │   │   ├── base.ts               # FeedAdapter interface
│   │   │   ├── rss-adapter.ts        # RSS parser
│   │   │   ├── lfc-adapter.ts        # liverpoolfc.com scraper
│   │   │   └── bongdaplus-adapter.ts # HTML scraper
│   │   └── enrichers/
│   │       ├── article-extractor.ts  # [Phase 02] Set-based dedup
│   │       ├── og-meta.ts            # OG enrichment
│   │       └── readability.ts        # Mozilla Readability
│   ├── types/football.ts             # Canonical types (Player, Fixture, etc.)
│   ├── supabase.ts                   # Browser client
│   ├── supabase-server.ts            # Server-only client
│   ├── news-config.ts                # SOURCE_CONFIG, slug codecs
│   ├── player-photos.ts              # Player image map
│   └── animation-variants.ts         # Framer Motion presets
│
├── data/
│   ├── trophies.json                 # Trophy history (trophy/year/competition)
│   ├── history.json                  # Timeline events
│   ├── legends.json                  # Famous players
│   ├── club-info.json                # Club metadata
│   └── player-details.json           # Supplementary player data
│
├── messages/
│   ├── en.json                       # English translations
│   └── vi.json                       # Vietnamese translations
│
└── styles/                            # (if any CSS modules)
```

---

## Key Features & Implementation

### News System (Docs: `news-feature.md`)

**Phase 01:** DB-backed articles, non-blocking sync, initial 30 articles, load-more pagination
**Phase 02:** Refactoring, unified source detection, keyword consolidation, set-based dedup
**Phase 04:** AI digest, Groq integration, daily cron, Vietnamese summaries

### Authentication (Phase 04)

- Supabase Auth + OAuth (Google, GitHub)
- Protected routes: `/profile`, `/news/[...slug]`
- Navbar server component fetches user, passes to client component

### Caching Strategy

1. **React.cache()** — per-request dedup (all `src/lib/football`, `getNewsFromDB`, etc.)
2. **Supabase DB** — articles table as primary storage, 24h content cache
3. **ISR revalidation** — route-specific times (homepage 30min, standings 6h, history never)
4. **Browser cache** — localStorage for read history, likes, saves, dismissed digests

### Error Handling

- Level 1: Adapter-level try-catch + timeout
- Level 2: `Promise.allSettled()` for graceful failure
- Level 3: Enrichment fallbacks (skip if OG fetch fails)
- Level 4: Article scraping fallbacks (Readability → Cheerio → generic OG)
- Level 5: Page-level error boundaries + skeleton loaders

---

## Recent Changes (Phase 04)

### New Files
- `src/lib/news/digest.ts` — Groq API + DB queries
- `src/app/api/news/digest/generate/route.ts` — Cron endpoint + idempotency
- `src/components/news/digest-card.tsx` — Client dismissable card
- `src/app/news/digest/[date]/page.tsx` — Detail page with validation

### Modified Files
- `src/app/news/page.tsx` — Parallel fetch digest + articles
- `src/messages/{en,vi}.json` — News.digest i18n keys
- `vercel.json` — Cron schedule: `0 0 * * *`

### Database Changes
- NEW: `news_digests` table (digest_date PK, sections JSONB, article_ids array)

### Environment Variables
- `GROQ_API_KEY` — Groq Cloud API
- `CRON_SECRET` — Digest endpoint auth

---

## Development

### Setup
```bash
npm install
npm run dev
```

### Build & Type Check
```bash
npm run build        # Fails on TS errors, unused imports
npm run type-check   # Full TS validation
```

### Scripts
- `npm run build` — Production build
- `npm run dev` — Dev server (auto-reload)
- `npm run lint` — ESLint (if configured)

### Environment (.env.example)
```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
API_FOOTBALL_KEY
GROQ_API_KEY
CRON_SECRET
NEXT_PUBLIC_SITE_URL
```

---

## Performance Metrics

| Metric | Phase 01 | Phase 04 |
|--------|----------|---------|
| Initial articles | 300 → 30 | Same (optimized) |
| First Contentful Paint | ~800ms | ~800ms |
| Time to Interactive | ~1.2s | ~1.2s (digest +50ms) |
| DB sync latency | ~150ms | Same |
| News API payload | ~820KB | ~820KB |

**Digest generation:** ~2-5s (Groq latency), runs daily at 00:00 UTC, idempotent.

---

## Naming Conventions

| Category | Pattern | Example |
|----------|---------|---------|
| Files | kebab-case | `digest-card.tsx`, `api-football-provider.ts` |
| Folders | kebab-case | `src/components/news/` |
| Components | PascalCase | `DigestCard`, `SquadGrid` |
| Functions | camelCase | `getDigestByDate()`, `generateDailyDigest()` |
| Constants | UPPER_SNAKE_CASE | `CRON_SECRET`, `DIGEST_SYSTEM_PROMPT` |
| DB Tables | snake_case | `news_digests`, `articles` |
| DB Columns | snake_case | `digest_date`, `article_ids` |
| Types | PascalCase | `DigestResult`, `DigestRecord` |

---

## Next Steps & Improvements

### Planned
1. Extend digest to include English summaries (currently VI only)
2. Archive digests beyond 30 days
3. Add digest search / filtering on homepage
4. Integrate digest recommendation scoring (user reading patterns)

### Nice-to-have
- Digest scheduling customization (user timezone)
- Email delivery for premium users
- AI-powered trending topics (cluster articles by theme)

---

## Dependencies

**Key Packages:**
- `next` 16, `react` 19 — framework
- `supabase-js` — database + auth
- `ai` + `@ai-sdk/groq` — Groq LLM integration
- `rss-parser`, `cheerio`, `@mozilla/readability` — news extraction
- `framer-motion` — animations
- `recharts` — charts
- `next-intl` — i18n
- `tailwind-css` v4 — styling
- `shadcn/ui` — components
- `lucide-react` — icons
- `zod` — validation (optional, in pipeline)

**See:** `package.json` for full dependency list.

---

## Documentation Files

- `architecture.md` — System design + core layers
- `code-standards.md` — Conventions, patterns, naming
- `news-feature.md` — Detailed news pipeline (Phase 01-04)
- `i18n-implementation.md` — Multi-language setup
- `design-guidelines.md` — UI component patterns
- `data-provider-guide.md` — Football provider pattern

---

**Last Updated:** 11/03/2026 (Phase 04 Complete)
