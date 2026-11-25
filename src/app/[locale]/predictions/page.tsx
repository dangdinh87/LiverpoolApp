import { getTranslations, setRequestLocale } from "next-intl/server";
import { Trophy } from "lucide-react";
import type { LocaleParams } from "@/i18n/routing";
import { getCachedFixtures } from "@/lib/football/cached-fixtures";
import { getMatchResult } from "@/lib/types/football";
import { getPredictionLeaderboard, type LeaderboardRow } from "@/lib/fan-predictions/leaderboard";
import { EXACT_POINTS, RESULT_POINTS } from "@/lib/fan-predictions/scoring";
import { PageHero } from "@/components/ui/page-hero";
import { EmptyState } from "@/components/ui/empty-state";
import { DataPulseStrip, PresetConnectedGrid, SectionSubNav } from "@/components/ui/hub-links";
import { displayTeamName } from "@/components/fixtures/team-name";
import { FanPrediction } from "@/components/fixtures/fan-prediction";
import { defaultTimeZoneForLocale, formatMatchDayMonth, formatMatchTime } from "@/lib/format-match-date";
import { makePageMeta } from "@/lib/seo";
import { buildLocalizedBreadcrumbJsonLd } from "@/lib/seo-breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/utils";

const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);

export async function generateMetadata({ params }: LocaleParams) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Predict.page" });
  return { title: t("title"), description: t("description"), ...makePageMeta(t("title"), t("description"), { locale, path: "/predictions" }) };
}

export const revalidate = 3600;

export default async function PredictionsPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const uiLocale = locale === "vi" ? "vi" : "en";

  const [t, tHub, rows, fixtures] = await Promise.all([
    getTranslations("Predict.page"),
    getTranslations("Hub"),
    getPredictionLeaderboard().catch((): LeaderboardRow[] | null => null),
    getCachedFixtures(),
  ]);
  // The next match still open for predictions: where the call to action points.
  const now = new Date().getTime();
  const next = fixtures
    .filter((f) => f.fixture.status.short === "NS" && new Date(f.fixture.date).getTime() > now && f.fixture.id > 0)
    .sort((a, b) => a.fixture.date.localeCompare(b.fixture.date))[0];
  const upcomingCount = fixtures.filter(
    (f) => f.fixture.status.short === "NS" && new Date(f.fixture.date).getTime() > now,
  ).length;
  const finished = fixtures
    .filter((f) => FINISHED_STATUSES.has(f.fixture.status.short))
    .sort((a, b) => b.fixture.date.localeCompare(a.fixture.date));
  const last5 = finished
    .slice(0, 5)
    .reverse()
    .map((f) => getMatchResult(f))
    .filter((r) => r !== "NS");
  let wins = 0;
  let draws = 0;
  let losses = 0;
  for (const f of finished) {
    const res = getMatchResult(f);
    if (res === "W") wins++;
    else if (res === "D") draws++;
    else if (res === "L") losses++;
  }
  const nextOpponent = next
    ? displayTeamName(next.teams.home.id === 40 ? next.teams.away.name : next.teams.home.name)
    : null;
  const nextKickoff = next
    ? `${formatMatchDayMonth(new Date(next.fixture.date), uiLocale, false, defaultTimeZoneForLocale(locale))} · ${formatMatchTime(new Date(next.fixture.date), defaultTimeZoneForLocale(locale))}`
    : null;

  return (
    <div className="min-h-screen">
      <JsonLd data={await buildLocalizedBreadcrumbJsonLd(locale, [{ name: t("title"), path: "/predictions" }])} />
      <PageHero clubCrest eyebrow={t("eyebrow")} title={t("title")} description={t("rule", { exact: EXACT_POINTS, result: RESULT_POINTS })} />

      {/* The width goes on an inner box: .page-container's own max-width outranks max-w-3xl. */}
      <div className="page-container pb-16 pt-4">
        <SectionSubNav group="match" current="predictions" className="mb-6" />

        <DataPulseStrip
          eyebrow={tHub("seasonPulse")}
          className="mb-8"
          items={[
            {
              label: tHub("metrics.recentForm"),
              value: last5.length > 0 ? last5.join(" ") : "—",
              sublabel: `${wins}-${draws}-${losses} · ${tHub("nav.standings")}`,
              href: "/standings",
              accent: "emerald",
            },
            {
              label: tHub("metrics.upcoming"),
              value: upcomingCount,
              sublabel: tHub("nav.fixtures"),
              href: "/fixtures",
              accent: "red",
            },
            {
              label: tHub("metrics.nextMatch"),
              value: nextOpponent ?? "—",
              sublabel: nextKickoff ?? tHub("nav.fixtures"),
              href: next ? `/fixtures/${next.fixture.id}#predict-title` : "/fixtures",
              accent: "gold",
            },
            {
              label: tHub("metrics.predictionPoints"),
              value: rows && rows.length > 0 ? rows[0].points : "—",
              sublabel: rows && rows.length > 0 ? rows[0].name : t("tableTitle"),
              accent: "gold",
            },
          ]}
        />

        <div className="mx-auto max-w-3xl space-y-8">
          {next && (
            <FanPrediction fixture={next} hideLeaderboardLink showMatchMeta className="mt-0" />
          )}

          <section aria-labelledby="leaderboard-title">
            <h2 id="leaderboard-title" className="mb-3 font-bebas text-3xl text-white">{t("tableTitle")}</h2>
            {rows === null ? (
              <EmptyState tone="error" icon={<Trophy className="size-9" aria-hidden />} title={t("unavailableTitle")} description={t("unavailableDesc")} />
            ) : rows.length === 0 ? (
              <EmptyState
                icon={<Trophy className="size-9" aria-hidden />}
                title={t("emptyTitle")}
                description={t("emptyDesc")}
                actionHref={next ? `/fixtures/${next.fixture.id}#predict-title` : undefined}
                actionLabel={t("emptyAction")}
              />
            ) : (
              <table className="w-full text-sm">
                <caption className="sr-only">{t("tableTitle")}</caption>
                <thead>
                  <tr className="border-b border-[var(--line)] text-left font-barlow text-xs uppercase tracking-wider text-stadium-muted">
                    <th scope="col" className="w-12 py-2 font-semibold">#</th>
                    <th scope="col" className="py-2 font-semibold">{t("fan")}</th>
                    <th scope="col" className="w-16 py-2 text-right font-semibold">{t("exact")}</th>
                    <th scope="col" className="w-16 py-2 text-right font-semibold">{t("played")}</th>
                    <th scope="col" className="w-16 py-2 text-right font-semibold">{t("points")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.rank} className="border-b border-[var(--line)]">
                      <td className={cn("py-3 font-bebas text-xl tabular-nums", r.rank === 1 ? "text-lfc-gold" : "text-white/50")}>{r.rank}</td>
                      <td className="py-3 font-semibold text-white">{r.name}</td>
                      <td className="py-3 text-right tabular-nums text-white/80">{r.exact}</td>
                      <td className="py-3 text-right tabular-nums text-white/80">{r.played}</td>
                      <td className="py-3 text-right font-bebas text-2xl tabular-nums text-white">{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <PresetConnectedGrid
          preset="fromPredictions"
          metaOverrides={{
            fixtures: `${upcomingCount} ${tHub("metrics.upcoming")}`,
            standings: last5.length > 0 ? last5.join(" ") : undefined,
          }}
          className="mt-12"
        />
      </div>
    </div>
  );
}
