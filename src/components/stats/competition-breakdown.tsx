import Image from "next/image";
import type { CompetitionStats } from "@/lib/football/season-stats";
import { Trophy } from "lucide-react";
import { useLocale } from "next-intl";
import { competitionLabel } from "@/lib/competition-labels";

// Competition logos already exist locally
const COMP_LOGOS: Record<string, string> = {
  "Premier League": "/assets/lfc/premier-league-white.svg",
  "UEFA Champions League": "/assets/lfc/champions-league.png",
  "FA Cup": "/assets/lfc/fa-cup.png",
  "Carabao Cup": "/assets/lfc/carabao-cup.png",
};

interface Props {
  competitions: CompetitionStats[];
  labels: { winRate: string; gf: string; ga: string };
  /** Single-letter W/D/L markers in the viewer's language. */
  letters: Record<"W" | "D" | "L", string>;
}


export function CompetitionBreakdown({ competitions, labels, letters }: Props) {
  const locale = useLocale();
  if (competitions.length === 0) return null;

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-3"
    >
      {competitions.map((comp) => {
        const winRate = comp.played > 0 ? Math.round((comp.wins / comp.played) * 100) : 0;
        const drawRate = comp.played > 0 ? Math.round((comp.draws / comp.played) * 100) : 0;
        const logo = COMP_LOGOS[comp.name];

        return (
          <div
            key={comp.name}
            className="surface p-4"
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              {logo ? (
                <span className="relative size-5 shrink-0"><Image src={logo} alt="" fill sizes="20px" className="object-contain" /></span>
              ) : (
                <Trophy size={16} className="text-stadium-muted" aria-hidden />
              )}
              <span className="font-inter text-xs sm:text-sm font-semibold text-white truncate">{competitionLabel(comp.name, locale)}</span>
            </div>

            {/* W/D/L */}
            <div className="mb-2 flex gap-2 font-bebas text-sm tracking-wider">
              <span className="text-green-400">{comp.wins}{letters.W}</span>
              <span className="text-amber-400">{comp.draws}{letters.D}</span>
              <span className="text-red-400">{comp.losses}{letters.L}</span>
            </div>

            {/* Win rate bar */}
            <div className="h-1.5 bg-stadium-surface2 rounded-full overflow-hidden flex mb-2">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${winRate}%` }} />
              <div className="h-full bg-amber-500 transition-all" style={{ width: `${drawRate}%` }} />
            </div>

            {/* Goals */}
            <div className="font-inter text-[13px] text-stadium-muted">
              {comp.goalsFor} {labels.gf} · {comp.goalsAgainst} {labels.ga}
            </div>
          </div>
        );
      })}
    </div>
  );
}
