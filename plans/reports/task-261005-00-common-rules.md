# Common rules for every engineer (UI rebuild + crawler) — 2026-10-05

## TARGET REPO — read this first
**/Users/nguyendangdinh/LiverpoolApp** (branch `fix/full-audit-261001`). Your shell may start in `/Users/nguyendangdinh/Personal/Pomodoro` — that is a DIFFERENT project (a Pomodoro timer with weather work in progress). NEVER read-modify, edit, or run anything in it. Always `cd /Users/nguyendangdinh/LiverpoolApp` first and use absolute paths.

## Environment
- Date 2026-10-05, macOS, timezone Asia/Saigon. No `timeout` command.
- A shell hook blocks Bash commands containing the literal string `node_modules` or `.next` — don't type them, don't build paths around the hook; use npx/npm.
- The working tree has lots of uncommitted work by other engineers: never revert, never `git checkout/stash/reset/clean`. Other engineers edit OTHER files concurrently. Edit only files you own (listed in your task file); put needed changes elsewhere into your report.
- Next.js 16.3.8, React 19, Tailwind v4, shadcn/ui (new-york), next-intl (default locale vi, cookie NEXT_LOCALE), Vitest, Playwright (Chromium installed). Next 16 differs from older versions — docs are in the repo's next package `dist/docs/` (read via the Read tool).
- Supabase is the PRODUCTION database: read-only for you (never insert/update/delete, never upload/delete gallery images, never change profile data). Credentials in `/Users/nguyendangdinh/LiverpoolApp/.env` — never print them.
- Disk is tight (a full disk blocked everything earlier). Keep footprint small: delete your private build dir and screenshots you no longer need when you finish; don't write large dumps.
- Verification dev server (UI engineers): your OWN server with a private build dir via env `NEXT_DIST_DIR`, e.g. `NEXT_DIST_DIR=.build-<name> npx next dev -p <port>` run in background; ports: shell 3310, home 3311, football 3312, news 3313, club 3314. NEVER use 3000 or 3200 (the user's servers). NEVER use pkill/killall or kill processes you did not start; at the end `kill <pid>` of your own server only, and `rm -rf` your `.build-<name>` dir.
- Screenshots: Playwright via `createRequire('/Users/nguyendangdinh/LiverpoolApp/package.json')('@playwright/test')` in a script under `/private/tmp/claude-501/-Users-nguyendangdinh-Personal-Pomodoro/e87035c9-9a5f-4314-919e-6507586739f2/scratchpad/<your-name>/`. OPEN and LOOK at the screenshots (Read tool on the PNG).
- i18n: new strings go in BOTH `src/messages/en.json` and `vi.json`. Re-read the file immediately before each small Edit (others edit it too), never rewrite wholesale, keep JSON valid; `npx vitest run src/messages` must stay green (it checks key parity and that keys used in code exist).
- Gates before you report: `cd /Users/nguyendangdinh/LiverpoolApp && npx tsc --noEmit -p .` (ignore errors in files you do not own that others are mid-edit on — say so), `npx eslint <your files>` 0 errors, `npx vitest run` green.
- Do NOT commit/push, do NOT change dependencies.
- Final report: concise; per goal what changed (+ screenshot paths 390/768/1440 vi & en for UI work), numbers measured, issues found outside your files, gate results, confirmation your dev server is stopped and build dir removed.
