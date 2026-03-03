import Image from "next/image";
import type { Fixture } from "@/lib/types/football";

interface NextMatchWidgetProps {
  fixture: Fixture | null;
}

export function NextMatchWidget({ fixture }: NextMatchWidgetProps) {
  if (!fixture) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 py-6">
        <p className="text-stadium-muted font-inter text-sm">No upcoming match</p>
      </div>
    );
  }

  const { teams, league, fixture: f } = fixture;
  const date = new Date(f.date);
  const isLive =
    f.status.short === "1H" ||
    f.status.short === "HT" ||
    f.status.short === "2H" ||
    f.status.short === "ET";

  return (
    <div className="flex flex-col gap-4 p-5 h-full">
      <div className="flex items-center justify-between">
        <span className="font-barlow text-stadium-muted text-xs uppercase tracking-widest font-semibold">
          Next Match
        </span>
        {isLive && (
          <span className="flex items-center gap-1.5 text-xs font-barlow font-semibold text-green-400 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 flex-1">
        {/* Home team */}
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="relative w-12 h-12">
            <Image
              src={teams.home.logo}
              alt={teams.home.name}
              fill
              sizes="48px"
              className="object-contain"
            />
          </div>
          <span className="font-inter text-xs text-white text-center font-semibold leading-tight">
            {teams.home.name}
          </span>
        </div>

        {/* VS / Time */}
        <div className="flex flex-col items-center gap-1 px-2">
          <span className="font-bebas text-3xl text-stadium-muted">VS</span>
          <span className="font-barlow text-xs text-lfc-red font-semibold">
            {date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </span>
          <span className="font-inter text-xs text-stadium-muted">
            {date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* Away team */}
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="relative w-12 h-12">
            <Image
              src={teams.away.logo}
              alt={teams.away.name}
              fill
              sizes="48px"
              className="object-contain"
            />
          </div>
          <span className="font-inter text-xs text-white text-center font-semibold leading-tight">
            {teams.away.name}
          </span>
        </div>
      </div>

      <div className="border-t border-stadium-border pt-3 flex items-center gap-2">
        <div className="relative w-4 h-4 flex-shrink-0">
          <Image
            src={league.logo}
            alt={league.name}
            fill
            sizes="16px"
            className="object-contain"
          />
        </div>
        <span className="font-inter text-xs text-stadium-muted truncate">
          {league.name} · {league.round.replace("Regular Season - ", "GW ")}
        </span>
      </div>
    </div>
  );
}
