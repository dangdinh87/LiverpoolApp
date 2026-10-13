import { TeamCrest } from "@/components/ui/team-crest";
import { FormBadge, parseForm } from "@/components/ui/form-badge";
import { TableProperties } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Standing } from "@/lib/types/football";
import { cn } from "@/lib/utils";
import { competitionName } from "@/lib/competition-labels";
import { EmptyState } from "@/components/ui/empty-state";
import { compactTeamName, displayTeamName } from "@/components/fixtures/team-name";

const LFC_ID = 40;

type ZoneKey = "cl" | "el" | "ecl" | "rel" | "r16" | "playoff" | "elim";
/** top = the places everyone wants, mid = a consolation, bottom = the drop. */
type Tier = "top" | "mid" | "bottom";
type Zone = { key: ZoneKey; from: number; to: number; tier: Tier };

// Zones are drawn as rules between rows (and named in the legend), not as coloured
// stripes: blue, orange and green sat outside the palette, and red meant both
// "Liverpool" and "relegation". Red now marks Liverpool alone.
const ZONES: Record<"pl" | "ucl", Zone[]> = {
  pl: [
    { key: "cl", from: 1, to: 4, tier: "top" },
    { key: "el", from: 5, to: 5, tier: "mid" },
    { key: "ecl", from: 6, to: 6, tier: "mid" },
    { key: "rel", from: 18, to: 20, tier: "bottom" },
  ],
  ucl: [
    { key: "r16", from: 1, to: 8, tier: "top" },
    { key: "playoff", from: 9, to: 24, tier: "mid" },
    { key: "elim", from: 25, to: 36, tier: "bottom" },
  ],
};

/** The rule under a boundary row: gold under the top places, dashed between consolations, solid above the drop. */
const RULE: Record<Tier, string> = {
  top: "border-b-2 border-lfc-gold/70",
  mid: "border-b border-dashed border-white/30",
  bottom: "border-b-2 border-white/50",
};

/** Same line, as a short sample for the legend. */
const SAMPLE: Record<Tier, string> = {
  top: "border-t-2 border-lfc-gold/70",
  mid: "border-t border-dashed border-white/40",
  bottom: "border-t-2 border-white/50",
};

const zoneOf = (rank: number, competition: "pl" | "ucl") =>
  ZONES[competition].find((z) => rank >= z.from && rank <= z.to) ?? null;

/** Tier of the rule drawn under `rank`, if it is a boundary row. */
function ruleAfter(rank: number, competition: "pl" | "ucl"): Tier | null {
  // The drop's rule sits above its first row, so the row before it carries it.
  const tiers = ZONES[competition]
    .filter((z) => rank === (z.tier === "bottom" ? z.from - 1 : z.to))
    .map((z) => z.tier);
  // Rank 24 of the league phase ends the play-off places and starts the drop: the drop wins.
  return tiers.includes("bottom") ? "bottom" : (tiers[0] ?? null);
}

// Opaque row backgrounds: the sticky columns must hide what scrolls beneath them.
const ROW_BG = "bg-[var(--surface-2)]";
const ROW_BG_LFC = "bg-[color-mix(in_oklab,var(--surface-2)_86%,var(--color-lfc-red))]";

interface StandingsTableProps {
  standings: Standing[];
  competition?: "pl" | "ucl";
  /** Liverpool's next opponent: its row gets a "Next" tag. */
  nextOpponentId?: number;
}

export function StandingsTable({ standings, competition = "pl", nextOpponentId }: StandingsTableProps) {
  const t = useTranslations("Standings");
  const locale = useLocale();

  if (standings.length === 0) {
    return (
      <EmptyState
        tone="error"
        icon={<TableProperties className="size-9" aria-hidden />}
        title={t("outage.title")}
        description={t("outage.description")}
        actionHref="/news"
        actionLabel={t("outage.action")}
      />
    );
  }

  // Columns beyond P / GD / Pts only appear from `sm`.
  const wide = "hidden sm:table-cell";
  const th = "px-1 py-2.5 text-center font-barlow sm:px-1.5 text-xs font-semibold uppercase tracking-wider text-stadium-muted";
  const td = "px-1 py-2 text-center text-sm tabular-nums sm:px-1.5 text-stadium-muted";

  return (
    <div className="surface overflow-hidden">
      <div className="scroll-x">
        <table className="w-full text-sm sm:min-w-[620px]">
          <caption className="sr-only">{competitionName(competition, locale)}</caption>
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-1)]">
              <th scope="col" className={cn(th, "sticky left-0 z-10 w-9 bg-[var(--surface-1)] sm:w-10")}>{t("rank")}</th>
              <th scope="col" className={cn(th, "sticky left-9 z-10 bg-[var(--surface-1)] pl-1.5 text-left sm:left-10 sm:pl-2")}>{t("club")}</th>
              <th scope="col" className={cn(th, "w-8 sm:w-9")}>{t("played")}</th>
              <th scope="col" className={cn(th, wide, "w-9")}>{t("win")}</th>
              <th scope="col" className={cn(th, wide, "w-9")}>{t("draw")}</th>
              <th scope="col" className={cn(th, wide, "w-9")}>{t("lose")}</th>
              <th scope="col" className={cn(th, wide, "w-10")}>{t("gf")}</th>
              <th scope="col" className={cn(th, wide, "w-10")}>{t("ga")}</th>
              <th scope="col" className={cn(th, "w-10 sm:w-11")}>{t("gd")}</th>
              <th scope="col" className={cn(th, "w-10 text-white sm:w-11")}>{t("pts")}</th>
              <th scope="col" className={cn(th, "w-[5.25rem] sm:w-28")}>{t("form")}</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s) => {
              const isLfc = s.team.id === LFC_ID;
              const zone = zoneOf(s.rank, competition);
              const rule = ruleAfter(s.rank, competition);
              const rowBg = isLfc ? ROW_BG_LFC : ROW_BG;
              const gd = s.goalsDiff > 0 ? `+${s.goalsDiff}` : String(s.goalsDiff);
              return (
                <tr key={s.team.id} className={cn("border-b border-[var(--line)] last:border-0", rule && RULE[rule], rowBg)} aria-current={isLfc ? "true" : undefined}>
                  <td className={cn("sticky left-0 z-10 w-9 px-1 py-2 text-center sm:w-10", rowBg)}>
                    {/* Red is Liverpool's alone: a bar on the row, not another coloured number. */}
                    {isLfc && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-lfc-red" />}
                    <span className={cn("font-bebas text-lg leading-none", isLfc ? "text-white" : "text-stadium-muted")}>{s.rank}</span>
                    {zone && <span className="sr-only"> ({t(`zones.${zone.key}`)})</span>}
                  </td>
                  <td className={cn("sticky left-9 z-10 max-w-0 pl-1.5 pr-1 sm:left-10 sm:pl-2 py-2", rowBg)}>
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="relative size-5 sm:size-6 shrink-0">
                        <TeamCrest src={isLfc ? "/assets/lfc/crest.webp" : s.team.logo} name={s.team.name} sizes="24px" />
                      </span>
                      <span className={cn("min-w-0 truncate", isLfc ? "font-bold text-white" : "text-white/85")} title={s.team.name}>
                        {/* Compact name on phones ("Man City" instead of "Manchester …"), full name from sm */}
                        <span className="sm:hidden">{compactTeamName(s.team)}</span>
                        <span className="hidden sm:inline">{displayTeamName(s.team.name)}</span>
                      </span>
                      {s.team.id === nextOpponentId && (
                        <>
                          {/* Phones: a dot, so the club name keeps its room. */}
                          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-lfc-gold sm:hidden" />
                          <span className="sr-only sm:not-sr-only sm:shrink-0 sm:border sm:border-lfc-gold/50 sm:px-1.5 sm:py-px sm:font-barlow sm:text-[11px] sm:font-bold sm:uppercase sm:tracking-wider sm:text-lfc-gold">
                            {t("nextBadge")}
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className={td}>{s.all.played}</td>
                  <td className={cn(td, wide)}>{s.all.win}</td>
                  <td className={cn(td, wide)}>{s.all.draw}</td>
                  <td className={cn(td, wide)}>{s.all.lose}</td>
                  <td className={cn(td, wide)}>{s.all.goals.for}</td>
                  <td className={cn(td, wide)}>{s.all.goals.against}</td>
                  <td className={cn(td, "font-semibold", s.goalsDiff > 0 && "text-white/85")}>{gd}</td>
                  <td className="px-1 py-2 text-center sm:px-1.5">
                    <span className="font-bebas text-xl leading-none tabular-nums text-white">{s.points}</span>
                  </td>
                  <td className="px-1 py-2 sm:px-1.5">
                    <div className="flex justify-center">
                      <FormBadge results={parseForm(s.form)} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--line)] px-4 py-3">
        {ZONES[competition].map(({ key, from, to, tier }) => (
          <li key={key} className="flex items-center gap-2 text-xs text-stadium-muted">
            <span aria-hidden className={cn("w-5", SAMPLE[tier])} />
            <span className="tabular-nums text-white/80">{from === to ? from : `${from}–${to}`}</span>
            {t(`zones.${key}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}
