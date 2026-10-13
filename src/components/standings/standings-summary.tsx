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
  const { rank, behindLeader, topFour, aboveDrop, opponent } = context;
  // Each tile is a figure and what it is. The labels used to repeat the figure
  // ("9" above "9 points behind the leader"), and the first one named a second,
  // different number — a big rank beside the points total — so two tiles could
  // read "9" and mean different things.
  const items = [
    { value: `${rank}`, label: t("position") },
    { value: `${behindLeader}`, label: behindLeader === 0 ? t("leading") : t("behindLeader", { count: behindLeader }) },
    {
      value: `${topFour.gap}`,
      label: topFour.inside ? t("topFourClear", { count: topFour.gap }) : t("topFourBehind", { count: topFour.gap }),
    },
    { value: `${aboveDrop}`, label: t("aboveDrop", { count: aboveDrop }) },
  ];

  return (
    <section aria-label={t("label")} className="mb-5 border border-[var(--line)] bg-[var(--surface-2)] sm:mb-6">
      {/* 1px gaps over the line colour draw the dividers in both the 2x2 and the 1x4 layout.
          Each item is a term then its figure (valid <dl> order); the figure is drawn first:
          beside the label on a phone, above it from `sm`. */}
      <dl className="grid grid-cols-2 gap-px bg-[var(--line)] sm:grid-cols-4">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex flex-row-reverse items-center justify-end gap-3 bg-[var(--surface-2)] p-3 sm:flex-col-reverse sm:items-start sm:justify-start sm:gap-0 sm:p-4"
          >
            <dt className="text-[13px] leading-snug text-stadium-muted sm:mt-1.5">{item.label}</dt>
            <dd className={`w-9 shrink-0 text-center font-bebas text-3xl leading-none tabular-nums sm:w-auto sm:text-left sm:text-4xl ${i === 0 ? "text-brand" : "text-white"}`}>{item.value}</dd>
          </div>
        ))}
      </dl>
      {opponent && (
        <p className="border-t border-[var(--line)] px-3 py-2.5 text-[13px] leading-snug text-white/85 sm:px-4 sm:py-3 sm:text-sm">
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
