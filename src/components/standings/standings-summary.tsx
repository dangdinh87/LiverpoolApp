import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { displayTeamName } from "@/components/fixtures/team-name";
import type { StandingsContext } from "@/lib/football/standings-context";

/**
 * Liverpool's place in the table in a fan's terms, above the full table: the
 * gaps that matter (leader, top four, drop) and where the next opponent sits.
 */
export async function StandingsSummary({ context, nextFixtureId }: { context: StandingsContext; nextFixtureId?: number }) {
  const t = await getTranslations("Standings.summary");
  const { rank, points, behindLeader, topFour, aboveDrop, opponent } = context;
  const items = [
    { value: `${rank}`, label: t("position", { points }) },
    { value: `${behindLeader}`, label: behindLeader === 0 ? t("leading") : t("behindLeader", { count: behindLeader }) },
    {
      value: `${topFour.gap}`,
      label: topFour.inside ? t("topFourClear", { count: topFour.gap }) : t("topFourBehind", { count: topFour.gap }),
    },
    { value: `${aboveDrop}`, label: t("aboveDrop", { count: aboveDrop }) },
  ];

  return (
    <section aria-label={t("label")} className="mb-6 border border-[var(--line)] bg-[var(--surface-2)]">
      {/* 1px gaps over the line colour draw the dividers in both the 2x2 and the 1x4 layout. */}
      <dl className="grid grid-cols-2 gap-px bg-[var(--line)] sm:grid-cols-4">
        {items.map((item, i) => (
          <div key={i} className="bg-[var(--surface-2)] p-4">
            <dd className={`font-bebas text-4xl leading-none tabular-nums ${i === 0 ? "text-brand" : "text-white"}`}>{item.value}</dd>
            <dt className="mt-1.5 text-[13px] leading-snug text-stadium-muted">{item.label}</dt>
          </div>
        ))}
      </dl>
      {opponent && (
        <p className="border-t border-[var(--line)] px-4 py-3 text-sm text-white/85">
          {t.rich("next", {
            team: displayTeamName(opponent.name),
            rank: opponent.rank,
            points: opponent.points,
            b: (chunks) => <b className="font-semibold text-white">{chunks}</b>,
          })}
          {nextFixtureId && (
            <Link href={`/fixtures/${nextFixtureId}`} className="ml-2 text-brand underline-offset-4 hover:underline">
              {t("matchLink")}
            </Link>
          )}
        </p>
      )}
    </section>
  );
}
