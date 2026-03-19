"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { FixtureLineup } from "@/lib/types/football";

interface FormationPitchProps {
  homeLineup: FixtureLineup;
  awayLineup: FixtureLineup;
}

const LFC_ID = 40;

/**
 * Parse grid string "row:col" → { row, col }.
 * Grid is 1-indexed: row 1 = GK, higher rows = forward.
 * Col starts from 1 (left) to max (right).
 */
function parseGrid(grid: string | null): { row: number; col: number } | null {
  if (!grid) return null;
  const [r, c] = grid.split(":").map(Number);
  if (isNaN(r) || isNaN(c)) return null;
  return { row: r, col: c };
}

function PlayerDot({
  name,
  number,
  pos,
  isLfc,
}: {
  name: string;
  number: number;
  pos: string;
  isLfc: boolean;
}) {
  // Shorten name: "Mohamed Salah" → "M. Salah"
  const parts = name.split(" ");
  const short = parts.length > 1
    ? `${parts[0][0]}. ${parts.slice(1).join(" ")}`
    : name;

  return (
    <div className="flex flex-col items-center gap-0.5 w-14 sm:w-16">
      <div
        className={cn(
          "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bebas text-sm sm:text-base leading-none shadow-lg",
          isLfc
            ? "bg-lfc-red text-white"
            : "bg-sky-600 text-white",
          pos === "G" && "bg-lfc-gold text-black"
        )}
      >
        {number}
      </div>
      <span className="font-inter text-[9px] sm:text-[10px] text-white text-center leading-tight line-clamp-1 max-w-full">
        {short}
      </span>
    </div>
  );
}

function HalfPitch({
  lineup,
  isHome,
}: {
  lineup: FixtureLineup;
  isHome: boolean;
}) {
  const isLfc = lineup.team.id === LFC_ID;
  const players = lineup.startXI;

  // Group players by row
  const rows = new Map<number, typeof players>();
  let hasGrid = false;

  for (const p of players) {
    const g = parseGrid(p.player.grid);
    if (g) {
      hasGrid = true;
      const existing = rows.get(g.row) ?? [];
      existing.push(p);
      rows.set(g.row, existing);
    }
  }

  // Fallback: group by position if no grid data
  if (!hasGrid) {
    const posOrder = { G: 1, D: 2, M: 3, F: 4 } as const;
    for (const p of players) {
      const row = posOrder[p.player.pos as keyof typeof posOrder] ?? 3;
      const existing = rows.get(row) ?? [];
      existing.push(p);
      rows.set(row, existing);
    }
  }

  // Sort rows: home = GK at bottom (ascending), away = GK at top (descending)
  const sortedRows = [...rows.entries()].sort((a, b) =>
    isHome ? a[0] - b[0] : b[0] - a[0]
  );

  // Sort players within each row by column
  for (const [, rowPlayers] of sortedRows) {
    rowPlayers.sort((a, b) => {
      const ga = parseGrid(a.player.grid);
      const gb = parseGrid(b.player.grid);
      return (ga?.col ?? 0) - (gb?.col ?? 0);
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4 py-3 sm:py-4">
      {/* Team name + formation + coach */}
      <div className={cn("flex items-center gap-2 px-3 flex-wrap", isHome ? "justify-start" : "justify-end")}>
        {(isLfc || lineup.team.logo) && (
          <div className="relative w-4 h-4 shrink-0">
            <Image
              src={isLfc ? "/assets/lfc/crest.webp" : lineup.team.logo}
              alt=""
              fill
              sizes="16px"
              className="object-contain"
            />
          </div>
        )}
        <span className="font-barlow text-xs text-white font-semibold uppercase tracking-wider">
          {lineup.team.name}
        </span>
        <span className="font-bebas text-sm text-lfc-gold tracking-wider">{lineup.formation}</span>
        {lineup.coach.name && (
          <>
            <span className="text-white/20 text-xs">·</span>
            <span className="font-inter text-[10px] text-white/50">{lineup.coach.name}</span>
          </>
        )}
      </div>

      {/* Rows of players */}
      {sortedRows.map(([rowIdx, rowPlayers]) => (
        <div
          key={rowIdx}
          className="flex items-center justify-center gap-1 sm:gap-2"
        >
          {rowPlayers.map((p) => (
            <PlayerDot
              key={p.player.id}
              name={p.player.name}
              number={p.player.number}
              pos={p.player.pos}
              isLfc={isLfc}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function FormationPitch({ homeLineup, awayLineup }: FormationPitchProps) {
  return (
    <div className="relative bg-[#1a4d2e] border border-[#2a6e40] overflow-hidden">
      {/* Pitch markings */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Center line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/15" />
        {/* Center circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-32 sm:h-32 rounded-full border border-white/15" />
        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/20" />
        {/* Top penalty box */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 sm:w-44 h-14 sm:h-16 border-b border-l border-r border-white/15" />
        {/* Bottom penalty box */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-36 sm:w-44 h-14 sm:h-16 border-t border-l border-r border-white/15" />
      </div>

      {/* Home team (top half — GK at top) */}
      <HalfPitch lineup={homeLineup} isHome />

      {/* Divider */}
      <div className="h-px" />

      {/* Away team (bottom half — GK at bottom) */}
      <HalfPitch lineup={awayLineup} isHome={false} />
    </div>
  );
}
