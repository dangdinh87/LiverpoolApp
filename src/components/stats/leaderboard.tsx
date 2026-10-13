import { useTranslations } from "next-intl";
import { TeamCrest } from "@/components/ui/team-crest";
import { compactTeamName } from "@/components/fixtures/team-name";
import type { TopScorer } from "@/lib/types/football";
import { cn } from "@/lib/utils";

const LFC_ID = 40;
/** Rows shown before Liverpool players further down are appended. */
const TOP = 5;

export interface LeaderEntry {
  id: number;
  surname: string;
  club: string;
  crest: string | null;
  value: number;
  isLiverpool: boolean;
}

export type Ranked = LeaderEntry & { rank: number; tied: boolean };

/** The league's list for one stat, best first, zero values dropped. */
export function buildLeaders(list: TopScorer[], type: "goals" | "assists"): LeaderEntry[] {
  return list
    .map((s) => {
      const stat = s.statistics[0];
      const isLiverpool = stat?.team?.id === LFC_ID;
      return {
        id: s.player.id,
        surname: s.player.lastname || s.player.name.split(" ").pop() || s.player.name,
        club: stat?.team ? compactTeamName({ name: stat.team.name }) : "",
        crest: isLiverpool ? "/assets/lfc/crest.webp" : (stat?.team?.logo ?? null),
        value: (type === "goals" ? stat?.goals?.total : stat?.goals?.assists) ?? 0,
        isLiverpool,
      };
    })
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value);
}

/** Competition ranking: players level on a value share the rank of the first of them ("=3"). */
export function rankEntries(entries: LeaderEntry[]): Ranked[] {
  return entries.map((e) => {
    const rank = entries.filter((o) => o.value > e.value).length + 1;
    return { ...e, rank, tied: entries.filter((o) => o.value === e.value).length > 1 };
  });
}

/**
 * A ranked list of the league's leaders: shared rank, crest, surname, club, a bar
 * and the figure. Liverpool players are highlighted, and any outside the top
 * five are appended below a break so the list still answers "where are ours?".
 *
 * It replaced a bar chart that labelled other clubs' players only "#1", "#3",
 * gave eight players level on three goals the ranks #3 to #10, and drew its bars
 * in a grey barely distinguishable from the card.
 */
export function Leaderboard({ entries, unit, label }: { entries: LeaderEntry[]; unit: string; label: string }) {
  const t = useTranslations("Stats.leaderboard");
  const ranked = rankEntries(entries);
  const top = ranked.slice(0, TOP);
  const rest = ranked.slice(TOP).filter((e) => e.isLiverpool);
  const max = Math.max(1, ...ranked.map((e) => e.value));

  const row = (e: Ranked) => (
    <li
      key={e.id}
      className={cn(
        "relative grid grid-cols-[2rem_1.25rem_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1.5 px-3 py-2.5 sm:px-4",
        e.isLiverpool && "bg-lfc-red/10",
      )}
    >
      {e.isLiverpool && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-lfc-red" />}
      <span className="font-bebas text-xl leading-none tabular-nums text-stadium-muted">
        <span aria-hidden>{e.tied ? `=${e.rank}` : e.rank}</span>
        <span className="sr-only">{t(e.tied ? "tiedRank" : "rank", { rank: e.rank })}</span>
      </span>
      <span className="relative size-5">
        <TeamCrest src={e.crest} name={e.club} sizes="20px" />
      </span>
      <span className="min-w-0 truncate text-sm">
        <span className={cn("font-semibold", e.isLiverpool ? "text-white" : "text-white/90")}>{e.surname}</span>
        {e.club && <span className="text-stadium-muted"> · {e.club}</span>}
      </span>
      <span className={cn("font-bebas text-2xl leading-none tabular-nums", e.isLiverpool ? "text-brand" : "text-white")}>
        {e.value}
        <span className="sr-only"> {unit}</span>
      </span>
      {/* Bar under the name, as wide as its share of the leader's figure. */}
      <span aria-hidden className="col-span-2 col-start-3 h-1.5 bg-white/10">
        <span
          className={cn("block h-full", e.isLiverpool ? "bg-lfc-red" : "bg-white/40")}
          style={{ width: `${(e.value / max) * 100}%` }}
        />
      </span>
    </li>
  );

  return (
    <ol aria-label={label} className="divide-y divide-[var(--line)]">
      {top.map(row)}
      {rest.length > 0 && (
        <li aria-hidden className="border-t border-dashed border-white/20 px-4 py-1 text-center text-xs leading-none text-stadium-muted">
          ···
        </li>
      )}
      {rest.map(row)}
    </ol>
  );
}
