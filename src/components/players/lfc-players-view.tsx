"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Search,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Zap,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PlayerImage } from "./player-image";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { LfcFplPlayer, FplPosition } from "@/lib/fpl-data";

// ─── Types ──────────────────────────────────────────────────────────────────────

type SortKey =
  | "totalPoints"
  | "goals"
  | "assists"
  | "xG"
  | "xA"
  | "minutes"
  | "form"
  | "price"
  | "pointsPerGame"
  | "expectedPointsNext"
  | "starts"
  | "bonus"
  | "dreamteamCount"
  | "cleanSheets";

type SortDir = "asc" | "desc";
type ViewMode = "stats" | "fpl";

interface Props {
  players: LfcFplPlayer[];
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const POSITIONS: (FplPosition | "ALL")[] = ["ALL", "GK", "DEF", "MID", "FWD"];

const POS_COLORS: Record<FplPosition, { text: string; bg: string; label: string }> = {
  GK: { text: "text-amber-400", bg: "bg-amber-400/10", label: "Goalkeeper" },
  DEF: { text: "text-blue-400", bg: "bg-blue-400/10", label: "Defender" },
  MID: { text: "text-green-400", bg: "bg-green-400/10", label: "Midfielder" },
  FWD: { text: "text-lfc-red", bg: "bg-lfc-red/10", label: "Forward" },
};

const STATS_COLUMNS: { key: SortKey; label: string; short: string }[] = [
  { key: "totalPoints", label: "Points", short: "Pts" },
  { key: "minutes", label: "Minutes", short: "Min" },
  { key: "starts", label: "Starts", short: "St" },
  { key: "goals", label: "Goals", short: "G" },
  { key: "assists", label: "Assists", short: "A" },
  { key: "xG", label: "xG", short: "xG" },
  { key: "xA", label: "xA", short: "xA" },
  { key: "cleanSheets", label: "Clean Sheets", short: "CS" },
  { key: "bonus", label: "Bonus", short: "Bon" },
];

const FPL_COLUMNS: { key: SortKey; label: string; short: string }[] = [
  { key: "totalPoints", label: "Points", short: "Pts" },
  { key: "form", label: "Form", short: "Form" },
  { key: "pointsPerGame", label: "Pts/Game", short: "PPG" },
  { key: "expectedPointsNext", label: "xPts Next", short: "xP" },
  { key: "price", label: "Price", short: "£" },
  { key: "dreamteamCount", label: "Dream Team", short: "DT" },
  { key: "goals", label: "Goals", short: "G" },
  { key: "assists", label: "Assists", short: "A" },
];

// Stats glossary — explains each metric for fans
// `label` is the display badge, `i18nKey` is used for translation lookup
const STATS_GLOSSARY = [
  { label: "Pts", i18nKey: "Pts" },
  { label: "Min", i18nKey: "Min" },
  { label: "St", i18nKey: "St" },
  { label: "G", i18nKey: "G" },
  { label: "A", i18nKey: "A" },
  { label: "xG", i18nKey: "xG" },
  { label: "xA", i18nKey: "xA" },
  { label: "CS", i18nKey: "CS" },
  { label: "Bon", i18nKey: "Bon" },
  { label: "Form", i18nKey: "Form" },
  { label: "PPG", i18nKey: "PPG" },
  { label: "xP", i18nKey: "xP" },
  { label: "£", i18nKey: "Price" },
  { label: "DT", i18nKey: "DT" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

function statusIndicator(status: string, chance: number | null) {
  if (status === "a") return null;
  const config =
    status === "i" ? { color: "bg-orange-500", text: "text-orange-400", label: "Injured" } :
      status === "s" ? { color: "bg-red-500", text: "text-red-400", label: "Suspended" } :
        status === "d" ? { color: "bg-yellow-500", text: "text-yellow-400", label: "Doubtful" } :
          { color: "bg-gray-500", text: "text-gray-400", label: "Unavailable" };
  return (
    <span className={cn("inline-flex items-center gap-1 shrink-0", config.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.color)} />
      <span className="text-[9px] font-inter font-medium uppercase tracking-wider">
        {config.label}
      </span>
    </span>
  );
}

function priceChange(change: number) {
  if (change === 0) return <Minus size={10} className="text-stadium-muted" />;
  if (change > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-green-400 text-[10px]">
        <TrendingUp size={10} />+{change.toFixed(1)}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-red-400 text-[10px]">
      <TrendingDown size={10} />{change.toFixed(1)}
    </span>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function LfcPlayersView({ players }: Props) {
  const t = useTranslations("Squad");
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<FplPosition | "ALL">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("totalPoints");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("stats");
  const [showGlossary, setShowGlossary] = useState(false);

  const columns = viewMode === "stats" ? STATS_COLUMNS : FPL_COLUMNS;

  const filtered = useMemo(() => {
    let list = players;
    if (position !== "ALL") list = list.filter((p) => p.position === position);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.webName.toLowerCase().includes(q) ||
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          p.knownName.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      const getValue = (p: LfcFplPlayer) => {
        if (sortKey === "form") return parseFloat(p.form) || 0;
        return (p[sortKey] as number) ?? 0;
      };
      return sortDir === "desc" ? getValue(b) - getValue(a) : getValue(a) - getValue(b);
    });
  }, [players, position, search, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Position chips */}
        <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Filter by position">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => setPosition(pos)}
              className={cn(
                "px-3 py-1.5 text-xs font-barlow font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer",
                position === pos
                  ? "bg-lfc-red text-white border border-transparent shadow-[0_0_12px_rgba(200,16,46,0.3)]"
                  : "bg-stadium-surface text-stadium-muted border border-stadium-border hover:border-lfc-red/40 hover:text-white",
              )}
            >
              {pos === "ALL" ? t("positions.all") : pos}
              {pos !== "ALL" && (
                <span className="ml-1.5 opacity-50 text-[10px]">
                  {players.filter((p) => p.position === pos).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* View mode toggle */}
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode("stats")}
            className={cn(
              "px-3 py-1.5 text-xs font-barlow font-semibold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 cursor-pointer",
              viewMode === "stats"
                ? "bg-lfc-red text-white border border-transparent shadow-[0_0_12px_rgba(200,16,46,0.3)]"
                : "bg-stadium-surface text-stadium-muted border border-stadium-border hover:border-lfc-red/40 hover:text-white",
            )}
          >
            <Star size={11} /> {t("tabs.stats")}
          </button>
          <button
            onClick={() => setViewMode("fpl")}
            className={cn(
              "px-3 py-1.5 text-xs font-barlow font-semibold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 cursor-pointer",
              viewMode === "fpl"
                ? "bg-lfc-red text-white border border-transparent shadow-[0_0_12px_rgba(200,16,46,0.3)]"
                : "bg-stadium-surface text-stadium-muted border border-stadium-border hover:border-lfc-red/40 hover:text-white",
            )}
          >
            <Zap size={11} /> {t("tabs.fpl")}
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs sm:ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stadium-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            aria-label="Search players"
            className="w-full bg-stadium-surface border border-stadium-border text-white text-xs font-inter pl-8 pr-3 py-2 placeholder:text-stadium-muted focus:outline-none focus:border-lfc-red/50 transition-colors"
          />
        </div>
      </div>

      {/* Results count */}
      <p className="text-stadium-muted text-xs font-inter">
        {t("count", { count: filtered.length, n: filtered.length })}
        {position !== "ALL" && ` · ${position}`}
      </p>

      {/* Table */}
      <ScrollArea className="border border-stadium-border bg-stadium-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stadium-bg/80">
              <th className="w-8 px-2 py-2.5 text-center font-barlow font-semibold text-stadium-muted uppercase tracking-wider text-[10px]">
                #
              </th>
              <th className="sticky left-0 z-10 bg-stadium-bg/80 text-left px-3 py-2.5 font-barlow font-semibold text-stadium-muted uppercase tracking-wider text-xs whitespace-nowrap">
                Player
              </th>
              {columns.map((col) => (
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
                    <span className="sm:hidden">{col.short}</span>
                    {sortKey === col.key && (
                      sortDir === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr
                key={p.id}
                className={cn(
                  "border-t border-stadium-border/50 transition-colors hover:bg-lfc-red/[0.04]",
                  i % 2 === 0 ? "bg-stadium-surface" : "bg-stadium-bg/40",
                )}
              >
                {/* Rank */}
                <td className="w-8 px-2 py-2.5 text-center font-bebas text-stadium-muted/50 text-sm">
                  {i + 1}
                </td>

                {/* Player cell */}
                <td className="sticky left-0 z-10 px-3 py-2">
                  <div className={cn(
                    "flex items-center gap-2.5",
                    i % 2 === 0 ? "bg-stadium-surface" : "bg-stadium-bg/40",
                  )}>
                    <Link href={`/players/${p.id}`} className="flex items-center gap-2.5 group cursor-pointer">
                      <PlayerImage
                        src={p.photo}
                        alt={p.webName}
                        width={32}
                        height={32}
                        className="rounded-full bg-stadium-surface2 ring-1 ring-stadium-border group-hover:ring-lfc-red/50 transition-all shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="font-inter text-white text-xs font-semibold group-hover:text-lfc-red transition-colors block truncate max-w-[130px] sm:max-w-[180px]">
                          {p.webName}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className={cn("text-[10px] font-barlow font-semibold uppercase tracking-wider", POS_COLORS[p.position].text)}>
                            {t(`positions.${p.position}`)}
                          </span>
                          {p.squadNumber && (
                            <span className="text-stadium-muted/50 text-[10px] font-bebas tracking-wider">#{p.squadNumber}</span>
                          )}
                        </span>
                      </div>
                    </Link>
                    {statusIndicator(p.status, p.chanceNextRound)}
                  </div>
                </td>

                {/* Stats view */}
                {viewMode === "stats" && (
                  <>
                    <td className="px-2 py-2 text-right font-inter text-xs font-bold text-white tabular-nums">{p.totalPoints}</td>
                    <td className="px-2 py-2 text-right font-inter text-xs text-stadium-muted tabular-nums">{p.minutes.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right font-inter text-xs text-stadium-muted tabular-nums">{p.starts}</td>
                    <td className={cn("px-2 py-2 text-right font-inter text-xs tabular-nums", p.goals > 0 ? "text-white font-semibold" : "text-stadium-muted")}>{p.goals || "-"}</td>
                    <td className={cn("px-2 py-2 text-right font-inter text-xs tabular-nums", p.assists > 0 ? "text-white font-semibold" : "text-stadium-muted")}>{p.assists || "-"}</td>
                    <td className="px-2 py-2 text-right font-inter text-xs text-stadium-muted tabular-nums">{p.xG.toFixed(1)}</td>
                    <td className="px-2 py-2 text-right font-inter text-xs text-stadium-muted tabular-nums">{p.xA.toFixed(1)}</td>
                    <td className="px-2 py-2 text-right font-inter text-xs text-stadium-muted tabular-nums">{p.cleanSheets || "-"}</td>
                    <td className="px-2 py-2 text-right font-inter text-xs text-stadium-muted tabular-nums">{p.bonus || "-"}</td>
                  </>
                )}

                {/* FPL view */}
                {viewMode === "fpl" && (
                  <>
                    <td className="px-2 py-2 text-right font-inter text-xs font-bold text-white tabular-nums">{p.totalPoints}</td>
                    <td className={cn(
                      "px-2 py-2 text-right font-inter text-xs font-semibold tabular-nums",
                      parseFloat(p.form) >= 6 ? "text-green-400" : parseFloat(p.form) >= 3 ? "text-white" : "text-stadium-muted",
                    )}>{p.form}</td>
                    <td className="px-2 py-2 text-right font-inter text-xs text-white tabular-nums">{p.pointsPerGame.toFixed(1)}</td>
                    <td className={cn(
                      "px-2 py-2 text-right font-inter text-xs font-semibold tabular-nums",
                      p.expectedPointsNext >= 5 ? "text-green-400" : "text-white",
                    )}>{p.expectedPointsNext.toFixed(1)}</td>
                    <td className="px-2 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="font-inter text-xs text-lfc-gold tabular-nums">£{p.price.toFixed(1)}</span>
                        {priceChange(p.costChange)}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right font-inter text-xs text-stadium-muted tabular-nums">{p.dreamteamCount || "-"}</td>
                    <td className={cn("px-2 py-2 text-right font-inter text-xs tabular-nums", p.goals > 0 ? "text-white font-semibold" : "text-stadium-muted")}>{p.goals || "-"}</td>
                    <td className={cn("px-2 py-2 text-right font-inter text-xs tabular-nums", p.assists > 0 ? "text-white font-semibold" : "text-stadium-muted")}>{p.assists || "-"}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {filtered.length === 0 && (
        <p className="text-stadium-muted text-center py-12 font-inter">
          {search ? t("noPlayers", { search }) : t("noPlayersFilter")}
        </p>
      )}

      {/* ─── Stats Glossary ───────────────────────────────────────────────── */}
      <div className="border border-stadium-border bg-stadium-surface">
        <button
          onClick={() => setShowGlossary(!showGlossary)}
          className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-stadium-surface2 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Info size={14} className="text-lfc-red" />
            <span className="font-bebas text-lg text-white tracking-wider">{t("glossary.title")}</span>
            <span className="text-stadium-muted text-xs font-inter">— {t("glossary.subtitle")}</span>
          </span>
          <ChevronDown
            size={16}
            className={cn("text-stadium-muted transition-transform duration-200", showGlossary && "rotate-180")}
          />
        </button>

        {showGlossary && (
          <div className="px-5 pb-5 border-t border-stadium-border/50">
            <p className="text-stadium-muted text-xs font-inter mt-3 mb-4">
              {t("glossary.description")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              {STATS_GLOSSARY.map((item) => (
                <div key={item.i18nKey} className="flex gap-3">
                  <span className="shrink-0 w-10 h-6 flex items-center justify-center bg-lfc-red/10 text-lfc-red font-barlow font-bold text-[10px] uppercase tracking-wider rounded-sm">
                    {item.label}
                  </span>
                  <div className="min-w-0">
                    <p className="font-inter text-white text-xs font-semibold leading-tight">{t(`glossary.items.${item.i18nKey}.name`)}</p>
                    <p className="font-inter text-stadium-muted text-[11px] leading-relaxed mt-0.5">{t(`glossary.items.${item.i18nKey}.desc`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
