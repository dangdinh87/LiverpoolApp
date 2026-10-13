import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FplPlayerStats } from "@/lib/football/fpl-stats";

/**
 * Every Liverpool player who has scored this Premier League season, from the
 * squad's own FPL numbers. The old list was the league's top-scorer table
 * filtered to Liverpool, so a squad with 12 goals showed one name: the league
 * list stops at its top fifty and never reaches the one-goal players.
 */
export function SquadScorersTable({ players }: { players: FplPlayerStats[] }) {
  const t = useTranslations("Stats.table");
  const scorers = players
    .filter((p) => p.goalsScored > 0)
    .sort((a, b) => b.goalsScored - a.goalsScored || b.assists - a.assists || a.minutes - b.minutes);
  if (scorers.length === 0) return null;

  const head = "h-9 px-3 text-right font-barlow text-xs font-semibold uppercase tracking-wider text-stadium-muted sm:px-4";
  const num = "px-3 text-right font-bebas text-xl leading-none tabular-nums sm:px-4";

  return (
    <div className="surface mt-4 overflow-hidden sm:mt-6">
      <h2 className="border-b border-[var(--line)] px-4 py-3 font-bebas text-2xl text-white sm:px-6">{t("title")}</h2>
      <Table>
        <TableHeader>
          <TableRow className="border-[var(--line)] hover:bg-transparent">
            <TableHead className={`${head} text-left`}>{t("player")}</TableHead>
            <TableHead className={head}>{t("goalsShort")}</TableHead>
            <TableHead className={head}>{t("assistsShort")}</TableHead>
            <TableHead className={head}>{t("minutesShort")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scorers.map((p) => (
            <TableRow key={p.fplId} className="h-12 border-[var(--line)] hover:bg-white/[0.03]">
              <TableCell className="max-w-0 truncate px-3 text-sm font-medium text-white sm:px-4">{p.webName}</TableCell>
              <TableCell className={`${num} text-brand`}>{p.goalsScored}</TableCell>
              <TableCell className={`${num} text-white`}>{p.assists}</TableCell>
              <TableCell className={`${num} text-stadium-muted`}>{p.minutes}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
