# Brand + UX upgrade — design spec (2026-10-07)

Branch: `feat/upgrade`. Builds on "Matchday" (`plans/reports/design-brief-261005-ui-rebuild.md`) — read it. Direction decided by lead; do not re-litigate.

## Positioning
Vietnamese **fan blog / hub** for Liverpool supporters — NOT a newspaper, NOT official. Core value: kick-off times in Vietnam time, results, standings, squad, quick news (headline + short excerpt + link to the original), own commentary.
- VI tagline: "Fan Liverpool Việt Nam · Giờ đá, kết quả, tin nhanh". EN: "Liverpool fans in Vietnam · Kick-off times, results, quick news".
- Always make clear it is an unofficial fan site (footer + About + legal). Never imply endorsement by Liverpool FC, the Premier League, or the news outlets.

## Brand identity
- Display name stays **LFCVN** (open question for owner: collides with the official Liverpool Supporters Club Vietnam abbreviation). Keep the name in ONE place (constant) so a rename is a one-line change.
- **No club crest / Liver bird as the site's own logo or favicon.** Club/opponent crests may appear only as match data (team logos from the data provider). New own mark: wordmark "LFCVN" in League Gothic, wide tracking, with a short red bar accent; square app/favicon = red `#c8102e` square, white "L". Create SVGs under `public/brand/`.
- Palette unchanged (Dark Stadium): bg `#0d0d0d`, surfaces `#141414/#1a1a1a/#222`, red `#c8102e` (fills), `text-brand` for red text, gold `#f6eb61` sparingly, muted `#a0a0a0`. Fonts unchanged (League Gothic, Barlow Condensed, Inter).
- Remove third-party outlet logos (source marquee). Credit sources as plain text names.

## Voice and wording (Vietnamese first)
- Natural fan voice, short sentences, address the reader as "bạn". No translationese, no self-praise, no hype, no "tổng hợp tin tức uy tín" claims.
- Use football words Vietnamese fans actually use: "giờ đá", "kết quả", "bảng xếp hạng", "đội hình", "chuyển nhượng", "The Kop", "The Reds".
- Every visible string goes through next-intl (vi AND en). English copy: plain, same meaning. Dates/times: Vietnam time helpers in `src/lib/format-match-date.ts`.
- Buttons are verbs ("Xem chi tiết trận"), headings are nouns, empty/error states say what to do next.

## UX principles ("tiện lợi và thoải mái")
1. **Thumb-first on phones (390px primary):** primary navigation reachable with one hand → mobile bottom tab bar (Trang chủ · Trận đấu · Tin · Đội hình · Thêm). Header stays slim (brand, language, menu for secondary pages).
2. Answer the question on first screen: next match + VN kick-off time + countdown + "where to watch"; latest result; latest headlines.
3. Reading comfort: body text ≥ 16–17px, line-height ~1.65, measure ≤ 68ch, ≥ 4.5:1 contrast (7:1 for body), no walls of small caps text.
4. Touch: ≥ 44px hit areas (the `.tap-target` utility already extends hit area), ≥ 8px between targets.
5. No layout shift, skeletons same geometry as content, reduced-motion respected, focus visible, one h1/page.
6. Fewer, clearer choices: one primary action per card; dedupe navigation (Lịch đấu / BXH / Thống kê / Season overlap — group under "Trận đấu").
7. Honest states everywhere (loading / empty / outage).

## Ownership (parallel agents; no overlaps)
- **A shell+brand:** `src/components/layout/**`, `src/app/[locale]/layout.tsx`, `src/app/globals.css` (only A edits it; additive tokens/utilities), metadata/OG image/manifest/favicons/`public/brand/**`, brand constant, bottom tab bar, footer, disclaimer, nav wording.
- **B matches:** `src/app/[locale]/(home)/**`, `fixtures/**`, `season/**`, `standings/**`, `stats/**`, and their `src/components/{home,fixtures,season,standings,stats}/**`.
- **C news:** `src/app/[locale]/news/**`, `src/components/news/**`, `src/lib/news/**`, `src/app/api/news/**` (UI/copy only; keep scraping/sync logic and tests green).
- **D club pages:** `squad`, `player`, `players`, `history`, `gallery`, `about`, `legal`, `chat`, `auth`, `profile` routes and their components.
- Shared primitives in `src/components/ui/**`: extend only if needed by ≥ 2 areas and tell the lead; never fork.

## Rules for agents
- Do NOT run `next build` or start dev servers (shared `.next`). A dev server is already running at http://localhost:3310 with hot reload — use it to look at your pages (Playwright, 390px and 1440px).
- Do NOT commit and do NOT `git add`. Leave changes in the working tree; the lead commits per area.
- Messages: never edit `src/messages/*.json` directly. Use `python3 plans/261007-1000-brand-ux-upgrade/i18n-set.py patch.json` (locked, keeps formatting). Patch both vi and en with identical keys.
- Gates before reporting: `npx tsc --noEmit -p .`, `npx eslint <your files>`, `npx vitest run` for the areas you touched. Keep the 86 e2e tests' selectors/roles working (grep `e2e/` for text/role selectors you change).
- Report (≤ 40 lines): what changed per route, files, evidence (screenshots path), anything not done, anything needed from another area.
