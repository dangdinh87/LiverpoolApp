import Image from "next/image";
import Link from "next/link";
import type { Standing } from "@/lib/types/football";
import { cn } from "@/lib/utils";

interface StandingsPreviewProps {
  standings: Standing[];
}

export function StandingsPreview({ standings }: StandingsPreviewProps) {
  const top5 = standings.slice(0, 5);

  return (
    <div className="flex flex-col h-full p-5 gap-3">
      <div className="flex items-center justify-between">
        <span className="font-barlow text-stadium-muted text-xs uppercase tracking-widest font-semibold">
          Premier League
        </span>
        <Link
          href="/standings"
          className="font-barlow text-xs text-lfc-red hover:underline uppercase tracking-wider font-semibold"
        >
          Full Table
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-between gap-1">
        {top5.map((s) => {
          const isLiverpool = s.team.id === 40;
          return (
            <div
              key={s.team.id}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors",
                isLiverpool ? "bg-lfc-red/10" : "hover:bg-stadium-surface2"
              )}
            >
              <span
                className={cn(
                  "font-bebas text-base w-5 text-center",
                  isLiverpool ? "text-lfc-red" : "text-stadium-muted"
                )}
              >
                {s.rank}
              </span>
              <div className="relative w-5 h-5 flex-shrink-0">
                <Image
                  src={s.team.logo}
                  alt={s.team.name}
                  fill
                  sizes="20px"
                  className="object-contain"
                />
              </div>
              <span
                className={cn(
                  "font-inter text-xs flex-1 truncate",
                  isLiverpool ? "text-white font-semibold" : "text-stadium-muted"
                )}
              >
                {s.team.name}
              </span>
              <span
                className={cn(
                  "font-bebas text-base",
                  isLiverpool ? "text-lfc-red" : "text-white"
                )}
              >
                {s.points}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
