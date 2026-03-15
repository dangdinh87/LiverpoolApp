"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Standing } from "@/lib/types/football";
import { cn } from "@/lib/utils";
import { OverviewCardHeader } from "./overview-card-shared";

const LFC_TEAM_ID = 40;

interface StandingsPreviewProps {
  standings: Standing[];
}

function StandingRow({
  s,
  isHighlight,
}: {
  s: Standing;
  isHighlight: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-2 border-l-2 transition-colors",
        isHighlight ? "bg-lfc-red/15 border-l-lfc-red" : "border-l-transparent hover:bg-stadium-surface2/80"
      )}
    >
      <span
        className={cn(
          "font-bebas text-base w-5 text-center shrink-0",
          isHighlight ? "text-lfc-red" : "text-stadium-muted"
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
          isHighlight ? "text-white font-semibold" : "text-white/90"
        )}
      >
        {s.team.name}
      </span>
      <span
        className={cn(
          "font-bebas text-base tabular-nums shrink-0",
          isHighlight ? "text-lfc-red" : "text-white"
        )}
      >
        {s.points}
      </span>
    </div>
  );
}

export function StandingsPreview({ standings }: StandingsPreviewProps) {
  const t = useTranslations("Bento");
  const top5 = standings.slice(0, 5);
  const lfcStanding = standings.find((s) => s.team.id === LFC_TEAM_ID) ?? null;
  const lfcInTop5 = top5.some((s) => s.team.id === LFC_TEAM_ID);

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <OverviewCardHeader
        title={t("premierLeague")}
        action={
          <Link
            href="/standings"
            className="font-barlow text-[10px] text-lfc-red hover:underline uppercase tracking-wider font-semibold"
          >
            {t("fullTable")}
          </Link>
        }
      />

      <div className="flex-1 flex flex-col gap-0.5 min-h-0 overflow-hidden">
        {top5.map((s) => (
          <StandingRow key={s.team.id} s={s} isHighlight={s.team.id === LFC_TEAM_ID} />
        ))}

        {lfcStanding && !lfcInTop5 && (
          <div className="border-t border-stadium-border/60 my-2 pt-2">
            <p className="font-barlow text-[10px] text-lfc-red/90 uppercase tracking-wider font-semibold mb-1.5 px-2.5">
              {t("currentPosition")}
            </p>
            <StandingRow s={lfcStanding} isHighlight />
          </div>
        )}
      </div>
    </div>
  );
}
