# Phase 01 -- Project Setup & Infrastructure

## Context
- [plan.md](./plan.md) | Phase 1 of 5 | Effort: 3h
- Prerequisite: None. This phase must complete before all others.

## Overview
Bootstrap Next.js 15 project with TypeScript, Tailwind CSS, shadcn/ui, fonts, color tokens, Supabase schema, base layout (Navbar + Footer), and initial Vercel deployment.

## Key Insights
- Bebas Neue + Inter via `next/font/google` eliminates external font requests
- Tailwind config defines all Liverpool color tokens once; reused everywhere
- Navbar uses `scroll` event listener for transparent-to-solid transition
- Supabase schema is minimal (2 tables); Auth handles users automatically

## Requirements
- Node 20+, pnpm (preferred), Supabase CLI, Vercel CLI
- Supabase project created with Auth + Storage enabled
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `API_FOOTBALL_KEY`

## Architecture
- `next/font/google` loads Bebas Neue (weight 400) + Inter (weights 400,500,600,700)
- CSS variables `--font-bebas` and `--font-inter` exposed to Tailwind via `fontFamily` extend
- shadcn/ui initialized with `zinc` base, then override CSS variables in `globals.css` with Dark Stadium palette

## Related Code Files
- `tailwind.config.ts` -- color tokens, font families, glassmorphism utilities
- `src/app/layout.tsx` -- root layout with fonts, ThemeProvider, Navbar, Footer
- `src/app/globals.css` -- Dark Stadium CSS variables, glassmorphism class
- `src/components/layout/navbar.tsx` -- transparent-to-solid scroll navbar
- `src/components/layout/footer.tsx` -- simple footer with links + crest
- `src/lib/supabase.ts` -- createBrowserClient + createServerClient helpers
- `supabase/migrations/001_initial.sql` -- user_profiles + favourite_players

## Implementation Steps

### 1. Initialize project (15min)
- Run `npx create-next-app@latest liverpool-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
- Install deps: `pnpm add @supabase/supabase-js @supabase/ssr framer-motion next-themes recharts rss-parser`
- Install dev deps: `pnpm add -D @types/node`
- Init shadcn: `npx shadcn@latest init` (select zinc, CSS variables, `src/components/ui`)

### 2. Configure fonts in `src/app/layout.tsx` (15min)
- Import `Bebas_Neue` (weight 400) and `Inter` (weights 400-700) from `next/font/google`
- Assign CSS variable names `--font-bebas` and `--font-inter`
- Apply both to `<html>` className

### 3. Configure Tailwind + Dark Stadium tokens (20min)
- Extend `tailwind.config.ts`: `colors.liverpool.red: '#C8102E'`, `colors.liverpool.gold: '#F6EB61'`, `colors.stadium.bg: '#0D0D0D'`, `colors.stadium.surface: '#1A1A1A'`, `colors.stadium.surface2: '#252525'`
- Extend `fontFamily`: `bebas: ['var(--font-bebas)']`, `inter: ['var(--font-inter)']`
- In `globals.css`: set `body { background: #0D0D0D; color: #E5E5E5 }`
- Add `.glass` utility: `bg-white/5 backdrop-blur-md border border-white/10 rounded-xl`

### 4. Create base layout components (30min)
- **Navbar** (`src/components/layout/navbar.tsx`): fixed top, transparent bg initially, on `scroll > 50px` apply `bg-stadium-bg/90 backdrop-blur`. Logo (Liverpool crest or text "LFC"), nav links: Home, Squad, Fixtures, Standings, Stats, News, History. Mobile: hamburger menu with sheet/drawer from shadcn. Auth button (Login / Avatar) on right.
- **Footer** (`src/components/layout/footer.tsx`): dark bg, 3-column grid (Quick Links, Connect, About), copyright row. Keep minimal.

### 5. Setup Supabase (30min)
- Create `src/lib/supabase.ts`: export `createClient()` for browser, `createServerClient()` for server components using `@supabase/ssr`
- Write migration `supabase/migrations/001_initial.sql`:
  ```sql
  CREATE TABLE user_profiles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE, username text, avatar_url text, bio text, created_at timestamptz DEFAULT now());
  CREATE TABLE favourite_players (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, player_id int NOT NULL, player_name text NOT NULL, player_photo text, added_at timestamptz DEFAULT now(), UNIQUE(user_id, player_id));
  ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE favourite_players ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users read own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "Users update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
  CREATE POLICY "Users insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "Users manage own favourites" ON favourite_players FOR ALL USING (auth.uid() = user_id);
  ```
- Run migration via Supabase CLI or Dashboard SQL editor
- Create Supabase Storage bucket `avatars` (public)

### 6. Configure next.config.ts (10min)
- Add `images.remotePatterns` for: `media.api-sports.io`, `images.unsplash.com`, `*.supabase.co`
- Set `experimental.serverActions: true` if needed

### 7. Environment variables + .env.local (10min)
- Create `.env.local` with all 4 keys (gitignored)
- Create `.env.example` with placeholder values for documentation

### 8. Deploy to Vercel (20min)
- Push to GitHub repo, connect Vercel, set env vars in Vercel dashboard
- Verify build succeeds with base layout visible

## Todo List
- [ ] Init Next.js 15 project with TypeScript + Tailwind
- [ ] Install all dependencies
- [ ] Init shadcn/ui
- [ ] Configure Bebas Neue + Inter fonts
- [ ] Setup Tailwind Dark Stadium color tokens
- [ ] Create Navbar component (scroll transition)
- [ ] Create Footer component
- [ ] Setup Supabase client helpers
- [ ] Run DB migration (user_profiles + favourite_players + RLS)
- [ ] Create Storage bucket for avatars
- [ ] Configure next.config.ts remotePatterns
- [ ] Create .env.local + .env.example
- [ ] Deploy to Vercel, verify build

## Success Criteria
- `pnpm dev` runs with Dark Stadium bg, Bebas Neue headlines, Inter body text
- Navbar scrolls transparent-to-solid; mobile hamburger works
- Supabase tables exist with RLS policies active
- Vercel deployment accessible with base layout

## Risk Assessment
- **shadcn/ui dark mode conflict**: Mitigate by setting `darkMode: 'class'` in Tailwind and using `next-themes` ThemeProvider with `forcedTheme="dark"` initially
- **Font loading flash**: Use `next/font` `display: 'swap'` + font variable approach

## Security Considerations
- `.env.local` gitignored; never expose `SUPABASE_SERVICE_ROLE_KEY` or `API_FOOTBALL_KEY` client-side
- RLS policies enforce user-scoped data access
- `NEXT_PUBLIC_` prefix only for Supabase URL and anon key

## Next Steps
Proceed to [Phase 02](./phase-02-core-data-pages.md) -- Core Data Pages
