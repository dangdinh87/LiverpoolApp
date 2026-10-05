"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Loader2, Newspaper, Search, SearchX, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { NewsArticle } from "@/lib/news/types";
import { SOURCE_CONFIG, type ArticleCategory, type NewsSource } from "@/lib/news-config";
import { getReadArticles } from "@/lib/news/read-history";
import { loadMoreNews } from "@/app/actions/news";
import { EmptyState } from "@/components/ui/empty-state";
import { NewsCard, NewsCardSkeleton } from "./news-card";
import { cleanTitle, isHttpUrl } from "./news-text";

/** Cards revealed per step, after the lead story. */
const PAGE_SIZE = 12;
/** Articles fetched from the server per "load more" once the loaded set is used up. */
const SERVER_PAGE_SIZE = 24;

type LangFilter = "all" | "vi" | "en";
type CategoryFilter = "all" | Exclude<ArticleCategory, "general">;

const LANGS: { value: LangFilter; labelKey: string }[] = [
  { value: "all", labelKey: "all" },
  { value: "vi", labelKey: "chipVietnamese" },
  { value: "en", labelKey: "chipInternational" },
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

/** Language chips fill red; category chips fill white, so two active chips never read as one choice. */
const chipClass = (active: boolean, tone: "lang" | "category" = "lang") =>
  `inline-flex min-h-10 shrink-0 items-center whitespace-nowrap border px-3.5 font-barlow text-sm font-semibold uppercase tracking-[0.1em] transition-colors cursor-pointer ${
    active
      ? tone === "lang"
        ? "border-lfc-red bg-lfc-red text-white"
        : "border-white bg-white text-stadium-bg"
      : "border-[var(--line-strong)] text-stadium-muted hover:border-white/40 hover:text-white"
  }`;

interface NewsFeedProps {
  localArticles: NewsArticle[];
  globalArticles: NewsArticle[];
  locale: "en" | "vi";
  /** Render-time clock from the server: keeps server and client dates identical. */
  nowMs: number;
  /** Preselected source, from `/news?source=…`. */
  initialSource?: NewsSource;
}

export function NewsFeed({ localArticles, globalArticles, locale, nowMs, initialSource }: NewsFeedProps) {
  const t = useTranslations("News.feed");
  const [lang, setLang] = useState<LangFilter>(locale === "en" ? "en" : "vi");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [source, setSource] = useState<"all" | NewsSource>(initialSource && SOURCE_CONFIG[initialSource] ? initialSource : "all");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(source !== "all");
  const [visible, setVisible] = useState(PAGE_SIZE + 1);
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

  const filtersActive = category !== "all" || source !== "all" || search.trim() !== "";
  const shown = articles.slice(0, visible);
  // Top story: the newest of the first few that has a picture (a big grey tile is a poor lead).
  const leadAt = Math.max(0, shown.slice(0, 6).findIndex((a) => isHttpUrl(a.thumbnail ?? a.heroImage)));
  const lead = shown[leadAt];
  const rest = shown.filter((_, i) => i !== leadAt);
  const hasMore = visible < articles.length || serverHasMore;

  function resetPaging() {
    setVisible(PAGE_SIZE + 1);
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

  return (
    <>
      {/* Filter bar: one slim sticky row on phones (chips scroll sideways) */}
      <div className="sticky top-[var(--header-h)] z-30 border-b border-[var(--line)] bg-stadium-bg/90 backdrop-blur-md">
        <div className="page-container">
          <div className="flex items-center gap-2 py-2">
            <div role="group" aria-label={t("filtersLabel")} className="scroll-x flex min-w-0 flex-1 items-center gap-2">
              {LANGS.map(({ value, labelKey }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={lang === value}
                  onClick={() => {
                    setLang(value);
                    setSource("all");
                    resetPaging();
                  }}
                  className={chipClass(lang === value)}
                >
                  {t(labelKey)}
                </button>
              ))}
              <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-[var(--line-strong)]" />
              {CATEGORIES.map(({ value, labelKey }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={category === value}
                  onClick={() => {
                    setCategory(value);
                    resetPaging();
                  }}
                  className={chipClass(category === value, "category")}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label={t("searchLabel")}
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((o) => !o)}
              className={`inline-flex size-10 shrink-0 items-center justify-center border transition-colors cursor-pointer ${
                searchOpen || search
                  ? "border-white/40 text-white"
                  : "border-[var(--line-strong)] text-stadium-muted hover:text-white"
              }`}
            >
              <Search className="size-4" aria-hidden />
            </button>
          </div>

          {searchOpen && (
            <div className="flex flex-col gap-2 pb-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <label htmlFor="news-search" className="sr-only">
                  {t("searchLabel")}
                </label>
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
                  className="h-11 w-full border border-[var(--line-strong)] bg-[var(--surface-1)] pl-3 pr-10 text-[15px] text-white placeholder:text-stadium-muted focus:border-white/50 focus:outline-none"
                />
                {search && (
                  <button
                    type="button"
                    aria-label={t("clearSearch")}
                    onClick={() => {
                      setSearch("");
                      searchRef.current?.focus();
                    }}
                    className="absolute right-0 top-0 inline-flex size-11 items-center justify-center text-stadium-muted hover:text-white cursor-pointer"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </div>
              {availableSources.length > 1 && (
                <div>
                  <label htmlFor="news-source" className="sr-only">
                    {t("newsSourceLabel")}
                  </label>
                  <select
                    id="news-source"
                    value={source}
                    onChange={(e) => {
                      setSource(e.target.value as "all" | NewsSource);
                      resetPaging();
                    }}
                    className="h-11 w-full border border-[var(--line-strong)] bg-[var(--surface-1)] px-3 text-[15px] text-white focus:border-white/50 focus:outline-none sm:w-52"
                  >
                    <option value="all">{t("newsSourceLabel")}: {t("newsSourceAll")}</option>
                    {availableSources.map((s) => (
                      <option key={s} value={s}>
                        {SOURCE_CONFIG[s].label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="page-container pt-4 sm:pt-6 pb-12">
        <h2 className="sr-only">{t("latest")}</h2>

        {/* Count + reset, announced politely when filters change the list */}
        <div aria-live="polite" className="flex min-h-6 items-center justify-between gap-3 pb-3 text-sm text-stadium-muted">
          {filtersActive ? (
            <>
              <span>{t("resultsCount", { count: articles.length })}</span>
              <button type="button" onClick={resetFilters} className="inline-flex min-h-10 items-center gap-1.5 font-barlow font-semibold uppercase tracking-[0.1em] text-brand hover:text-white cursor-pointer">
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
                className="mt-6 inline-flex min-h-11 items-center justify-center bg-lfc-red px-5 font-barlow text-sm font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-lfc-red-dark cursor-pointer"
              >
                {t("resetFilters")}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            {lead && <NewsCard article={lead} nowMs={nowMs} variant="lead" priority isRead={readSet.has(lead.link)} />}

            {(rest.length > 0 || pending) && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                {rest.map((a) => (
                  <NewsCard key={a.link} article={a} nowMs={nowMs} isRead={readSet.has(a.link)} />
                ))}
                {pending && Array.from({ length: 6 }, (_, i) => <NewsCardSkeleton key={`sk-${i}`} />)}
              </div>
            )}

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
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 border border-[var(--line-strong)] px-8 font-barlow text-sm font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:border-white/50 disabled:opacity-60 sm:w-auto cursor-pointer"
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
