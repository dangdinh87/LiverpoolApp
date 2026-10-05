import Image from "next/image";
import type { CompetitionStats } from "@/lib/football/season-stats";
import { Trophy } from "lucide-react";

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
}


export function CompetitionBreakdown({ competitions, labels }: Props) {
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
              <span className="font-inter text-xs sm:text-sm font-semibold text-white truncate">{comp.name}</span>
            </div>

            {/* W/D/L */}
            <div className="flex gap-2 text-xs font-bebas tracking-wider mb-2">
              <span className="text-green-400">{comp.wins}W</span>
              <span className="text-amber-400">{comp.draws}D</span>
              <span className="text-red-400">{comp.losses}L</span>
            </div>

            {/* Win rate bar */}
            <div className="h-1.5 bg-stadium-surface2 rounded-full overflow-hidden flex mb-2">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${winRate}%` }} />
              <div className="h-full bg-amber-500 transition-all" style={{ width: `${drawRate}%` }} />
            </div>

            {/* Goals */}
            <div className="font-inter text-xs text-stadium-muted">
              {comp.goalsFor} {labels.gf} · {comp.goalsAgainst} {labels.ga}
            </div>
          </div>
        );
      })}
    </div>
  );
}
