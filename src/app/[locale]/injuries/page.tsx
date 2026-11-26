import type { Metadata } from "next";
import Image from "next/image";
import { unstable_cache } from "next/cache";
import { Activity, ArrowRight, Calendar, CheckCircle2, CloudOff } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { LocaleParams } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getPlayerSlugByName, getSquadPlayers, type LfcPlayer } from "@/lib/squad-data";
import { findFplMatch, getAllFplStats, getFixtures, type FplPlayerStats } from "@/lib/football";
import { FOOTBALL_CACHE_TAG } from "@/lib/football/cache-tags";
import { CANONICAL_LFC_ID, requireNonEmptyArray } from "@/lib/football/fdo-client";
import { competitionLabel } from "@/lib/competition-labels";
import { defaultTimeZoneForLocale, formatMatchDate } from "@/lib/format-match-date";
import { getCachedNewsFeed } from "@/lib/news/cached-feed";
import { PageHero } from "@/components/ui/page-hero";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { NewsCard } from "@/components/news/news-card";
import { PresetConnectedGrid, SectionSubNav } from "@/components/ui/hub-links";
import { JsonLd } from "@/components/seo/json-ld";
import { buildLocalizedBreadcrumbJsonLd } from "@/lib/seo-breadcrumbs";
import { makePageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const revalidate = 21600; // 6h — matches FPL stats & news-feed-v1 cache TTLs

const getCachedInjuriesFixtures = unstable_cache(
  async () => requireNonEmptyArray(getFixtures()),
  ["injuries-next-fixture-v1"],
  { revalidate: 21600, tags: [FOOTBALL_CACHE_TAG] },
);

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Injuries.metadata" });
  const title = t("title");
  const description = t("description");
  return { title, description, ...makePageMeta(title, description, { locale, path: "/injuries" }) };
}

type StatusKey = "injured" | "doubtful" | "suspended" | "unavailable";

function mapFplStatus(status: string, chance: number | null): StatusKey {
  if (status === "s") return "suspended";
  if (status === "d" || (chance !== null && chance > 0 && chance < 100)) return "doubtful";
  if (status === "u" || status === "n") return "unavailable";
  return "injured";
}

const STATUS_STYLE: Record<StatusKey, string> = {
  injured: "border-lfc-red/40 bg-lfc-red/15 text-brand",
  suspended: "border-lfc-red/40 bg-lfc-red/15 text-brand",
  doubtful: "border-lfc-gold/40 bg-lfc-gold/15 text-lfc-gold",
  unavailable: "border-white/20 bg-white/10 text-white/80",
};

interface FlaggedPlayer {
  player: LfcPlayer;
  fpl: FplPlayerStats;
  statusKey: StatusKey;
}

function findMentionedPlayers(title: string, players: LfcPlayer[]): LfcPlayer[] {
  const lower = title.toLowerCase();
  return players.filter((p) => {
    if (lower.includes(p.name.toLowerCase())) return true;
    const parts = p.name.trim().split(/\s+/);
    const last = parts[parts.length - 1] ?? "";
    if (last.length < 4) return false;
    const escaped = last.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(title);
  }).slice(0, 3);
}

export default async function InjuriesPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, tHub, fplStats, feed, fixtures, breadcrumbJsonLd] = await Promise.all([
    getTranslations({ locale, namespace: "Injuries" }),
    getTranslations({ locale, namespace: "Hub" }),
    getAllFplStats(),
    getCachedNewsFeed(100).catch(() => []),
    getCachedInjuriesFixtures().catch(() => []),
    buildLocalizedBreadcrumbJsonLd(locale, [{ nav: "injuries", path: "/injuries" }]),
  ]);

  const squadPlayers = getSquadPlayers();
  const availabilityUnavailable = fplStats.length === 0;
  const flagged: FlaggedPlayer[] = [];
  let availableCount = 0;

  if (!availabilityUnavailable) {
    for (const player of squadPlayers) {
      const fpl = findFplMatch(player.name, fplStats);
      if (!fpl) {
        availableCount += 1;
        continue;
      }
      const hasFlag =
        fpl.status !== "a" ||
        (fpl.chanceOfPlayingNextRound !== null && fpl.chanceOfPlayingNextRound < 100) ||
        fpl.news.trim().length > 0;
      if (hasFlag) {
        flagged.push({
          player,
          fpl,
          statusKey: mapFplStatus(fpl.status, fpl.chanceOfPlayingNextRound),
        });
      } else {
        availableCount += 1;
      }
    }
  }

  const nextMatch =
    [...fixtures]
      .filter((f) => f.fixture.status.short === "NS")
      .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())[0] ?? null;

  const isNextHome = nextMatch ? nextMatch.teams.home.id === CANONICAL_LFC_ID : true;
  const nextOpponent = nextMatch
    ? isNextHome
      ? nextMatch.teams.away
      : nextMatch.teams.home
    : null;
  const nextKickoff = nextMatch
    ? formatMatchDate(
        new Date(nextMatch.fixture.date),
        locale,
        defaultTimeZoneForLocale(locale),
      )
    : null;

  const injuryNews = feed.filter((a) => a.category === "injury").slice(0, 9);
  const nowMs = new Date().getTime();

  return (
    <div className="min-h-screen bg-stadium-bg">
      <JsonLd data={breadcrumbJsonLd} />
      <PageHero
        clubCrest
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        description={t("hero.description")}
      />

      <SectionSubNav
        group="club"
        current="injuries"
      />

      <div className="page-container space-y-10 pb-20 pt-8 sm:pt-10">

          {nextMatch && nextOpponent && (
            <section
              aria-label={tHub("metrics.nextMatchImpact")}
              className="border border-stadium-border border-t-2 border-t-lfc-red bg-stadium-surface p-4 sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5 min-w-0">
                  {nextOpponent.logo && (
                    <div className="relative size-12 shrink-0 bg-stadium-surface2 p-1.5 border border-stadium-border">
                      <Image
                        src={nextOpponent.logo}
                        alt={nextOpponent.name}
                        fill
                        sizes="48px"
                        className="object-contain p-1.5"
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="section-label text-brand">{tHub("metrics.nextMatchImpact")}</p>
                    <h2 className="mt-1 truncate font-bebas text-2xl leading-none tracking-wide text-white sm:text-3xl">
                      {isNextHome
                        ? `Liverpool vs ${nextOpponent.name}`
                        : `${nextOpponent.name} vs Liverpool`}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stadium-muted">
                      <span className="font-barlow font-semibold uppercase tracking-wider text-lfc-gold">
                        {competitionLabel(nextMatch.league.name, locale)}
                      </span>
                      {nextKickoff && (
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Calendar className="size-3.5" aria-hidden />
                          {tHub("metrics.kickoff")}: {nextKickoff}
                        </span>
                      )}
                      {!availabilityUnavailable && (
                        <span className="tabular-nums text-white/80">
                          {t("summary.sidelined", { count: flagged.length })} · {t("summary.available", { count: availableCount })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/fixtures/${nextMatch.fixture.id}`}
                  className="tap-target inline-flex shrink-0 items-center justify-center gap-1.5 border border-lfc-red/50 bg-lfc-red/15 px-4 py-2 font-barlow text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-lfc-red"
                >
                  {tHub("metrics.viewMatchCentre")}
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
              {flagged.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-stadium-border pt-3">
                  {flagged.slice(0, 6).map(({ player, statusKey }) => {
                    const slug = getPlayerSlugByName(player.name) ?? player.slug;
                    return (
                      <Link
                        key={slug}
                        href={`/player/${slug}`}
                        className={cn(
                          "inline-flex items-center gap-1.5 border px-2.5 py-1 font-barlow text-xs font-semibold uppercase tracking-wider transition-colors hover:border-white/40",
                          STATUS_STYLE[statusKey],
                        )}
                      >
                        <span>{player.name}</span>
                        <span className="opacity-80">· {t(`status.${statusKey}`)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {!availabilityUnavailable && (
            <div className="surface flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-2 font-semibold text-white">
                  <Activity className="size-4 text-lfc-red" aria-hidden />
                  {t("summary.sidelined", { count: flagged.length })}
                </span>
                <span className="text-stadium-muted">
                  {t("summary.available", { count: availableCount })}
                </span>
                <span className="text-xs text-stadium-muted">
                  · {t("summary.updated")}
                </span>
              </div>
              <Link
                href="/squad"
                className="tap-target inline-flex items-center gap-1.5 font-barlow text-xs font-semibold uppercase tracking-[0.12em] text-stadium-muted transition-colors hover:text-white"
              >
                {t("viewSquad")}
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          )}

          <section aria-label={t("sections.sidelined")}>
            <SectionHeader title={t("sections.sidelined")} />
            {availabilityUnavailable ? (
              <EmptyState
                icon={<CloudOff className="size-8 text-stadium-muted" aria-hidden />}
                title={t("outage.title")}
                description={t("outage.description")}
                actionHref="/squad"
                actionLabel={t("viewSquad")}
              />
            ) : flagged.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="size-8 text-green-400" aria-hidden />}
                title={t("empty.title")}
                description={t("empty.description")}
                actionHref="/squad"
                actionLabel={t("viewSquad")}
              />
            ) : (
              <ul className={cn("grid gap-3 sm:grid-cols-2", flagged.length >= 3 && "lg:grid-cols-3")}>
                {flagged.map(({ player, fpl, statusKey }) => {
                  const slug = getPlayerSlugByName(player.name) ?? player.slug;
                  return (
                    <li key={slug}>
                      <Link
                        href={`/player/${slug}`}
                        className="surface tap-target group flex items-start gap-3.5 p-4 transition-colors hover:border-white/25"
                      >
                        <div className="relative size-14 shrink-0 overflow-hidden bg-[var(--surface-3)]">
                          <Image
                            src={player.localPhoto || player.photo}
                            alt={player.name}
                            fill
                            sizes="56px"
                            className="object-cover object-top"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bebas text-2xl leading-none tracking-wide text-white group-hover:text-lfc-gold">
                              {player.name}
                            </span>
                            {player.shirtNumber > 0 && (
                              <span className="font-barlow text-xs font-semibold text-stadium-muted">
                                #{player.shirtNumber}
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "inline-block border px-2 py-0.5 font-barlow text-[11px] font-semibold uppercase tracking-wider",
                                STATUS_STYLE[statusKey],
                              )}
                            >
                              {t(`status.${statusKey}`)}
                            </span>
                            {fpl.chanceOfPlayingNextRound !== null && fpl.chanceOfPlayingNextRound < 100 && (
                              <span className="text-xs text-stadium-muted">
                                {t("chanceOfPlaying", { pct: fpl.chanceOfPlayingNextRound })}
                              </span>
                            )}
                          </div>
                          {fpl.news.trim() && (
                            <p className="mt-2 text-sm leading-snug text-white/80">{fpl.news.trim()}</p>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {injuryNews.length > 0 && (
            <section aria-label={t("sections.news")}>
              <SectionHeader title={t("sections.news")} href="/news" linkLabel={t("allNews")} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {injuryNews.map((article) => {
                  const mentioned = findMentionedPlayers(article.title, squadPlayers);
                  return (
                    <div key={article.link} className="flex flex-col">
                      <NewsCard article={article} nowMs={nowMs} variant="tile" />
                      {mentioned.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {mentioned.map((p) => {
                            const slug = getPlayerSlugByName(p.name);
                            if (!slug) return null;
                            return (
                              <Link
                                key={slug}
                                href={`/player/${slug}`}
                                className="inline-flex items-center gap-1 border border-stadium-border bg-stadium-surface px-2.5 py-1 font-barlow text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:border-lfc-gold hover:text-lfc-gold"
                              >
                                {p.shirtNumber > 0 && <span className="text-lfc-gold tabular-nums">#{p.shirtNumber}</span>}
                                <span>{p.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <PresetConnectedGrid
            preset="fromInjuries"
            metaOverrides={{
              squad: availabilityUnavailable ? `${squadPlayers.length}` : `${availableCount}/${squadPlayers.length}`,
              fixtures: nextOpponent?.name,
            }}
          />
      </div>
    </div>
  );
}
