"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Standing } from "@/lib/types/football";
import { cn } from "@/lib/utils";

interface StandingsPreviewProps {
  standings: Standing[];
}

export function StandingsPreview({ standings }: StandingsPreviewProps) {
  const t = useTranslations("Bento");
  const top5 = standings.slice(0, 5);

  return (
    <div className="flex flex-col h-full p-5 gap-3">
      <div className="flex items-center justify-between">
        <span className="font-barlow text-stadium-muted text-xs uppercase tracking-widest font-semibold">
          {t("premierLeague")}
        </span>
        <Link
          href="/standings"
          className="font-barlow text-[10px] text-lfc-red hover:underline uppercase tracking-wider font-semibold"
        >
          {t("fullTable")}
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-between gap-0.5">
        {top5.map((s) => {
          const isLiverpool = s.team.id === 40;
          return (
            <div
              key={s.team.id}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors",
                isLiverpool ? "bg-lfc-red/10 border border-lfc-red/20" : "hover:bg-stadium-surface2"
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
              <div className="relative w-5 h-5 shrink-0">
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
                  "font-bebas text-base tabular-nums",
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
