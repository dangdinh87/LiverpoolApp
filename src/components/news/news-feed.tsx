"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Newspaper, Clock, CheckCheck, Search, X,
  SlidersHorizontal, TrendingUp, ArrowDownWideNarrow,
  Globe, Flag, Earth,
  Layers, Target, CircleDollarSign, HeartPulse, Users, BarChart3, MessageSquareQuote,
  Loader2, RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { NewsArticle } from "@/lib/news/types";
import {
  SOURCE_CONFIG,
  CATEGORY_CONFIG,
  formatRelativeDate,
  getArticleUrl,
  type NewsSource,
  type ArticleCategory,
} from "@/lib/news-config";
import { getReadArticles } from "@/lib/news/read-history";
import {
  Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { loadMoreNews, syncNews } from "@/app/news/actions";

// hero(1) + grid(6) + compact(n) — keep compact divisible by 3 for clean grid rows
// 13 - 7 = 6 (2 rows × 3), each +12 increment: 18, 30, 42... always %3 === 0
const INITIAL_COUNT = 13;
const LOAD_MORE_COUNT = 12;

/* ── Filter types ── */

type FeedFilter = "all" | "local" | "global";
type SortMode = "trending" | "newest";
type CategoryFilter = "all" | ArticleCategory;

const STORAGE_KEY = "lfc-news-filter";

function getSavedFilter(): FeedFilter {
  if (typeof window === "undefined") return "local";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "all" || saved === "local" || saved === "global") return saved;
  return "local";
}

/* ── Filter config ── */

const SORT_OPTIONS: { value: SortMode; icon: LucideIcon; labelKey: string }[] = [
  { value: "trending", icon: TrendingUp, labelKey: "sortTrending" },
  { value: "newest", icon: ArrowDownWideNarrow, labelKey: "sortLatest" },
];

const LANG_OPTIONS: { value: FeedFilter; icon: LucideIcon; labelKey: string }[] = [
  { value: "all", icon: Globe, labelKey: "langAll" },
  { value: "local", icon: Flag, labelKey: "langLocal" },
  { value: "global", icon: Earth, labelKey: "langGlobal" },
];

const CATEGORY_OPTIONS: { value: CategoryFilter; icon: LucideIcon; labelKey: string }[] = [
  { value: "all", icon: Layers, labelKey: "catAll" },
  { value: "team-news", icon: Users, labelKey: "catTeamNews" },
  { value: "transfer", icon: CircleDollarSign, labelKey: "catTransfer" },
  { value: "match-report", icon: Target, labelKey: "catMatch" },
  { value: "injury", icon: HeartPulse, labelKey: "catInjury" },
  { value: "analysis", icon: BarChart3, labelKey: "catAnalysis" },
  { value: "opinion", icon: MessageSquareQuote, labelKey: "catOpinion" },
];

/* ── Sub-components ── */

function Badge({ source }: { source: NewsSource }) {
  const cfg = SOURCE_CONFIG[source];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center font-barlow font-bold text-[11px] uppercase tracking-wider px-1.5 py-0.5 ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

const CATEGORY_LABEL_KEY: Record<string, string> = {
  "match-report": "catMatch",
  transfer: "catTransfer",
  injury: "catInjury",
  "team-news": "catTeamNews",
  analysis: "catAnalysis",
  opinion: "catOpinion",
};

function CategoryBadge({ category }: { category?: ArticleCategory }) {
  const t = useTranslations("News.feed");
  if (!category || category === "general") return null;
  const cfg = CATEGORY_CONFIG[category];
  if (!cfg) return null;
  const labelKey = CATEGORY_LABEL_KEY[category];
  return (
    <span className={`font-barlow font-bold text-[11px] uppercase tracking-wider px-1.5 py-0.5 ${cfg.color}`}>
      {labelKey ? t(labelKey) : cfg.label}
    </span>
  );
}

function HeroCard({ article, isRead }: { article: NewsArticle; isRead: boolean }) {
  const t = useTranslations("News.feed");
  return (
    <Link
      href={getArticleUrl(article.link)}
      className={`group block relative overflow-hidden cursor-pointer ${isRead ? "opacity-50" : ""}`}
    >
      <div className="relative aspect-16/10 sm:aspect-21/9 w-full overflow-hidden">
        {article.thumbnail ? (
          <Image
            src={article.thumbnail}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 896px"
            priority
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-lfc-red/20 to-stadium-bg flex items-center justify-center">
            <Newspaper className="w-12 h-12 text-stadium-muted" />
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 group-hover:opacity-90" />
        {isRead && (
          <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 px-2 py-1 bg-black/70 backdrop-blur-sm">
            <CheckCheck className="w-3.5 h-3.5 text-green-400" />
            <span className="font-barlow text-[10px] uppercase tracking-wider text-green-400">{t("read")}</span>
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Badge source={article.source} />
          <CategoryBadge category={article.category} />
          {formatRelativeDate(article.pubDate, article.language) && (
            <span className="font-inter text-xs text-white/50 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelativeDate(article.pubDate, article.language)}
            </span>
          )}
        </div>
        <h2 className="font-inter text-xl sm:text-2xl font-bold text-white leading-snug line-clamp-2 transition-colors duration-300 group-hover:text-lfc-gold">
          {article.title}
        </h2>
      </div>
    </Link>
  );
}

function GridCard({ article, isRead }: { article: NewsArticle; isRead: boolean }) {
  const t = useTranslations("News.feed");
  return (
    <Link
      href={getArticleUrl(article.link)}
      className={`group block bg-stadium-surface/80 border border-stadium-border/50 overflow-hidden cursor-pointer transition-all duration-300 hover:border-lfc-red/25 hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] ${isRead ? "opacity-50" : ""}`}
    >
      <div className="relative aspect-video w-full overflow-hidden">
        {article.thumbnail ? (
          <Image
            src={article.thumbnail}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            loading="lazy"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-lfc-red/15 to-stadium-surface flex items-center justify-center">
            <Newspaper className="w-6 h-6 text-stadium-muted" />
          </div>
        )}
        {isRead && (
          <div className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm">
            <CheckCheck className="w-3 h-3 text-green-400" />
            <span className="font-barlow text-[9px] uppercase tracking-wider text-green-400">{t("read")}</span>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-2 flex-wrap min-h-[20px]">
          <Badge source={article.source} />
          <CategoryBadge category={article.category} />
        </div>
        <h3 className="font-inter text-sm font-semibold text-white leading-snug line-clamp-3 min-h-[3.6em]">
          {article.title}
        </h3>
        {formatRelativeDate(article.pubDate, article.language) && (
          <span className="font-inter text-[11px] text-stadium-muted mt-2 block">
            {formatRelativeDate(article.pubDate, article.language)}
          </span>
        )}
      </div>
    </Link>
  );
}

function CompactCard({ article, isRead }: { article: NewsArticle; isRead: boolean }) {
  const t = useTranslations("News.feed");
  return (
    <Link
      href={getArticleUrl(article.link)}
      className={`group flex gap-3 p-3 bg-stadium-surface/80 border border-stadium-border/50 overflow-hidden cursor-pointer transition-all duration-300 hover:border-lfc-red/25 hover:bg-stadium-surface ${isRead ? "opacity-50" : ""}`}
    >
      <div className="relative w-32 h-24 shrink-0 overflow-hidden">
        {article.thumbnail ? (
          <Image
            src={article.thumbnail}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
            sizes="128px"
            loading="lazy"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-lfc-red/15 to-stadium-surface flex items-center justify-center">
            <Newspaper className="w-5 h-5 text-stadium-muted" />
          </div>
        )}
        {isRead && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <CheckCheck className="w-4 h-4 text-green-400" />
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center gap-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge source={article.source} />
          <CategoryBadge category={article.category} />
          {isRead && (
            <span className="inline-flex items-center gap-1 font-barlow text-[9px] uppercase tracking-wider text-green-400">
              <CheckCheck className="w-3 h-3" /> {t("read")}
            </span>
          )}
        </div>
        <p className="font-inter text-sm text-white font-medium leading-snug line-clamp-2">
          {article.title}
        </p>
        {formatRelativeDate(article.pubDate, article.language) && (
          <span className="font-inter text-[11px] text-stadium-muted">
            {formatRelativeDate(article.pubDate, article.language)}
          </span>
        )}
      </div>
    </Link>
  );
}


/* ── Filter Sheet (slides in from right) ── */

function FilterSheet({
  sortMode, setSortMode,
  langFilter, setLangFilter,
  sourceFilter, setSourceFilter,
  availableSources,
  category, setCategory,
  activeCount,
}: {
  sortMode: SortMode;
  setSortMode: (v: SortMode) => void;
  langFilter: FeedFilter;
  setLangFilter: (v: FeedFilter) => void;
  sourceFilter: "all" | NewsSource;
  setSourceFilter: (v: "all" | NewsSource) => void;
  availableSources: NewsSource[];
  category: CategoryFilter;
  setCategory: (v: CategoryFilter) => void;
  activeCount: number;
}) {
  const t = useTranslations("News.feed");

  const chipClass = (active: boolean) =>
    `inline-flex items-center gap-1.5 px-3 py-2 text-xs font-barlow uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
      active
        ? "bg-lfc-red text-white"
        : "bg-stadium-surface border border-stadium-border/60 text-stadium-muted hover:text-white hover:border-lfc-red/40"
    }`;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="relative flex items-center gap-1.5 px-4 py-2 bg-stadium-surface border border-stadium-border/60 text-stadium-muted hover:text-white hover:border-lfc-red/40 transition-colors cursor-pointer shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="font-barlow text-sm font-bold uppercase tracking-wider">
            {t("filterBtn")}
          </span>
          {activeCount > 0 && (
            <span className="w-4 h-4 bg-lfc-red text-white text-[9px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 bg-stadium-bg border-l border-stadium-border p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-stadium-border/50">
          <SheetTitle className="font-bebas text-2xl text-white tracking-wider">
            {t("filtersTitle")}
          </SheetTitle>
        </SheetHeader>

        <div className="px-5 py-5 space-y-6 overflow-y-auto">
          {/* Sort */}
          <div>
            <p className="font-barlow text-[10px] text-stadium-muted uppercase tracking-widest mb-3">
              {t("sortLabel")}
            </p>
            <div className="flex gap-2">
              {SORT_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
                <button
                  key={value}
                  onClick={() => setSortMode(value)}
                  className={chipClass(sortMode === value)}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <p className="font-barlow text-[10px] text-stadium-muted uppercase tracking-widest mb-3">
              {t("sourceLabel")}
            </p>
            <div className="flex flex-wrap gap-2">
              {LANG_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
                <button
                  key={value}
                  onClick={() => setLangFilter(value)}
                  className={chipClass(langFilter === value)}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* News Source */}
          {availableSources.length > 1 && (
            <div>
              <p className="font-barlow text-[10px] text-stadium-muted uppercase tracking-widest mb-3">
                {t("newsSourceLabel")}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSourceFilter("all")}
                  className={chipClass(sourceFilter === "all")}
                >
                  {t("newsSourceAll")}
                </button>
                {availableSources.map((src) => (
                  <button
                    key={src}
                    onClick={() => setSourceFilter(src)}
                    className={chipClass(sourceFilter === src)}
                  >
                    {SOURCE_CONFIG[src]?.label ?? src}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category */}
          <div>
            <p className="font-barlow text-[10px] text-stadium-muted uppercase tracking-widest mb-3">
              {t("categoryLabel")}
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
                <button
                  key={value}
                  onClick={() => setCategory(value)}
                  className={chipClass(category === value)}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Reset */}
          {activeCount > 0 && (
            <button
              onClick={() => {
                setSortMode("trending");
                setLangFilter("all");
                setSourceFilter("all");
                setCategory("all");
              }}
              className="w-full font-barlow text-xs uppercase tracking-wider text-stadium-muted hover:text-white py-2.5 border-t border-stadium-border/40 pt-4 cursor-pointer transition-colors"
            >
              {t("resetFilters")}
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ── Main Component ── */

interface NewsFeedProps {
  localArticles: NewsArticle[];
  globalArticles: NewsArticle[];
  locale: "en" | "vi";
}

export function NewsFeed({ localArticles, globalArticles, locale }: NewsFeedProps) {
  const t = useTranslations("News.feed");
  const [langFilter, setLangFilter] = useState<FeedFilter>("local");
  const [sortMode, setSortMode] = useState<SortMode>("trending");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | NewsSource>("all");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const [readSet, setReadSet] = useState<Set<string>>(new Set());
  // Server-side load-more state
  const [extraArticles, setExtraArticles] = useState<NewsArticle[]>([]);
  const [serverHasMore, setServerHasMore] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setLangFilter(getSavedFilter());
    setReadSet(getReadArticles());
  }, []);

  const handleLangFilter = (f: FeedFilter) => {
    setLangFilter(f);
    setSourceFilter("all");
    setVisibleCount(INITIAL_COUNT);
    localStorage.setItem(STORAGE_KEY, f);
  };

  const handleSortMode = (s: SortMode) => {
    setSortMode(s);
    setVisibleCount(INITIAL_COUNT);
  };

  const handleCategory = (c: CategoryFilter) => {
    setCategory(c);
    setVisibleCount(INITIAL_COUNT);
  };

  const handleSourceFilter = (s: "all" | NewsSource) => {
    setSourceFilter(s);
    setVisibleCount(INITIAL_COUNT);
  };

  // Only count filters not visible as chips (sort + category + source)
  const activeFilterCount =
    (sortMode !== "trending" ? 1 : 0) +
    (category !== "all" ? 1 : 0) +
    (sourceFilter !== "all" ? 1 : 0);

  // Merge initial + server-loaded extra articles
  const allLocal = useMemo(() => {
    const extra = extraArticles.filter((a) => a.language === "vi");
    return [...localArticles, ...extra];
  }, [localArticles, extraArticles]);

  const allGlobal = useMemo(() => {
    const extra = extraArticles.filter((a) => a.language !== "vi");
    return [...globalArticles, ...extra];
  }, [globalArticles, extraArticles]);

  // Pipeline: lang → source → category → sort → search
  const langFiltered = useMemo(
    () => langFilter === "local" ? allLocal
      : langFilter === "global" ? allGlobal
      : [...allLocal, ...allGlobal],
    [langFilter, allLocal, allGlobal]
  );

  const availableSources = useMemo(() => {
    const sourceSet = new Set(langFiltered.map(a => a.source));
    return (Object.keys(SOURCE_CONFIG) as NewsSource[]).filter(s => sourceSet.has(s));
  }, [langFiltered]);

  const sourceFiltered = useMemo(
    () => sourceFilter === "all" ? langFiltered : langFiltered.filter(a => a.source === sourceFilter),
    [langFiltered, sourceFilter]
  );

  const catFiltered = useMemo(
    () => category === "all" ? sourceFiltered : sourceFiltered.filter((a) => a.category === category),
    [sourceFiltered, category]
  );

  const sorted = useMemo(
    () => [...catFiltered].sort((a, b) => {
      if (sortMode === "trending") {
        const scoreDiff = (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
        if (scoreDiff !== 0) return scoreDiff;
      }
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    }),
    [catFiltered, sortMode]
  );

  const articles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((a) =>
      a.title.toLowerCase().includes(q) ||
      a.contentSnippet?.toLowerCase().includes(q)
    );
  }, [sorted, search]);

  return (
    <div className="space-y-3">
      {/* Toolbar: lang chips + search + filter — all one row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Segmented control — sliding red background via layoutId */}
        <div className="flex items-stretch border border-stadium-border/60 overflow-hidden shrink-0 bg-stadium-surface">
          {([
            { value: "all" as FeedFilter, labelKey: "all" },
            { value: "local" as FeedFilter, labelKey: "chipVietnamese", flag: "\u{1F1FB}\u{1F1F3}" },
            { value: "global" as FeedFilter, labelKey: "chipInternational", flag: "\u{1F30D}" },
          ]).map(({ value, labelKey, flag }, i, arr) => (
            <motion.button
              key={value}
              onClick={() => handleLangFilter(value)}
              whileTap={{ scale: 0.96 }}
              className={`relative px-4 py-2 text-sm font-barlow font-bold uppercase tracking-wider cursor-pointer overflow-hidden transition-colors duration-150 ${
                i < arr.length - 1 ? "border-r border-stadium-border/60" : ""
              } ${langFilter === value ? "text-white" : "text-stadium-muted hover:text-white"}`}
            >
              {langFilter === value && (
                <motion.div
                  layoutId="lang-filter-bg"
                  className="absolute inset-0 bg-lfc-red"
                  transition={{ type: "spring", stiffness: 180, damping: 14 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {flag && <span>{flag}</span>}
                {t(labelKey)}
              </span>
            </motion.button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stadium-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setVisibleCount(INITIAL_COUNT); }}
            placeholder={t("searchPlaceholder")}
            className="w-full bg-stadium-surface border border-stadium-border/60 pl-8 pr-7 py-2 text-sm font-inter text-white placeholder:text-stadium-muted/50 focus:outline-none focus:border-lfc-red/50 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stadium-muted hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <button
          onClick={async () => {
            setIsRefreshing(true);
            try {
              await syncNews();
              window.location.reload();
            } finally {
              setIsRefreshing(false);
            }
          }}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-2 bg-stadium-surface border border-stadium-border/60 text-stadium-muted hover:text-white hover:border-lfc-red/40 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          title={t("refreshNews")}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span className="font-barlow text-sm font-bold uppercase tracking-wider hidden sm:inline">
            {isRefreshing ? t("refreshing") : t("refreshNews")}
          </span>
        </button>

        <FilterSheet
          sortMode={sortMode}
          setSortMode={handleSortMode}
          langFilter={langFilter}
          setLangFilter={handleLangFilter}
          sourceFilter={sourceFilter}
          setSourceFilter={handleSourceFilter}
          availableSources={availableSources}
          category={category}
          setCategory={handleCategory}
          activeCount={activeFilterCount}
        />
      </div>

      {/* Active filters summary */}
      {(activeFilterCount > 0 || search) && (
        <div className="flex items-center gap-2 flex-wrap">
          {search && (
            <span className="font-inter text-xs text-stadium-muted">
              {articles.length} {t("resultsFor")} &ldquo;{search}&rdquo;
            </span>
          )}
          {sourceFilter !== "all" && (
            <span className="inline-flex items-center gap-1 font-barlow text-[10px] uppercase tracking-wider px-2 py-1 bg-stadium-surface border border-stadium-border/60 text-white/70">
              {SOURCE_CONFIG[sourceFilter]?.label ?? sourceFilter}
              <button onClick={() => handleSourceFilter("all")} className="ml-0.5 hover:text-white cursor-pointer"><X className="w-3 h-3" /></button>
            </span>
          )}
          {category !== "all" && (
            <span className="inline-flex items-center gap-1 font-barlow text-[10px] uppercase tracking-wider px-2 py-1 bg-stadium-surface border border-stadium-border/60 text-white/70">
              {CATEGORY_OPTIONS.find((o) => o.value === category)?.labelKey && t(CATEGORY_OPTIONS.find((o) => o.value === category)!.labelKey)}
              <button onClick={() => handleCategory("all")} className="ml-0.5 hover:text-white cursor-pointer"><X className="w-3 h-3" /></button>
            </span>
          )}
          {sortMode !== "trending" && (
            <span className="inline-flex items-center gap-1 font-barlow text-[10px] uppercase tracking-wider px-2 py-1 bg-stadium-surface border border-stadium-border/60 text-white/70">
              {SORT_OPTIONS.find((o) => o.value === sortMode)?.labelKey && t(SORT_OPTIONS.find((o) => o.value === sortMode)!.labelKey)}
              <button onClick={() => handleSortMode("trending")} className="ml-0.5 hover:text-white cursor-pointer"><X className="w-3 h-3" /></button>
            </span>
          )}
        </div>
      )}

      {/* Feed */}
      {articles.length === 0 ? (
        <div className="text-center py-20">
          <Newspaper className="w-12 h-12 text-stadium-muted mx-auto mb-4" />
          <p className="font-bebas text-3xl text-stadium-muted mb-2">
            {t("noArticles")}
          </p>
          <p className="font-inter text-stadium-muted text-sm">
            {t("noArticlesDesc")}
          </p>
        </div>
      ) : (
        <>
          {(() => {
            const visible = articles.slice(0, visibleCount);
            const hasMore = visibleCount < articles.length || serverHasMore;
            const hero = visible[0];
            const grid = visible.slice(1, 7);
            const compact = visible.slice(7);

            return (
              <>
                {hero && (
                  <HeroCard article={hero} isRead={readSet.has(hero.link)} />
                )}

                {grid.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {grid.map((article) => (
                      <GridCard key={article.link} article={article} isRead={readSet.has(article.link)} />
                    ))}
                  </div>
                )}

                {compact.length > 0 && (
                  <div className="space-y-3">
                    <p className="font-barlow text-xs text-stadium-muted uppercase tracking-widest font-semibold">
                      {t("moreStories")}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {compact.map((article) => (
                        <CompactCard key={article.link} article={article} isRead={readSet.has(article.link)} />
                      ))}
                    </div>
                  </div>
                )}

                {hasMore && (
                  <div className="text-center pt-4">
                    <button
                      onClick={() => {
                        // First exhaust client-side articles
                        if (visibleCount < articles.length) {
                          setVisibleCount((prev) =>
                            Math.min(prev + LOAD_MORE_COUNT, articles.length)
                          );
                        } else if (serverHasMore) {
                          // Fetch more from server
                          const currentTotal = localArticles.length + globalArticles.length + extraArticles.length;
                          startTransition(async () => {
                            const { articles: newArticles, hasMore: more } =
                              await loadMoreNews(currentTotal, LOAD_MORE_COUNT, langFilter === "local" ? "vi" : langFilter === "global" ? "en" : undefined);
                            setExtraArticles((prev) => [...prev, ...newArticles]);
                            setServerHasMore(more);
                            setVisibleCount((prev) => prev + newArticles.length);
                          });
                        }
                      }}
                      disabled={isPending}
                      className="font-barlow text-sm uppercase tracking-wider text-white border border-stadium-border/60 px-6 py-2.5 hover:border-lfc-red hover:text-lfc-red transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isPending ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t("loading")}
                        </span>
                      ) : (
                        t("loadMore")
                      )}
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
