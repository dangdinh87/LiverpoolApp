"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { FplPlayerRow, FplTeamOption, FplPosition } from "@/lib/fpl-data";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

// ─── Types ──────────────────────────────────────────────────────────────────────

type SortKey = keyof Pick<
  FplPlayerRow,
  "totalPoints" | "goals" | "assists" | "xG" | "xA" | "minutes" | "cleanSheets" | "form" | "price" | "yellowCards"
>;

type SortDir = "asc" | "desc";

interface Props {
  players: FplPlayerRow[];
  teams: FplTeamOption[];
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const POSITIONS: (FplPosition | "ALL")[] = ["ALL", "GK", "DEF", "MID", "FWD"];
const PAGE_SIZE = 50;

const COLUMNS: { key: SortKey; label: string; shortLabel: string }[] = [
  { key: "totalPoints", label: "Points", shortLabel: "Pts" },
  { key: "minutes", label: "Minutes", shortLabel: "Min" },
  { key: "goals", label: "Goals", shortLabel: "G" },
  { key: "assists", label: "Assists", shortLabel: "A" },
  { key: "xG", label: "xG", shortLabel: "xG" },
  { key: "xA", label: "xA", shortLabel: "xA" },
  { key: "cleanSheets", label: "Clean Sheets", shortLabel: "CS" },
  { key: "yellowCards", label: "Yellow Cards", shortLabel: "YC" },
  { key: "price", label: "Price", shortLabel: "£" },
];

// ─── Component ──────────────────────────────────────────────────────────────────

export function PlayersTable({ players, teams }: Props) {
  const t = useTranslations("Common.labels");
  const posT = useTranslations("Squad.positions");
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<FplPosition | "ALL">("ALL");
  const [teamFilter, setTeamFilter] = useState<number | "ALL">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("totalPoints");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let list = players;

    if (position !== "ALL") {
      list = list.filter((p) => p.position === position);
    }
    if (teamFilter !== "ALL") {
      list = list.filter((p) => p.teamId === teamFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.webName.toLowerCase().includes(q) ||
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q),
      );
    }

    list = [...list].sort((a, b) => {
      const av = sortKey === "form" ? parseFloat(a.form) || 0 : (a[sortKey] as number);
      const bv = sortKey === "form" ? parseFloat(b.form) || 0 : (b[sortKey] as number);
      return sortDir === "desc" ? bv - av : av - bv;
    });

    return list;
  }, [players, position, teamFilter, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
  }

  const COLUMNS_LOCAL: { key: SortKey; label: string; shortLabel: string }[] = [
    { key: "totalPoints", label: t("points"), shortLabel: t("points") },
    { key: "minutes", label: t("minutes"), shortLabel: t("minutes") },
    { key: "goals", label: "Goals", shortLabel: "G" },
    { key: "assists", label: "Assists", shortLabel: "A" },
    { key: "xG", label: "xG", shortLabel: "xG" },
    { key: "xA", label: "xA", shortLabel: "xA" },
    { key: "cleanSheets", label: "Clean Sheets", shortLabel: "CS" },
    { key: "yellowCards", label: "Yellow Cards", shortLabel: "YC" },
    { key: "price", label: "Price", shortLabel: "£" },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Position chips */}
        <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Filter by position">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => { setPosition(pos); setPage(0); }}
              className={cn(
                "px-3 py-1.5 text-xs font-barlow font-semibold uppercase tracking-wider transition-colors",
                position === pos
                  ? "bg-lfc-red text-white"
                  : "bg-stadium-surface2 text-stadium-muted hover:text-white border border-stadium-border",
              )}
            >
              {pos === "ALL" ? posT("all") : posT(pos.toUpperCase())}
            </button>
          ))}
        </div>

        {/* Team dropdown */}
        <select
          value={teamFilter === "ALL" ? "ALL" : teamFilter}
          onChange={(e) => { setTeamFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value)); setPage(0); }}
          aria-label="Filter by team"
          className="bg-stadium-surface2 border border-stadium-border text-white text-xs font-inter px-3 py-1.5 min-w-[140px] focus:outline-none focus:border-lfc-red/50"
        >
          <option value="ALL">{t("allTeams")}</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stadium-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder={t("search")}
            aria-label={t("search")}
            className="w-full bg-stadium-surface2 border border-stadium-border text-white text-xs font-inter pl-8 pr-3 py-1.5 placeholder:text-stadium-muted focus:outline-none focus:border-lfc-red/50"
          />
        </div>
      </div>

      {/* Results count */}
      <p className="text-stadium-muted text-xs font-inter">
        {filtered.length} {filtered.length === 1 ? "player" : "players"}
        {position !== "ALL" && ` · ${posT(position)}`}
        {teamFilter !== "ALL" && ` · ${teams.find((t) => t.id === teamFilter)?.name}`}
      </p>

      {/* Table */}
      <ScrollArea className="border border-stadium-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stadium-surface2">
              <th className="sticky left-0 z-10 bg-stadium-surface2 text-left px-3 py-2.5 font-barlow font-semibold text-stadium-muted uppercase tracking-wider text-xs whitespace-nowrap">
                {t("player")}
              </th>
              <th className="px-2 py-2.5 text-center font-barlow font-semibold text-stadium-muted uppercase tracking-wider text-xs">
                {t("pos")}
              </th>
              {COLUMNS_LOCAL.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  aria-sort={sortKey === col.key ? (sortDir === "desc" ? "descending" : "ascending") : "none"}
                  className="px-2 py-2.5 text-right font-barlow font-semibold uppercase tracking-wider text-xs cursor-pointer select-none whitespace-nowrap group"
                >
                  <span className={cn(
                    "inline-flex items-center gap-0.5 transition-colors",
                    sortKey === col.key ? "text-lfc-red" : "text-stadium-muted group-hover:text-white",
                  )}>
                    <span className="hidden sm:inline">{col.label}</span>
                    <span className="sm:hidden">{col.shortLabel}</span>
                    {sortKey === col.key && (
                      sortDir === "desc"
                        ? <ChevronDown size={12} />
                        : <ChevronUp size={12} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((p, i) => (
              <tr
                key={p.id}
                className={cn(
                  "border-t border-stadium-border transition-colors hover:bg-stadium-surface2/50",
                  p.isLiverpool && "bg-lfc-red/5",
                  i % 2 === 0 ? "bg-stadium-surface" : "bg-stadium-bg",
                )}
              >
                <td className="sticky left-0 z-10 px-3 py-2">
                  <div className={cn(
                    "flex items-center gap-2",
                    i % 2 === 0 ? "bg-stadium-surface" : "bg-stadium-bg",
                  )}>
                    <Link
                      href={`/players/${p.id}`}
                      className="flex items-center gap-2 group"
                    >
                      <Image
                        src={p.photo}
                        alt={p.webName}
                        width={28}
                        height={28}
                        className="rounded-full bg-stadium-surface2"
                        unoptimized
                      />
                      <div className="min-w-0">
                        <span className="font-inter text-white text-xs font-medium group-hover:text-lfc-red transition-colors block truncate max-w-[120px] sm:max-w-[160px]">
                          {p.webName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Image
                            src={p.teamBadge}
                            alt={p.teamShortName}
                            width={12}
                            height={12}
                            className="opacity-70"
                            unoptimized
                          />
                          <span className="text-stadium-muted text-[10px] font-inter">{p.teamShortName}</span>
                        </span>
                      </div>
                    </Link>
                    {p.status !== "a" && (
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        p.status === "i" ? "bg-orange-500" : p.status === "s" ? "bg-red-500" : "bg-yellow-500",
                      )} title={p.news || "Unavailable"} />
                    )}
                  </div>
                </td>
                <td className="px-2 py-2 text-center">
                  <span className={cn(
                    "text-[10px] font-barlow font-semibold uppercase tracking-wider px-1.5 py-0.5",
                    p.position === "GK" ? "text-amber-400" :
                      p.position === "DEF" ? "text-green-400" :
                        p.position === "MID" ? "text-blue-400" :
                          "text-red-400",
                  )}>
                    {p.position}
                  </span>
                </td>
                <td className="px-2 py-2 text-right font-inter text-xs font-bold text-white">{p.totalPoints}</td>
                <td className="px-2 py-2 text-right font-inter text-xs text-stadium-muted">{p.minutes}</td>
                <td className="px-2 py-2 text-right font-inter text-xs text-white">{p.goals || "-"}</td>
                <td className="px-2 py-2 text-right font-inter text-xs text-white">{p.assists || "-"}</td>
                <td className="px-2 py-2 text-right font-inter text-xs text-stadium-muted">{p.xG.toFixed(1)}</td>
                <td className="px-2 py-2 text-right font-inter text-xs text-stadium-muted">{p.xA.toFixed(1)}</td>
                <td className="px-2 py-2 text-right font-inter text-xs text-stadium-muted">{p.cleanSheets || "-"}</td>
                <td className="px-2 py-2 text-right font-inter text-xs text-stadium-muted">{p.yellowCards || "-"}</td>
                <td className="px-2 py-2 text-right font-inter text-xs text-lfc-gold">£{p.price.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-stadium-muted text-xs font-inter">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              aria-label="Previous page"
              className="p-1.5 bg-stadium-surface2 border border-stadium-border text-stadium-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              aria-label="Next page"
              className="p-1.5 bg-stadium-surface2 border border-stadium-border text-stadium-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
