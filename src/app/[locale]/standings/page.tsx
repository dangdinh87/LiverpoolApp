import { getTranslations, setRequestLocale } from "next-intl/server";
import type { LocaleParams } from "@/i18n/routing";
import { getFixtures, getStandings, getUclStandings } from "@/lib/football";
import { standingsContext } from "@/lib/football/standings-context";
import { StandingsSummary } from "@/components/standings/standings-summary";
import { PageHero } from "@/components/ui/page-hero";
import { StandingsCompTabs } from "@/components/standings/standings-comp-tabs";
import { MatchCentreNav } from "@/components/fixtures/match-centre-nav";
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

export default async function StandingsPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Standings");
  // The Champions League table is a second tab when the data source has it (it is empty off-season).
  const [standings, uclStandings, fixtures] = await Promise.all([getStandings(), getUclStandings(), getFixtures()]);

  // Liverpool's next Premier League match: its opponent is tagged in the table.
  const nextLeague = fixtures
    .filter((f) => f.league.name === "Premier League" && f.fixture.status.short === "NS")
    .sort((a, b) => a.fixture.date.localeCompare(b.fixture.date))[0];
  const nextOpponentId = nextLeague ? (nextLeague.teams.home.id === 40 ? nextLeague.teams.away.id : nextLeague.teams.home.id) : undefined;
  const context = standingsContext(standings, 40, nextOpponentId);

  // Find Liverpool's position for the header
  const lfcStanding = standings.find((s) => s.team.id === 40);

  const suffix = lfcStanding
    ? t(`hero.suffixes.${lfcStanding.rank === 1 ? "st" : lfcStanding.rank === 2 ? "nd" : lfcStanding.rank === 3 ? "rd" : "th"}`)
    : "";

  return (
    <div className="min-h-screen">
      <JsonLd data={await buildLocalizedBreadcrumbJsonLd(locale, [{ nav: "standings", path: "/standings" }])} />
      <PageHero
        eyebrow={t("hero.season", { season: getCurrentSeasonLabel() })}
        title={t("hero.title")}
        description={
          lfcStanding
            ? `${t("hero.lfcPosition", { rank: lfcStanding.rank, suffix })} · ${t("hero.points", { count: lfcStanding.points })}`
            : t("description")
        }
        image="/assets/lfc/stadium/anfield-corner-flag.webp"
      />

      <div className="page-container pb-16">
        <MatchCentreNav active="standings" />
        <div className="pt-4 sm:pt-6">
          {context && <StandingsSummary context={context} nextFixtureId={nextLeague?.fixture.id} />}
          <StandingsCompTabs plStandings={standings} uclStandings={uclStandings} nextOpponentId={nextOpponentId} />
        </div>
      </div>
    </div>
  );
}
