import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getMatchResult, type Fixture, type MatchResult } from "@/lib/types/football";
import { cn } from "@/lib/utils";
import { RESULT_BADGE } from "@/lib/result-style";
import { WidgetHeader } from "./overview-card-shared";

const LFC_TEAM_ID = 40;

const RESULT_STYLE: Record<Exclude<MatchResult, "NS">, string> = RESULT_BADGE;

/** Last `count` finished Liverpool matches, oldest first (reads left to right in time). */
export function pickRecentResults(fixtures: Fixture[], count = 5): Fixture[] {
  return fixtures
    .filter(
      (f) =>
        (f.teams.home.id === LFC_TEAM_ID || f.teams.away.id === LFC_TEAM_ID) &&
        getMatchResult(f, LFC_TEAM_ID) !== "NS",
    )
    .sort((a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime())
    .slice(0, count)
    .reverse();
}

/** Recent results strip: opponent crest, score and a W/D/L marker per match. */
export async function FormWidget({ results }: { results: Fixture[] }) {
  const t = await getTranslations("Home.results");
  const label: Record<string, string> = { W: t("win"), D: t("draw"), L: t("loss") };

  return (
    <section aria-label={t("title")} className="surface reveal p-4">
      <WidgetHeader title={t("title")} href="/fixtures" linkLabel={t("all")} />
      {results.length === 0 ? (
        <p className="py-6 text-center text-sm text-stadium-muted">{t("empty")}</p>
      ) : (
        <ul className="grid grid-cols-5 gap-2">
          {results.map((f) => {
            const result = getMatchResult(f, LFC_TEAM_ID) as Exclude<MatchResult, "NS">;
            const isHome = f.teams.home.id === LFC_TEAM_ID;
            const opponent = isHome ? f.teams.away : f.teams.home;
            const score = `${f.goals.home ?? 0}–${f.goals.away ?? 0}`;
            const content = (
              <>
                <span className={cn("flex h-6 w-6 items-center justify-center font-bebas text-base leading-none", RESULT_STYLE[result])}>
                  {result}
                </span>
                <span className="relative size-7">
                  <Image src={opponent.logo} alt="" fill sizes="28px" className="object-contain" />
                </span>
                <span className="font-bebas text-xl leading-none text-white tabular-nums">{score}</span>
              </>
            );
            const cls =
              "surface-interactive flex min-h-[5.5rem] flex-col items-center justify-center gap-2 px-1 py-2";
            const aria = `${label[result]} ${isHome ? "vs" : "@"} ${opponent.name} ${score}`;
            return (
              <li key={f.fixture.id} className="min-w-0">
                {f.fixture.id > 0 ? (
                  <Link href={`/fixtures/${f.fixture.id}`} aria-label={aria} className={cls}>
                    {content}
                  </Link>
                ) : (
                  <div aria-label={aria} role="img" className={cls}>
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
