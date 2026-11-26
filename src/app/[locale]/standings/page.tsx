import { unstable_cache } from "next/cache";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { LocaleParams } from "@/i18n/routing";
import { FOOTBALL_CACHE_TAG } from "@/lib/football/cache-tags";
import { requireNonEmptyArray } from "@/lib/football/fdo-client";
import { getFixtures, getStandings, getUclStandings } from "@/lib/football";
import { standingsContext } from "@/lib/football/standings-context";
import { StandingsSummary } from "@/components/standings/standings-summary";
import { PageHero } from "@/components/ui/page-hero";
import { StandingsCompTabs } from "@/components/standings/standings-comp-tabs";
import { MatchCentreNav } from "@/components/fixtures/match-centre-nav";
import { displayTeamName } from "@/components/fixtures/team-name";
import { PresetConnectedGrid } from "@/components/ui/hub-links";
import { defaultTimeZoneForLocale, formatMatchDayMonth, formatMatchTime } from "@/lib/format-match-date";
import { makePageMeta } from "@/lib/seo";
import { buildLocalizedBreadcrumbJsonLd } from "@/lib/seo-breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { getCurrentSeasonLabel } from "@/lib/football/current-season";

export async function generateMetadata({ params }: LocaleParams) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Standings.metadata" });
  const title = t("title");
  const description = t("description", { season: getCurrentSeasonLabel() });
  return { title, description, ...makePageMeta(title, description, { locale, path: "/standings" }) };
}

export const revalidate = 21600; // 6 hours

// Match the 6h page window: calling raw getFixtures() directly ran a 300s fetch
// inside render, silently lowering /standings ISR from 6h down to 5 minutes.
const getCachedStandingsFixtures = unstable_cache(
  async () => requireNonEmptyArray(getFixtures()),
  ["standings-fixtures-v1"],
  { revalidate: 21600, tags: [FOOTBALL_CACHE_TAG] },
);

export default async function StandingsPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const uiLocale = locale === "vi" ? "vi" : "en";
  // The Champions League table is a second tab when the data source has it (it is empty off-season).
  const [t, standings, uclStandings, fixtures] = await Promise.all([
    getTranslations("Standings"),
    getStandings(),
    getUclStandings(),
    getCachedStandingsFixtures().catch(() => []),
  ]);

  // Liverpool's next Premier League match: its opponent is tagged in the table.
  const nextLeague = fixtures
    .filter((f) => f.league.name === "Premier League" && f.fixture.status.short === "NS")
    .sort((a, b) => a.fixture.date.localeCompare(b.fixture.date))[0];
  const nextMatch =
    nextLeague ??
    fixtures
      .filter((f) => f.fixture.status.short === "NS")
      .sort((a, b) => a.fixture.date.localeCompare(b.fixture.date))[0];
  const nextOpponentId = nextLeague ? (nextLeague.teams.home.id === 40 ? nextLeague.teams.away.id : nextLeague.teams.home.id) : undefined;
  const context = standingsContext(standings, 40, nextOpponentId);

  // Find Liverpool's position for the header
  const lfcStanding = standings.find((s) => s.team.id === 40);
  const nextOpponentName = nextMatch
    ? displayTeamName(nextMatch.teams.home.id === 40 ? nextMatch.teams.away.name : nextMatch.teams.home.name)
    : null;
  const nextKickoff = nextMatch
    ? `${formatMatchDayMonth(new Date(nextMatch.fixture.date), uiLocale, false, defaultTimeZoneForLocale(locale))} · ${formatMatchTime(new Date(nextMatch.fixture.date), defaultTimeZoneForLocale(locale))}`
    : null;

  const suffix = lfcStanding
    ? t(`hero.suffixes.${lfcStanding.rank === 1 ? "st" : lfcStanding.rank === 2 ? "nd" : lfcStanding.rank === 3 ? "rd" : "th"}`)
    : "";

  return (
    <div className="min-h-screen">
      <JsonLd data={await buildLocalizedBreadcrumbJsonLd(locale, [{ nav: "standings", path: "/standings" }])} />
      <PageHero
        clubCrest
        eyebrow={t("hero.season", { season: getCurrentSeasonLabel() })}
        title={t("hero.title")}
        description={
          lfcStanding ? (
            <>
              <span className="spoiler-hide">
                {`${t("hero.lfcPosition", { rank: lfcStanding.rank, suffix })} · ${t("hero.points", { count: lfcStanding.points })}`}
              </span>
              <span className="spoiler-show">{t("description")}</span>
            </>
          ) : (
            t("description")
          )
        }
        image="/assets/lfc/stadium/anfield-corner-flag.webp"
      />

      <MatchCentreNav active="standings" />

      <div className="page-container pb-20 pt-8 sm:pt-10">
        {context && <StandingsSummary context={context} nextFixtureId={nextLeague?.fixture.id} />}
        <StandingsCompTabs plStandings={standings} uclStandings={uclStandings} nextOpponentId={nextOpponentId} />
        <PresetConnectedGrid
          preset="fromStandings"
          metaOverrides={{
            fixtures: nextOpponentName && nextKickoff ? `${nextOpponentName} · ${nextKickoff}` : undefined,
            stats: lfcStanding ? `${lfcStanding.all.goals.for}:${lfcStanding.all.goals.against}` : undefined,
            season: getCurrentSeasonLabel(),
          }}
          className="mt-12"
        />
      </div>
    </div>
  );
}
