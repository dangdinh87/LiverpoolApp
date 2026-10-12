"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Loader2, Newspaper, Search, SearchX, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { NewsArticle } from "@/lib/news/types";
import { SOURCE_CONFIG, type ArticleCategory, type NewsSource } from "@/lib/news-config";
import { useUrlSearchParam } from "@/hooks/use-url-search-param";
import { getReadArticles } from "@/lib/news/read-history";
import { loadMoreNews } from "@/app/actions/news";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetTrigger } from "@/components/ui/sheet";
import { NewsCard, NewsCardSkeleton } from "./news-card";
import { cleanTitle } from "./news-text";

/** Headlines revealed per step. */
const PAGE_SIZE = 12;
/** Articles fetched from the server per "load more" once the loaded set is used up. */
const SERVER_PAGE_SIZE = 24;

type LangFilter = "all" | "vi" | "en";
type CategoryFilter = "all" | Exclude<ArticleCategory, "general">;

const LANGS: { value: LangFilter; labelKey: string }[] = [
  { value: "all", labelKey: "langAll" },
  { value: "vi", labelKey: "langVi" },
  { value: "en", labelKey: "langEn" },
];

const CATEGORIES: { value: CategoryFilter; labelKey: string }[] = [
  { value: "all", labelKey: "catAll" },
  { value: "team-news", labelKey: "catTeamNews" },
  { value: "transfer", labelKey: "catTransfer" },
  { value: "match-report", labelKey: "catMatch" },
  { value: "injury", labelKey: "catInjury" },
  { value: "analysis", labelKey: "catAnalysis" },
  { value: "opinion", labelKey: "catOpinion" },
];

const categoryChip = (active: boolean) =>
  `inline-flex min-h-11 cursor-pointer items-center border px-4 font-barlow text-sm font-semibold uppercase tracking-[0.1em] transition-colors ${
    active
      ? "border-lfc-red bg-lfc-red text-white"
      : "border-[var(--line-strong)] text-stadium-muted hover:border-white/40 hover:text-white"
  }`;

interface NewsFeedProps {
  localArticles: NewsArticle[];
  globalArticles: NewsArticle[];
  locale: "en" | "vi";
  /** Render-time clock from the server: keeps server and client dates identical. */
  nowMs: number;
}

export function NewsFeed({ localArticles, globalArticles, locale, nowMs }: NewsFeedProps) {
  const t = useTranslations("News.feed");
  const [lang, setLang] = useState<LangFilter>(locale === "en" ? "en" : "vi");
  const [category, setCategory] = useState<CategoryFilter>("all");
  // `/news?source=bbc` is read here rather than in the page, so /news stays
  // prerendered and is served from the CDN edge worldwide instead of being
  // rendered per request in one region. Every article is in the static HTML
  // already; the parameter only chooses which of them to show.
  const urlSource = useUrlSearchParam("source");
  const [pickedSource, setPickedSource] = useState<"all" | NewsSource | null>(null);
  const source: "all" | NewsSource =
    pickedSource ?? (urlSource && Object.hasOwn(SOURCE_CONFIG, urlSource) ? (urlSource as NewsSource) : "all");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [readSet, setReadSet] = useState<Set<string>>(() => new Set());
  const [extra, setExtra] = useState<NewsArticle[]>([]);
  const [serverHasMore, setServerHasMore] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Read history lives in localStorage, so it can only be read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReadSet(getReadArticles());
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const loaded = useMemo(() => {
    const seen = new Set<string>();
    return [...localArticles, ...globalArticles, ...extra]
      .filter((a) => (seen.has(a.link) ? false : (seen.add(a.link), true)))
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  }, [localArticles, globalArticles, extra]);

  const byLang = useMemo(() => (lang === "all" ? loaded : loaded.filter((a) => a.language === lang)), [loaded, lang]);

  const availableSources = useMemo(() => {
    const present = new Set(byLang.map((a) => a.source));
    return (Object.keys(SOURCE_CONFIG) as NewsSource[]).filter((s) => present.has(s));
  }, [byLang]);

  const articles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return byLang.filter((a) => {
      if (source !== "all" && a.source !== source) return false;
      if (category !== "all" && a.category !== category) return false;
      if (!q) return true;
      return cleanTitle(a.title).toLowerCase().includes(q) || a.contentSnippet?.toLowerCase().includes(q);
    });
  }, [byLang, source, category, search]);

  const sheetFilters = (category !== "all" ? 1 : 0) + (source !== "all" ? 1 : 0);
  const filtersActive = sheetFilters > 0 || search.trim() !== "";
  const shown = articles.slice(0, visible);
  const hasMore = visible < articles.length || serverHasMore;

  function resetPaging() {
    setVisible(PAGE_SIZE);
  }

  /** Pick a source and keep `?source=` in the URL, without a navigation. */
  function setSource(next: "all" | NewsSource) {
    setPickedSource(next);
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("source");
    else url.searchParams.set("source", next);
    window.history.replaceState(window.history.state, "", url.toString());
  }

  function resetFilters() {
    setCategory("all");
    setSource("all");
    setSearch("");
    resetPaging();
  }

  function loadMore() {
    setLoadFailed(false);
    if (visible < articles.length) {
      setVisible((v) => v + PAGE_SIZE);
      return;
    }
    const requestLanguage = lang === "all" ? undefined : lang;
    const offset = loaded.filter((a) => !requestLanguage || a.language === requestLanguage).length;
    startTransition(async () => {
      try {
        const { articles: more, hasMore: stillMore } = await loadMoreNews(offset, SERVER_PAGE_SIZE, requestLanguage);
        setExtra((prev) => [...prev, ...more]);
        setServerHasMore(stillMore);
        setVisible((v) => v + PAGE_SIZE);
      } catch {
        setLoadFailed(true);
      }
    });
  }

  const activeNames = [
    category !== "all" ? t(CATEGORIES.find((c) => c.value === category)?.labelKey ?? "catAll") : null,
    source !== "all" ? SOURCE_CONFIG[source].label : null,
  ].filter(Boolean);

  return (
    <>
      {/* One slim sticky row: language segments, filter sheet, search. Nothing scrolls sideways, nothing is cut off. */}
      <div className="sticky top-[var(--header-h)] z-30 border-b border-[var(--line)] bg-stadium-bg/95 backdrop-blur-md">
        <div className="page-container">
          <div className="flex items-center gap-2 py-2">
            <div
              role="group"
              aria-label={t("langGroupLabel")}
              className="flex min-w-0 flex-1 border border-[var(--line-strong)] sm:max-w-sm sm:flex-none sm:basis-80"
            >
              {LANGS.map(({ value, labelKey }) => {
                const active = lang === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setLang(value);
                      setSource("all");
                      resetPaging();
                    }}
                    className={`min-h-11 flex-auto cursor-pointer whitespace-nowrap px-2 font-inter text-[13px] font-semibold transition-colors sm:text-sm ${
                      active ? "bg-lfc-red text-white" : "text-stadium-muted hover:text-white"
                    } ${value !== "all" ? "border-l border-[var(--line-strong)]" : ""}`}
                  >
                    {t(labelKey)}
                  </button>
                );
              })}
            </div>

            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label={t("filtersTitle")}
                  className={`relative ml-auto inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 border px-2.5 font-inter text-[13px] font-semibold transition-colors sm:px-3 sm:text-sm ${
                    sheetFilters > 0
                      ? "border-white/50 text-white"
                      : "border-[var(--line-strong)] text-stadium-muted hover:border-white/40 hover:text-white"
                  }`}
                >
                  <SlidersHorizontal className="size-4" aria-hidden />
                  <span className="hidden sm:inline">{t("filterBtn")}</span>
                  {sheetFilters > 0 && (
                    <span
                      aria-hidden
                      className="inline-flex size-[18px] items-center justify-center bg-lfc-red text-[11px] font-bold text-white"
                    >
                      {sheetFilters}
                    </span>
                  )}
                </button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                title={t("filtersTitle")}
                showCloseButton={false}
                className="max-h-[88dvh] gap-0 border-[var(--line-strong)] bg-[var(--surface-1)] p-0 sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2"
              >
                <div className="flex items-center justify-between gap-3 pl-4 pr-1 pt-3">
                  <p className="font-bebas text-3xl leading-none text-white">{t("filtersTitle")}</p>
                  <SheetClose asChild>
                    <button
                      type="button"
                      aria-label={t("close")}
                      className="inline-flex size-12 cursor-pointer items-center justify-center text-stadium-muted transition-colors hover:text-white"
                    >
                      <X className="size-5" aria-hidden />
                    </button>
                  </SheetClose>
                </div>
                <div className="space-y-6 overflow-y-auto px-4 pb-6 pt-4">
                  <div>
                    <p className="section-label mb-3 text-stadium-muted">{t("categoryLabel")}</p>
                    <div role="group" aria-label={t("categoryLabel")} className="flex flex-wrap gap-2">
                      {CATEGORIES.map(({ value, labelKey }) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={category === value}
                          onClick={() => {
                            setCategory(value);
                            resetPaging();
                          }}
                          className={categoryChip(category === value)}
                        >
                          {t(labelKey)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {availableSources.length > 1 && (
                    <div>
                      <label htmlFor="news-source" className="section-label mb-3 block text-stadium-muted">
                        {t("newsSourceLabel")}
                      </label>
                      <select
                        id="news-source"
                        value={source}
                        onChange={(e) => {
                          setSource(e.target.value as "all" | NewsSource);
                          resetPaging();
                        }}
                        className="h-12 w-full border border-[var(--line-strong)] bg-[var(--surface-2)] px-3 text-base text-white focus:border-white/50 focus:outline-none"
                      >
                        <option value="all">{t("newsSourceAll")}</option>
                        {availableSources.map((s) => (
                          <option key={s} value={s}>
                            {SOURCE_CONFIG[s].label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <SheetFooter className="mt-0 flex-row gap-3 border-t border-[var(--line)] bg-[var(--surface-1)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <button
                    type="button"
                    onClick={resetFilters}
                    disabled={!filtersActive}
                    className="inline-flex min-h-12 shrink-0 cursor-pointer items-center justify-center border border-[var(--line-strong)] px-4 font-barlow text-sm font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:border-white/50 disabled:cursor-default disabled:opacity-40"
                  >
                    {t("resetFilters")}
                  </button>
                  <SheetClose asChild>
                    <button
                      type="button"
                      className="inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center bg-lfc-red px-4 font-barlow text-sm font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-lfc-red-dark"
                    >
                      {t("showResults", { count: articles.length })}
                    </button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>

            <button
              type="button"
              aria-label={t("searchLabel")}
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((o) => !o)}
              className={`inline-flex size-11 shrink-0 cursor-pointer items-center justify-center border transition-colors ${
                searchOpen || search
                  ? "border-white/50 text-white"
                  : "border-[var(--line-strong)] text-stadium-muted hover:border-white/40 hover:text-white"
              }`}
            >
              <Search className="size-[18px]" aria-hidden />
            </button>
          </div>

          {searchOpen && (
            <div className="pb-3">
              <label htmlFor="news-search" className="sr-only">
                {t("searchLabel")}
              </label>
              <div className="relative">
                <input
                  id="news-search"
                  ref={searchRef}
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    resetPaging();
                  }}
                  placeholder={t("searchPlaceholder")}
                  className="h-12 w-full border border-[var(--line-strong)] bg-[var(--surface-1)] pl-3 pr-12 text-base text-white placeholder:text-stadium-muted focus:border-white/50 focus:outline-none"
                />
                {search && (
                  <button
                    type="button"
                    aria-label={t("clearSearch")}
                    onClick={() => {
                      setSearch("");
                      searchRef.current?.focus();
                    }}
                    className="absolute right-0 top-0 inline-flex size-12 cursor-pointer items-center justify-center text-stadium-muted hover:text-white"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="page-container pb-12 pt-1 sm:pt-4">
        <h2 className="sr-only">{t("latest")}</h2>

        {/* Count + reset, announced politely when filters change the list */}
        <div
          aria-live="polite"
          className={filtersActive ? "flex min-h-11 items-center justify-between gap-3 text-sm text-stadium-muted" : "sr-only"}
        >
          {filtersActive ? (
            <>
              <span className="min-w-0 truncate">
                {t("resultsCount", { count: articles.length })}
                {activeNames.length > 0 ? ` · ${activeNames.join(" · ")}` : ""}
              </span>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 font-barlow font-semibold uppercase tracking-[0.1em] text-brand hover:text-white"
              >
                <X className="size-3.5" aria-hidden />
                {t("resetFilters")}
              </button>
            </>
          ) : null}
        </div>

        {loaded.length === 0 ? (
          <EmptyState
            tone="error"
            icon={<Newspaper className="size-10" aria-hidden />}
            title={t("unavailableTitle")}
            description={t("unavailableDesc")}
            actionHref="/news"
            actionLabel={t("retry")}
          />
        ) : articles.length === 0 ? (
          <div className="surface flex flex-col items-center px-6 py-12 text-center sm:py-16">
            <SearchX className="mb-4 size-10 text-stadium-muted" aria-hidden />
            <p className="font-bebas text-2xl text-white sm:text-3xl">{t("noArticles")}</p>
            <p className="mt-2 max-w-md text-sm text-stadium-muted">{t("noArticlesDesc")}</p>
            {filtersActive && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-6 inline-flex min-h-11 cursor-pointer items-center justify-center bg-lfc-red px-5 font-barlow text-sm font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-lfc-red-dark"
              >
                {t("resetFilters")}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {shown.map((a, i) => (
                <NewsCard key={a.link} article={a} nowMs={nowMs} priority={i < 3} isRead={readSet.has(a.link)} />
              ))}
              {pending && Array.from({ length: 6 }, (_, i) => <NewsCardSkeleton key={`sk-${i}`} />)}
            </div>

            {loadFailed && (
              <p role="alert" className="text-center text-sm text-stadium-muted">
                {t("loadMoreError")}
              </p>
            )}

            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={pending}
                  className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 border border-[var(--line-strong)] px-8 font-barlow text-sm font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:border-white/50 disabled:opacity-60 sm:w-auto"
                >
                  {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                  {pending ? t("loading") : t("loadMore")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
