import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { WDLRecord } from "@/lib/football/season-stats";

interface Props {
  home: WDLRecord;
  away: WDLRecord;
  labels: {
    home: string;
    away: string;
    played: string;
    wins: string;
    draws: string;
    losses: string;
    gf: string;
    ga: string;
    /** One-letter column heads, in the viewer's language. */
    short: { played: string; w: string; d: string; l: string; gf: string; ga: string };
  };
}

/**
 * Home and away records as a two-row table. The chart it replaced put match
 * counts (wins, draws, losses) and goal totals on one axis, so a 3-0 start
 * dwarfed the draws; the two kinds of number sit in their own columns here.
 */
export function HomeAwayTable({ home, away, labels }: Props) {
  const rows = [
    { name: labels.home, r: home },
    { name: labels.away, r: away },
  ];
  const cols = [
    { short: labels.short.played, long: labels.played },
    { short: labels.short.w, long: labels.wins },
    { short: labels.short.d, long: labels.draws },
    { short: labels.short.l, long: labels.losses },
    { short: labels.short.gf, long: labels.gf },
    { short: labels.short.ga, long: labels.ga },
  ];
  const head = "h-9 px-2 text-right font-barlow text-xs font-semibold uppercase tracking-wider text-stadium-muted";

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-[var(--line)] hover:bg-transparent">
          <TableHead className={`${head} text-left`}>
            <span className="sr-only">{labels.home} / {labels.away}</span>
          </TableHead>
          {cols.map((c) => (
            <TableHead key={c.long} className={head} title={c.long}>
              <span aria-hidden>{c.short}</span>
              <span className="sr-only">{c.long}</span>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ name, r }) => {
          const cells = [r.w + r.d + r.l, r.w, r.d, r.l, r.gf, r.ga];
          return (
            <TableRow key={name} className="h-14 border-[var(--line)] hover:bg-white/[0.03]">
              <TableCell className="px-2 text-sm font-semibold text-white">{name}</TableCell>
              {cells.map((v, i) => (
                <TableCell key={i} className="px-2 text-right font-bebas text-2xl leading-none tabular-nums text-white">
                  {v}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
