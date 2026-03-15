# Getting Started

Liverpool FC Việt Nam fan site — Next.js 16 App Router + TypeScript + Supabase + Vercel.
Live: [www.liverpoolfcvn.blog](https://www.liverpoolfcvn.blog)

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 18.17+ | LTS recommended |
| npm | 9+ | Comes with Node |
| Git | any | — |
| Supabase account | — | [supabase.com](https://supabase.com) — free tier works |
| Football-Data.org key | — | [football-data.org](https://www.football-data.org) — free registration |
| Groq API key | — | [console.groq.com](https://console.groq.com) — free tier works |
| Cloudinary account | — | [cloudinary.com](https://cloudinary.com) — free tier works |

---

## Clone & Install

```bash
git clone https://github.com/your-org/LiverpoolApp.git
cd LiverpoolApp
npm install
```

---

## Environment Variables

Copy the example file and fill in values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

| Variable | Required | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase Dashboard → Settings → API → service_role |
| `FOOTBALL_DATA_ORG_KEY` | Yes* | [football-data.org](https://www.football-data.org) — free registration |
| `NEXT_PUBLIC_SITE_URL` | Yes | `http://localhost:3000` for dev, production URL for prod |
| `GROQ_API_KEY` | Yes | [console.groq.com](https://console.groq.com) → API Keys |
| `CRON_SECRET` | Yes | Any random string (e.g. `openssl rand -hex 32`) |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary Dashboard → Settings |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary Dashboard → Settings → Access Keys |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary Dashboard → Settings → Access Keys |

> *`FOOTBALL_DATA_ORG_KEY` is optional in dev. Without it, the app uses mock data automatically.

---

## Database Setup

Run all migrations against your Supabase project. You can do this via the Supabase CLI or SQL editor.

### Option A — Supabase CLI (recommended)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project (get project ref from Supabase Dashboard URL)
supabase link --project-ref your-project-ref

# Push all migrations
supabase db push
```

### Option B — SQL Editor (manual)

In Supabase Dashboard → SQL Editor, run each migration file in order:

```
supabase/migrations/001_initial.sql          # profiles, favourite_players + RLS
supabase/migrations/002_articles.sql         # articles table (news storage)
supabase/migrations/003_article_interactions.sql  # article_likes, article_comments
supabase/migrations/004_saved_articles.sql   # user bookmarks
supabase/migrations/005_gallery.sql          # gallery images metadata
supabase/migrations/chat_schema.sql          # conversations, messages (AI chat)
```

### OAuth Setup (Supabase)

For Google/GitHub login to work locally:

1. Supabase Dashboard → Authentication → Providers → enable Google and/or GitHub
2. Add OAuth app credentials from Google Cloud Console / GitHub Developer Settings
3. Set redirect URL in each provider: `http://localhost:3000/auth/callback`

---

## Running Dev Server

```bash
npm run dev
# Opens at http://localhost:3000
```

The app detects missing `FOOTBALL_DATA_ORG_KEY` and falls back to mock data automatically. All pages are functional without it.

---

## All Commands

```bash
npm run dev          # Start dev server (next dev --turbopack)
npm run build        # Production build (fails on TS errors)
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run seed:gallery # Seed gallery with sample Cloudinary images
```

---

## Project Structure (condensed)

```
src/
├── app/                  # Next.js App Router — pages + API routes
│   ├── page.tsx          # Homepage (Hero + BentoGrid)
│   ├── layout.tsx        # Root layout (NavbarAuth, Footer, GlobalChat)
│   ├── api/              # API routes + cron endpoints
│   ├── auth/             # Login, register, OAuth callback
│   ├── news/             # News feed + article reader + digest
│   ├── squad/            # Player grid + position filter
│   ├── player/[id]/      # Player detail page
│   ├── fixtures/         # Match fixtures + detail
│   ├── standings/        # Premier League table
│   ├── stats/            # Stats dashboard
│   ├── gallery/          # Photo gallery + lightbox
│   ├── history/          # Club history (static JSON)
│   ├── profile/          # User profile (protected)
│   └── chat/             # AI chat (BRO AI)
├── components/           # React components (mirroring app/ structure)
│   └── ui/               # shadcn/ui primitives
├── lib/
│   ├── football/         # Football data layer (server-only, cached)
│   ├── news/             # News pipeline (RSS sync, digest, translation)
│   ├── supabase.ts       # Browser Supabase client
│   └── supabase-server.ts # Server-only Supabase client
├── data/                 # Static JSON (trophies, history, legends, squad)
└── messages/             # i18n strings (en.json, vi.json)
```

---

## Key Architecture Decisions

**Supabase client split** — `supabase.ts` (browser) vs `supabase-server.ts` (server-only). Never mix them. See [architecture.md](./architecture.md#supabase-client-split).

**Football data via provider pattern** — all football functions live in `src/lib/football/`, wrapped in `React.cache()`, with automatic mock fallback. Pages always import from `@/lib/football`, never from provider files directly.

**Navbar is split** — `NavbarAuth` (server component) fetches auth state and passes it to `NavbarClient` (client component) as props. Never import `supabase-server.ts` in the client component.

**i18n via next-intl** — two locales (`en`/`vi`), detected from `NEXT_LOCALE` cookie or `Accept-Language` header. Static content has `.vi.json` variants in `src/data/`.

**Dark mode only** — the design system uses CSS custom properties defined in `src/app/globals.css`. No light mode.

---

## Further Reading

- [architecture.md](./architecture.md) — system layers, data flow, caching strategy
- [deployment.md](./deployment.md) — Vercel deployment + Hostinger DNS + cron jobs
- `docs/code-standards.md` — naming conventions, component patterns
- `docs/news-feature.md` — news pipeline deep-dive
- `docs/design-guidelines.md` — UI tokens, Dark Stadium design system
