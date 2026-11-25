import { tool } from "ai";
import { z } from "zod";
import {
  getAllFplStats,
  getFixtures,
  getFplPlayerStats,
  getInjuries as fetchFootballInjuries,
  getStandings as fetchPlStandings,
  getUclStandings,
} from "@/lib/football";
import { getNewsFromDB, searchArticles } from "@/lib/news";
import { getCachedLatestDigest, getDigestHeadline } from "@/lib/news/latest-digest";
import { getVisibleDigestSections } from "@/lib/news/digest";
import { listSiteArticles, pickSiteArticleContent } from "@/lib/site-articles/db";
import { calculateAge, getAllPlayers, getCoach, getPlayerBio, POSITION_DISPLAY } from "@/lib/squad-data";
import { validateAssistantPath } from "./site-routes";

const UPCOMING_STATUSES = new Set(["NS", "TBD"]);
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);

function foldText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function isLiverpoolRow(name: string): boolean {
  return name.toLowerCase().includes("liverpool");
}

function formatVietnamDateTime(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const formatted = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${formatted} (GMT+7)`;
}

export interface AssistantToolsOptions {
  locale: "en" | "vi";
  spoilerFree: boolean;
}

/**
 * Create request-scoped AI SDK tools grounded in Anfield Daily's live football,
 * squad, news, digest, and match analysis layers.
 */
export function createAssistantTools({ locale, spoilerFree }: AssistantToolsOptions) {
  const emittedPaths = new Set<string>();

  const navigate = tool({
    description:
      "Show a clickable navigation card to a route on Anfield Daily. Call at most once per unique path in a reply.",
    inputSchema: z.object({
      path: z.string().describe("Route path without locale prefix, e.g. /fixtures, /standings, /player/virgil-van-dijk"),
      reason: z.string().describe("One short sentence explaining why this page helps, in the reply language."),
    }),
    execute: async ({ path, reason }) => {
      const check = validateAssistantPath(path, locale);
      if (!check.ok) {
        return { ok: false as const, error: check.error };
      }
      if (emittedPaths.has(check.path)) {
        return { ok: false as const, error: `Navigation card for ${check.path} already shown.` };
      }
      emittedPaths.add(check.path);
      return {
        ok: true as const,
        path: check.path,
        label: check.label,
        reason: reason.trim().slice(0, 140),
      };
    },
  });

  const getFixturesTool = tool({
    description:
      "Look up Liverpool FC upcoming fixtures, recent results, kick-off dates (UTC ISO), competitions, and venues.",
    inputSchema: z.object({
      mode: z.enum(["upcoming", "recent", "all"]).default("upcoming"),
      limit: z.number().int().min(1).max(8).default(5),
    }),
    execute: async ({ mode, limit }) => {
      try {
        const all = await getFixtures();
        const upcoming = all
          .filter((f) => UPCOMING_STATUSES.has(f.fixture.status.short))
          .sort((a, b) => a.fixture.date.localeCompare(b.fixture.date))
          .slice(0, limit)
          .map((f) => ({
            id: f.fixture.id,
            dateUtc: f.fixture.date,
            dateVietnam: formatVietnamDateTime(f.fixture.date),
            competition: f.league.name,
            round: f.league.round,
            home: f.teams.home.name,
            away: f.teams.away.name,
            venue: f.fixture.venue.name,
            path: `/fixtures/${f.fixture.id}`,
          }));

        const recent = all
          .filter((f) => FINISHED_STATUSES.has(f.fixture.status.short))
          .sort((a, b) => b.fixture.date.localeCompare(a.fixture.date))
          .slice(0, limit)
          .map((f) => ({
            id: f.fixture.id,
            dateUtc: f.fixture.date,
            dateVietnam: formatVietnamDateTime(f.fixture.date),
            competition: f.league.name,
            round: f.league.round,
            home: f.teams.home.name,
            away: f.teams.away.name,
            status: f.fixture.status.short,
            score: spoilerFree
              ? "hidden (spoiler-free mode active)"
              : `${f.goals.home ?? "?"}-${f.goals.away ?? "?"}`,
            path: `/fixtures/${f.fixture.id}`,
          }));

        const live = all
          .filter(
            (f) =>
              !UPCOMING_STATUSES.has(f.fixture.status.short) &&
              !FINISHED_STATUSES.has(f.fixture.status.short) &&
              !["CANC", "PST"].includes(f.fixture.status.short),
          )
          .slice(0, 2)
          .map((f) => ({
            id: f.fixture.id,
            dateUtc: f.fixture.date,
            dateVietnam: formatVietnamDateTime(f.fixture.date),
            competition: f.league.name,
            home: f.teams.home.name,
            away: f.teams.away.name,
            status: f.fixture.status.short,
            elapsed: f.fixture.status.elapsed,
            score: spoilerFree
              ? "hidden (spoiler-free mode active)"
              : `${f.goals.home ?? 0}-${f.goals.away ?? 0}`,
            path: `/fixtures/${f.fixture.id}`,
          }));

        return {
          ok: true as const,
          spoilerFree,
          live,
          upcoming: mode === "recent" ? [] : upcoming,
          recent: mode === "upcoming" ? [] : recent,
        };
      } catch {
        return { ok: false as const, error: "Could not load fixture data right now." };
      }
    },
  });

  const getStandingsTool = tool({
    description:
      "Fetch current Premier League ('pl') or Champions League ('ucl') standings, including Liverpool's rank, points, goal difference, and form.",
    inputSchema: z.object({
      competition: z.enum(["pl", "ucl"]).default("pl"),
    }),
    execute: async ({ competition }) => {
      try {
        const table =
          competition === "ucl" ? await getUclStandings() : await fetchPlStandings();
        if (table.length === 0) {
          return { ok: false as const, error: "Standings data is currently unavailable." };
        }

        const lfcIndex = table.findIndex((row) => isLiverpoolRow(row.team.name));
        const topIndices = new Set<number>([0, 1, 2, 3, 4, 5]);
        if (lfcIndex >= 0) {
          for (let i = Math.max(0, lfcIndex - 2); i <= Math.min(table.length - 1, lfcIndex + 2); i++) {
            topIndices.add(i);
          }
        }

        const slice = [...topIndices]
          .filter((i) => i < table.length)
          .sort((a, b) => a - b)
          .map((i) => {
            const r = table[i];
            return {
              rank: r.rank,
              team: r.team.shortName ?? r.team.name,
              played: r.all.played,
              won: r.all.win,
              drawn: r.all.draw,
              lost: r.all.lose,
              gd: r.goalsDiff,
              points: r.points,
              form: r.form,
            };
          });

        return {
          ok: true as const,
          competition: competition === "ucl" ? "Champions League" : "Premier League",
          liverpool: lfcIndex >= 0 ? slice.find((r) => isLiverpoolRow(r.team)) ?? null : null,
          table: slice,
        };
      } catch {
        return { ok: false as const, error: "Could not load standings right now." };
      }
    },
  });

  const findPlayerTool = tool({
    description:
      "Search Liverpool's first-team squad or head coach by name, shirt number, or position, returning bio details and current Premier League/FPL season stats.",
    inputSchema: z.object({
      query: z.string().min(1).max(80).describe("Player name, surname, shirt number, or 'coach'"),
    }),
    execute: async ({ query }) => {
      const q = foldText(query);
      if (["coach", "manager", "hlv", "iraola", "andoni"].some((kw) => q.includes(kw))) {
        const coach = getCoach();
        return {
          ok: true as const,
          kind: "coach" as const,
          coach: {
            name: coach.name,
            nationality: coach.nationality,
            bio: coach.metaDescription,
            path: "/squad",
          },
        };
      }

      const players = getAllPlayers();
      const numberQuery = /^\d{1,2}$/.test(q) ? Number(q) : null;
      const matches = players.filter((p) => {
        if (numberQuery !== null && p.shirtNumber === numberQuery) return true;
        const haystack = foldText(`${p.name} ${p.shirtName} ${p.slug} ${p.position}`);
        return haystack.includes(q);
      });

      if (matches.length === 0) {
        return {
          ok: false as const,
          error: `No Liverpool squad player matched "${query}".`,
        };
      }

      const top = matches[0];
      const [fpl] = await Promise.all([getFplPlayerStats(top.name)]);
      const bio = getPlayerBio(top.slug, locale);

      return {
        ok: true as const,
        kind: "player" as const,
        player: {
          name: top.name,
          shirtNumber: top.shirtNumber,
          position: POSITION_DISPLAY[top.position] ?? top.position,
          nationality: top.nationality,
          age: top.dateOfBirth ? calculateAge(top.dateOfBirth) : null,
          onLoan: top.onLoan,
          bioSnippet: bio.slice(0, 320),
          path: `/player/${top.slug}`,
          seasonStats: fpl
            ? {
                minutes: fpl.minutes,
                starts: fpl.starts,
                goals: fpl.goalsScored,
                assists: fpl.assists,
                cleanSheets: fpl.cleanSheets,
                yellowCards: fpl.yellowCards,
                redCards: fpl.redCards,
                availabilityStatus: fpl.status,
                injuryNews: fpl.news || null,
              }
            : null,
        },
        otherMatches: matches.slice(1, 5).map((p) => ({
          name: p.name,
          shirtNumber: p.shirtNumber,
          path: `/player/${p.slug}`,
        })),
      };
    },
  });

  const getLatestNewsTool = tool({
    description:
      "Read Liverpool's latest daily briefing, recent de-duplicated news articles (optionally filtered by search query), and recent match analysis articles.",
    inputSchema: z.object({
      query: z.string().max(120).optional().describe("Optional keyword such as a player, opponent, or transfer topic"),
      limit: z.number().int().min(1).max(8).default(5),
    }),
    execute: async ({ query, limit }) => {
      try {
        const cleanQuery = query?.trim();
        const [digest, articles, analyses] = await Promise.all([
          getCachedLatestDigest().catch(() => null),
          cleanQuery ? searchArticles(cleanQuery, limit) : getNewsFromDB(limit),
          listSiteArticles(3),
        ]);

        return {
          ok: true as const,
          latestDigest: digest
            ? {
                date: digest.digest_date,
                headline: getDigestHeadline(digest),
                summary: digest.summary.slice(0, 500),
                sections: getVisibleDigestSections(digest.sections)
                  .slice(0, 4)
                  .map((s) => ({ category: s.category, headline: s.headline })),
                path: `/news/digest/${digest.digest_date}`,
              }
            : null,
          articles: articles.slice(0, limit).map((a) => ({
            title: a.title,
            source: a.source,
            category: a.category,
            publishedAt: a.pubDate,
            snippet: a.contentSnippet.slice(0, 220),
          })),
          recentAnalyses: analyses.map((row) => {
            const content = pickSiteArticleContent(row, locale);
            return {
              slug: row.slug,
              kind: row.kind,
              matchDate: row.match_date,
              title: content?.title ?? row.slug,
              excerpt: content?.excerpt ?? "",
              path: `/analysis/${row.slug}`,
            };
          }),
        };
      } catch {
        return { ok: false as const, error: "Could not load news right now." };
      }
    },
  });

  const getInjuriesTool = tool({
    description:
      "Check current Liverpool FC injury list and player availability flags from match data and FPL updates.",
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const [injuries, fplStats] = await Promise.all([
          fetchFootballInjuries().catch(() => []),
          getAllFplStats().catch(() => []),
        ]);

        const flagged = fplStats
          .filter((p) => (p.status && p.status !== "a") || p.news.trim().length > 0)
          .map((p) => ({
            player: `${p.firstName} ${p.secondName}`.trim() || p.webName,
            status: p.status,
            chanceNextRound: p.chanceOfPlayingNextRound,
            news: p.news,
          }));

        return {
          ok: true as const,
          feedInjuries: injuries.slice(0, 12).map((i) => ({
            player: i.player.name,
            type: i.player.type,
            reason: i.player.reason,
          })),
          squadFlags: flagged.slice(0, 12),
          path: "/injuries",
        };
      } catch {
        return { ok: false as const, error: "Could not load injury data right now." };
      }
    },
  });

  return {
    navigate,
    getFixtures: getFixturesTool,
    getStandings: getStandingsTool,
    findPlayer: findPlayerTool,
    getLatestNews: getLatestNewsTool,
    getInjuries: getInjuriesTool,
  };
}
