import { getTranslations, setRequestLocale } from "next-intl/server";
import { Trophy } from "lucide-react";
import type { LocaleParams } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getFixtures } from "@/lib/football";
import { getPredictionLeaderboard, type LeaderboardRow } from "@/lib/fan-predictions/leaderboard";
import { EXACT_POINTS, RESULT_POINTS } from "@/lib/fan-predictions/scoring";
import { PageHero } from "@/components/ui/page-hero";
import { EmptyState } from "@/components/ui/empty-state";
import { displayTeamName } from "@/components/fixtures/team-name";
import { LocalMatchDay, LocalMatchTime } from "@/components/ui/local-time";
import { makePageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: LocaleParams) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Predict.page" });
  return { title: t("title"), description: t("description"), ...makePageMeta(t("title"), t("description"), { locale, path: "/predictions" }) };
}

export const revalidate = 600;

export default async function PredictionsPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Predict.page");
  const uiLocale = locale === "vi" ? "vi" : "en";

  const [rows, fixtures] = await Promise.all([
    getPredictionLeaderboard().catch((): LeaderboardRow[] | null => null),
    getFixtures(),
  ]);
  // The next match still open for predictions: where the call to action points.
  const now = new Date().getTime();
  const next = fixtures
    .filter((f) => f.fixture.status.short === "NS" && new Date(f.fixture.date).getTime() > now && f.fixture.id > 0)
    .sort((a, b) => a.fixture.date.localeCompare(b.fixture.date))[0];

  return (
    <div className="min-h-screen">
      <PageHero eyebrow={t("eyebrow")} title={t("title")} description={t("rule", { exact: EXACT_POINTS, result: RESULT_POINTS })} />

      {/* The width goes on an inner box: .page-container's own max-width outranks max-w-3xl. */}
      <div className="page-container pb-16 pt-6">
        <div className="mx-auto max-w-3xl">
          {next && (
            <Link
              href={`/fixtures/${next.fixture.id}#predict-title`}
              className="surface-interactive mb-8 flex items-center justify-between gap-4 p-4 sm:p-5"
            >
              <span className="min-w-0">
                <span className="block text-sm text-stadium-muted">{t("nextLabel")}</span>
                <span className="mt-0.5 block truncate font-semibold text-white">
                  {displayTeamName(next.teams.home.name)} v {displayTeamName(next.teams.away.name)}
                </span>
                <span className="mt-0.5 block text-sm tabular-nums text-stadium-muted">
                  <LocalMatchDay iso={next.fixture.date} locale={uiLocale} /> · <LocalMatchTime iso={next.fixture.date} locale={uiLocale} />
                </span>
              </span>
              <span className="inline-flex min-h-11 shrink-0 items-center bg-lfc-red px-4 font-barlow text-sm font-semibold uppercase tracking-[0.1em] text-white">
                {t("predictNow")}
              </span>
            </Link>
          )}

          <h2 className="mb-3 font-bebas text-3xl text-white">{t("tableTitle")}</h2>
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
        </div>
      </div>
    </div>
  );
}
