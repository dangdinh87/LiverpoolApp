"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Newspaper,
  ArrowUp,
  CheckCheck,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import type { NewsArticle } from "@/lib/news/types";
import type { Fixture } from "@/lib/types/football";
import {
  SOURCE_CONFIG,
  formatRelativeDate,
  getArticleUrl,
  type NewsSource,
} from "@/lib/news-config";
import { getReadArticles } from "@/lib/news/read-history";

// --- Lazy wrapper: only renders children when scrolled into view ---
function LazySection({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" } // start rendering 200px before visible
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{visible ? children : null}</div>;
}

// --- Props ---
interface ArticleEndSectionsProps {
  source: NewsSource;
  allArticles: NewsArticle[];
  nextMatch: Fixture | null;
  currentArticleUrl: string;
}

export function ArticleEndSections({
  source,
  allArticles,
  nextMatch,
  currentArticleUrl,
}: ArticleEndSectionsProps) {
  return (
    <LazySection>
      <div className="mt-16 space-y-12">
        {/* Next Match — mobile-first banner (hidden on lg where sidebar shows it) */}
        {nextMatch && (
          <NextMatchBanner fixture={nextMatch} />
        )}

        {/* More from this source */}
        <MoreFromSource
          source={source}
          allArticles={allArticles}
          currentUrl={currentArticleUrl}
        />

        {/* Scroll to top */}
        <ScrollToTopBar />
      </div>
    </LazySection>
  );
}

// --- Next Match Banner (mobile-visible, modern card) ---
function NextMatchBanner({ fixture }: { fixture: Fixture }) {
  const t = useTranslations("NextMatch");
  const locale = useLocale();
  const { teams, fixture: f } = fixture;
  const date = new Date(f.date);
  const loc = locale === "vi" ? "vi-VN" : "en-GB";

  // Countdown
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const update = () => {
      const diff = date.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft(t("live"));
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [date, t]);

  return (
    <div className="lg:hidden">
      <Link
        href="/fixtures"
        className="group block relative overflow-hidden bg-gradient-to-r from-stadium-surface via-stadium-surface2 to-stadium-surface border border-stadium-border hover:border-lfc-red/50 transition-all"
      >
        {/* Subtle red accent line */}
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-lfc-red via-lfc-red/60 to-transparent" />

        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-lfc-red" />
              <span className="font-barlow text-xs text-stadium-muted uppercase tracking-widest">
                {t("title")}
              </span>
            </div>
            {timeLeft && (
              <span className="font-bebas text-sm text-lfc-red tracking-wider">
                {timeLeft}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            {/* Home */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative w-10 h-10 shrink-0">
                <Image
                  src={teams.home.logo || "/assets/lfc/crest.webp"}
                  alt={teams.home.name}
                  fill
                  sizes="40px"
                  className="object-contain"
                  unoptimized
                />
              </div>
              <span className="font-inter text-sm text-white font-semibold truncate">
                {teams.home.name}
              </span>
            </div>

            {/* VS + time */}
            <div className="flex flex-col items-center shrink-0 px-3">
              <span className="font-bebas text-xl text-stadium-muted">VS</span>
              <span className="font-barlow text-[11px] text-lfc-red font-semibold">
                {date.toLocaleDateString(loc, { day: "numeric", month: "short" })}
              </span>
              <span className="font-inter text-[11px] text-stadium-muted">
                {date.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            {/* Away */}
            <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
              <span className="font-inter text-sm text-white font-semibold truncate text-right">
                {teams.away.name}
              </span>
              <div className="relative w-10 h-10 shrink-0">
                <Image
                  src={teams.away.logo || "/assets/lfc/crest.webp"}
                  alt={teams.away.name}
                  fill
                  sizes="40px"
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>
          </div>

          {/* View fixtures link */}
          <div className="flex items-center justify-center gap-1 mt-4 text-stadium-muted group-hover:text-lfc-red transition-colors">
            <span className="font-barlow text-xs uppercase tracking-wider">
              {locale === "vi" ? "Xem lịch thi đấu" : "View Fixtures"}
            </span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Link>
    </div>
  );
}

// --- More from this source ---
function MoreFromSource({
  source,
  allArticles,
  currentUrl,
}: {
  source: NewsSource;
  allArticles: NewsArticle[];
  currentUrl: string;
}) {
  const locale = useLocale();
  const [readSet, setReadSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    setReadSet(getReadArticles());
  }, []);

  const cfg = SOURCE_CONFIG[source];
  const sourceArticles = allArticles
    .filter((a) => a.source === source && a.link !== currentUrl)
    .slice(0, 4);

  if (sourceArticles.length === 0) return null;

  return (
    <div className="pt-8 border-t border-stadium-border/50">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-lfc-red" />
          <h3 className="font-bebas text-2xl text-white tracking-wider">
            {locale === "vi" ? "Thêm từ" : "More from"}{" "}
            <span className={`inline-block px-2 py-0.5 text-lg ${cfg.color}`}>
              {cfg.label}
            </span>
          </h3>
        </div>
        <Link
          href={`/news?source=${source}`}
          className="font-barlow text-xs text-stadium-muted hover:text-lfc-red uppercase tracking-wider transition-colors flex items-center gap-1"
        >
          {locale === "vi" ? "Tất cả" : "View all"}
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Horizontal scroll on mobile, grid on larger */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
        {sourceArticles.map((article) => {
          const isRead = readSet.has(article.link);
          return (
            <Link
              key={article.link}
              href={getArticleUrl(article.link)}
              className={`group flex-shrink-0 w-[260px] sm:w-auto bg-stadium-surface border border-stadium-border overflow-hidden hover:border-lfc-red/40 transition-all ${isRead ? "opacity-60" : ""}`}
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                {article.thumbnail ? (
                  <Image
                    src={article.thumbnail}
                    alt={article.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 260px, (max-width: 1024px) 50vw, 25vw"
                    loading="lazy"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-lfc-red/10 to-stadium-surface flex items-center justify-center">
                    <Newspaper className="w-5 h-5 text-stadium-muted" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-inter text-[11px] text-stadium-muted">
                    {formatRelativeDate(article.pubDate, article.language)}
                  </span>
                  {isRead && <CheckCheck className="w-3 h-3 text-stadium-muted ml-auto" />}
                </div>
                <p className="font-inter text-[13px] font-semibold text-white group-hover:text-lfc-red transition-colors leading-snug line-clamp-2">
                  {article.title}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// --- Scroll to top bar ---
function ScrollToTopBar() {
  const locale = useLocale();

  return (
    <div className="flex items-center justify-center pt-8 pb-4 border-t border-stadium-border/30">
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="group flex items-center gap-2 px-6 py-2.5 bg-stadium-surface border border-stadium-border hover:border-lfc-red/40 hover:bg-stadium-surface2 transition-all"
      >
        <ArrowUp className="w-4 h-4 text-stadium-muted group-hover:text-lfc-red transition-colors group-hover:-translate-y-0.5 duration-200" />
        <span className="font-barlow text-sm text-stadium-muted group-hover:text-white uppercase tracking-wider transition-colors">
          {locale === "vi" ? "Lên đầu trang" : "Back to top"}
        </span>
      </button>
    </div>
  );
}
