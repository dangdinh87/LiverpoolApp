import { getTranslations, setRequestLocale } from "next-intl/server";
import type { LocaleParams } from "@/i18n/routing";
import { getFixtures, getStandings } from "@/lib/football";
import { getMatchResult } from "@/lib/types/football";
import { CloudOff } from "lucide-react";
import { FixtureTimeline } from "@/components/fixtures/fixture-timeline";
import { MatchCentreNav } from "@/components/fixtures/match-centre-nav";
import { SpoilerToggle } from "@/components/fixtures/spoiler-controls";
import { PageHero } from "@/components/ui/page-hero";
import { EmptyState } from "@/components/ui/empty-state";
import { DataPulseStrip, PresetConnectedGrid } from "@/components/ui/hub-links";
import { makePageMeta } from "@/lib/seo";
import { buildLocalizedBreadcrumbJsonLd } from "@/lib/seo-breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { getCurrentSeasonLabel } from "@/lib/football/current-season";

const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);
const LFC_ID = 40;

export async function generateMetadata({ params }: LocaleParams) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Fixtures.metadata" });
  const title = t("title");
  const description = t("description", { season: getCurrentSeasonLabel() });
  return { title, description, ...makePageMeta(title, description, { locale, path: "/fixtures" }) };
}

// Static page: the ?view=results deep link is handled in FixtureTimeline on the
// client, so nothing here reads the request and the route can be cached.
export const revalidate = 1800;

export default async function FixturesPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tHub, fixtures, standings] = await Promise.all([
    getTranslations("Fixtures"),
    getTranslations("Hub"),
    getFixtures(),
    getStandings().catch(() => []),
  ]);

  const seasonLabel = getCurrentSeasonLabel();
  const playedFixtures = fixtures.filter((f) => FINISHED_STATUSES.has(f.fixture.status.short));
  const upcomingCount = fixtures.filter((f) => !FINISHED_STATUSES.has(f.fixture.status.short)).length;

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  for (const f of playedFixtures) {
    const res = getMatchResult(f, LFC_ID);
    if (res === "W") wins++;
    else if (res === "D") draws++;
    else if (res === "L") losses++;
    const isHome = f.teams.home.id === LFC_ID;
    goalsFor += (isHome ? f.goals.home : f.goals.away) ?? 0;
    goalsAgainst += (isHome ? f.goals.away : f.goals.home) ?? 0;
  }

  const lfcStanding = standings.find((s) => s.team.id === LFC_ID);
  const goalDiff = goalsFor - goalsAgainst;

  return (
    <div className="min-h-screen">
      <JsonLd data={await buildLocalizedBreadcrumbJsonLd(locale, [{ nav: "fixtures", path: "/fixtures" }])} />
      <PageHero
        clubCrest
        eyebrow={t("hero.season", { season: seasonLabel })}
        title={t("hero.title")}
        description={t("hero.subtitle", { count: fixtures.length })}
        image="/assets/lfc/stadium/anfield-champions-league.webp"
      />

      <div className="page-container pb-16">
        {fixtures.length > 0 && (
          <DataPulseStrip
            eyebrow={`${tHub("seasonPulse")} · ${seasonLabel}`}
            className="mt-4 mb-4"
            items={[
              {
                label: tHub("metrics.record"),
                value: `${wins}-${draws}-${losses}`,
                sublabel: `${playedFixtures.length} ${tHub("metrics.played")}`,
                href: "/season",
                accent: "red",
              },
              {
                label: tHub("metrics.goalsForAgainst"),
                value: `${goalsFor} : ${goalsAgainst}`,
                sublabel: `${goalDiff >= 0 ? "+" : ""}${goalDiff}`,
                href: "/stats",
                accent: "emerald",
              },
              {
                label: tHub("metrics.plRank"),
                value: lfcStanding ? `#${lfcStanding.rank}` : "—",
                sublabel: lfcStanding
                  ? `${lfcStanding.points} · ${lfcStanding.goalsDiff >= 0 ? "+" : ""}${lfcStanding.goalsDiff} (${tHub("metrics.pointsGd")})`
                  : tHub("nav.standings"),
                href: "/standings",
                accent: "gold",
              },
              {
                label: tHub("metrics.upcoming"),
                value: upcomingCount,
                sublabel: tHub("nav.predictions"),
                href: "/predictions",
                accent: "red",
              },
            ]}
          />
        )}

        {fixtures.length > 0 ? (
          <FixtureTimeline
            fixtures={fixtures}
            showArchiveLink
          />
        ) : (
          <>
            <MatchCentreNav active="fixtures" />
            <div className="mt-3 flex justify-end">
              <SpoilerToggle />
            </div>
            <EmptyState
              className="mt-6"
              tone="error"
              icon={<CloudOff className="size-9" aria-hidden />}
              title={t("outage.title")}
              description={t("outage.description")}
              actionHref="/news"
              actionLabel={t("outage.action")}
            />
          </>
        )}

        <PresetConnectedGrid
          preset="fromFixtures"
          metaOverrides={{
            standings: lfcStanding ? `#${lfcStanding.rank} · ${lfcStanding.points}` : undefined,
            predictions: `${upcomingCount} ${tHub("metrics.upcoming")}`,
          }}
          className="mt-12"
        />
      </div>
    </div>
  );
}
