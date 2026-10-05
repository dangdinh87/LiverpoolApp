import Image from "next/image";
import { ArrowDownToLine, ArrowUpFromLine, Goal } from "lucide-react";
import type { FixtureEvent, FixtureLineup, FixtureTeamStats } from "@/lib/types/football";
import { cn } from "@/lib/utils";

export const LFC_ID = 40;

export function teamLogo(id: number, apiLogo: string): string {
  return id === LFC_ID ? "/assets/lfc/crest.webp" : apiLogo;
}

const minuteLabel = (e: { time: { elapsed: number | null; extra?: number | null } }) =>
  e.time.elapsed ? (e.time.extra ? `${e.time.elapsed}+${e.time.extra}'` : `${e.time.elapsed}'`) : null;

// ─── Header pieces ──────────────────────────────────────────────────────────

/** Scorer list under a team in the score header. */
export function ScorerList({ goals, align }: { goals: FixtureEvent[]; align: "home" | "away" }) {
  if (goals.length === 0) return null;
  return (
    <ul className={cn("mt-2 space-y-0.5 text-xs text-stadium-muted", align === "home" ? "sm:text-right" : "sm:text-left")}>
      {goals.map((g, i) => (
        <li key={i} className="break-words">
          <span className="text-white/90">{g.player.name}</span>
          {minuteLabel(g) && <span className="ml-1 text-lfc-gold tabular-nums">{minuteLabel(g)}</span>}
          {g.detail.includes("Penalty") && <span className="ml-1">(P)</span>}
          {g.detail.includes("Own") && <span className="ml-1 text-red-400">(OG)</span>}
        </li>
      ))}
    </ul>
  );
}

// ─── Timeline ───────────────────────────────────────────────────────────────

export function TimelineRow({ event, homeTeamId }: { event: FixtureEvent; homeTeamId: number }) {
  const isHome = event.team.id === homeTeamId;
  const minute = event.time.elapsed && event.time.elapsed > 0 ? minuteLabel(event) : null;

  return (
    <li
      className={cn(
        "flex items-center gap-2 border-b border-[var(--line)] py-2.5 last:border-0",
        isHome ? "flex-row" : "flex-row-reverse",
      )}
    >
      <div className={cn("flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5", isHome ? "justify-start" : "justify-end text-right")}>
        <span className="text-sm font-medium text-white">{event.player.name}</span>
        {event.assist.name && event.type === "Goal" && (
          <span className="text-xs text-stadium-muted">({event.assist.name})</span>
        )}
        {event.type === "subst" && event.assist.name && (
          <span className="text-xs text-stadium-muted">← {event.assist.name}</span>
        )}
      </div>
      <div className="flex w-16 shrink-0 items-center justify-center gap-1.5">
        <EventIcon type={event.type} detail={event.detail} />
        {minute && <span className="font-barlow text-xs font-semibold text-stadium-muted tabular-nums">{minute}</span>}
      </div>
      <div className="flex-1" />
    </li>
  );
}

function EventIcon({ type, detail }: { type: string; detail: string }) {
  if (type === "Goal") {
    const isOwn = detail.includes("Own");
    const isPen = detail.includes("Penalty");
    return (
      <span className={cn("inline-flex items-center gap-1", isOwn ? "text-red-400" : "text-white")}>
        <Goal size={14} strokeWidth={2.25} aria-hidden />
        {(isPen || isOwn) && (
          <span className="font-barlow text-xs font-bold uppercase tracking-wider">{isPen ? "PEN" : "OG"}</span>
        )}
      </span>
    );
  }
  if (type === "Card") {
    return <span aria-hidden className={cn("inline-block h-4 w-3 rounded-[1px]", detail.includes("Red") ? "bg-red-500" : "bg-yellow-400")} />;
  }
  if (type === "subst") {
    return (
      <span aria-hidden className="flex items-center -space-x-0.5">
        <ArrowUpFromLine size={12} className="text-green-400" />
        <ArrowDownToLine size={12} className="text-red-400" />
      </span>
    );
  }
  return <span aria-hidden className="text-xs text-stadium-muted">•</span>;
}

// ─── Stats (centre-out bars) ────────────────────────────────────────────────

export function StatsComparison({
  home,
  away,
  statLabels,
  homeIsLfc,
}: {
  home: FixtureTeamStats;
  away: FixtureTeamStats;
  statLabels: Record<string, string>;
  homeIsLfc: boolean;
}) {
  const lfcBar = "bg-lfc-red";
  const otherBar = "bg-stadium-muted";
  return (
    <div className="space-y-4">
      {home.statistics.map(({ type }) => {
        const homeVal = home.statistics.find((s) => s.type === type)?.value;
        const awayVal = away.statistics.find((s) => s.type === type)?.value;
        if (homeVal == null && awayVal == null) return null;

        const hStr = String(homeVal ?? 0);
        const aStr = String(awayVal ?? 0);
        const hNum = parseFloat(hStr.replace("%", "")) || 0;
        const aNum = parseFloat(aStr.replace("%", "")) || 0;
        const total = hNum + aNum || 1;
        const hPct = Math.round((hNum / total) * 100);

        return (
          <div key={type}>
            <p className="mb-1.5 text-center text-xs text-stadium-muted">{statLabels[type] ?? type}</p>
            <div className="flex items-center gap-3">
              <span className={cn("w-12 text-right text-sm font-semibold tabular-nums", hNum >= aNum ? "text-white" : "text-stadium-muted")}>{hStr}</span>
              <div className="flex h-2 flex-1 gap-0.5" aria-hidden>
                <div className="flex flex-1 justify-end bg-[var(--surface-3)]">
                  <div className={cn("h-full", homeIsLfc ? lfcBar : otherBar)} style={{ width: `${hPct}%` }} />
                </div>
                <div className="flex-1 bg-[var(--surface-3)]">
                  <div className={cn("h-full", homeIsLfc ? otherBar : lfcBar)} style={{ width: `${100 - hPct}%` }} />
                </div>
              </div>
              <span className={cn("w-12 text-left text-sm font-semibold tabular-nums", aNum >= hNum ? "text-white" : "text-stadium-muted")}>{aStr}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Lineups ────────────────────────────────────────────────────────────────

const POS_LABEL: Record<string, string> = { G: "GK", D: "DEF", M: "MID", F: "FWD" };

export function LineupSection({
  lineup,
  subsLabel,
  coachLabel,
}: {
  lineup: FixtureLineup;
  subsLabel: string;
  coachLabel: string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2.5 border-b border-[var(--line)] pb-2">
        <div className="relative size-6 shrink-0">
          <Image src={teamLogo(lineup.team.id, lineup.team.logo)} alt="" fill sizes="24px" className="object-contain" />
        </div>
        <span className="text-sm font-bold text-white">{lineup.team.name}</span>
        <span className="ml-auto font-bebas text-lg tracking-wider text-lfc-gold">{lineup.formation}</span>
      </div>

      <ul className="mb-4 space-y-0.5">
        {lineup.startXI.map(({ player: p }) => (
          <li key={p.id} className="flex min-h-10 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center border border-[var(--line)] bg-[var(--surface-3)] font-bebas text-base text-white">
              {p.number}
            </span>
            <span className="min-w-0 truncate text-sm font-medium text-white">{p.name}</span>
            <span className="ml-auto shrink-0 font-barlow text-xs font-semibold uppercase tracking-wider text-stadium-muted">
              {POS_LABEL[p.pos] ?? p.pos}
            </span>
          </li>
        ))}
      </ul>

      {lineup.substitutes.length > 0 && (
        <div className="border-t border-[var(--line)] pt-3">
          <p className="mb-2 font-barlow text-xs font-semibold uppercase tracking-wider text-stadium-muted">{subsLabel}</p>
          <ul className="space-y-0.5">
            {lineup.substitutes.map(({ player: p }) => (
              <li key={p.id} className="flex min-h-9 items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center border border-[var(--line)] font-bebas text-sm text-stadium-muted">
                  {p.number}
                </span>
                <span className="truncate text-sm text-stadium-muted">{p.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {lineup.coach.name && (
        <div className="mt-3 flex items-center gap-2.5 border-t border-[var(--line)] pt-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-3)]">
            <span className="font-bebas text-sm text-stadium-muted">
              {lineup.coach.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </span>
          </div>
          <div>
            <p className="font-barlow text-xs uppercase tracking-wider text-stadium-muted">{coachLabel}</p>
            <p className="text-sm font-medium text-white">{lineup.coach.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
