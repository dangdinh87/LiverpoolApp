"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, User, BookOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { SOURCE_CONFIG, type NewsSource } from "@/lib/news-config";
import { ArticleActions } from "./article-actions";
import type { Fixture } from "@/lib/types/football";

interface ArticleSidebarProps {
  source: NewsSource;
  sourceName: string;
  sourceUrl: string;
  author?: string;
  publishDate?: { relative: string; absolute: string };
  readingTime?: number;
  articleTitle: string;
  articleSlugUrl: string;
  nextMatch?: Fixture | null;
}

export function ArticleSidebar({
  source,
  sourceName,
  sourceUrl,
  author,
  publishDate,
  readingTime,
  articleTitle,
  articleSlugUrl,
  nextMatch,
}: ArticleSidebarProps) {
  const cfg = SOURCE_CONFIG[source];

  return (
    <div className="sticky top-20 space-y-4">
      {/* Source card */}
      <div className="bg-stadium-surface border border-stadium-border p-5 space-y-3">
        <p className="font-barlow text-xs text-stadium-muted uppercase tracking-widest">
          Source
        </p>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 font-barlow text-sm uppercase tracking-widest px-3 py-1.5 ${cfg.color} hover:brightness-125 transition-all`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          {sourceName}
        </a>
      </div>

      {/* Metadata card */}
      <div className="bg-stadium-surface border border-stadium-border p-5 space-y-3">
        <p className="font-barlow text-xs text-stadium-muted uppercase tracking-widest">
          Details
        </p>
        <div className="space-y-3">
          {author && (
            <div className="flex items-center gap-2.5 text-white/70">
              <User className="w-4 h-4 shrink-0" />
              <span className="font-inter text-sm">{author}</span>
            </div>
          )}
          {publishDate && (
            <div className="flex items-center gap-2.5 text-white/70" title={publishDate.absolute}>
              <Clock className="w-4 h-4 shrink-0" />
              <span className="font-inter text-sm">{publishDate.absolute}</span>
            </div>
          )}
          {readingTime && (
            <div className="flex items-center gap-2.5 text-white/70">
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="font-inter text-sm">{readingTime} min read</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions: like, save, share, original */}
      <ArticleActions
        articleUrl={sourceUrl}
        articleTitle={articleTitle}
        articleSlugUrl={articleSlugUrl}
      />

      {/* Next Match */}
      {nextMatch && <NextMatchCard fixture={nextMatch} />}
    </div>
  );
}

/** LFC crest fallback for team logos */
const LFC_CREST = "/assets/lfc/crest.webp";

/** Next-match card for sidebar */
function NextMatchCard({ fixture }: { fixture: Fixture }) {
  const t = useTranslations("NextMatch");
  const { teams, league, fixture: f } = fixture;
  const date = new Date(f.date);

  return (
    <Link
      href="/fixtures"
      className="block bg-stadium-surface border border-stadium-border p-5 hover:border-lfc-red/40 transition-colors"
    >
      <p className="font-barlow text-xs text-stadium-muted uppercase tracking-widest mb-4">
        {t("title")}
      </p>

      <div className="flex items-center justify-between gap-3">
        {/* Home */}
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <div className="relative w-10 h-10">
            <Image
              src={teams.home.logo || LFC_CREST}
              alt={teams.home.name}
              fill
              sizes="40px"
              className="object-contain"
              unoptimized
            />
          </div>
          <span className="font-inter text-xs text-white text-center font-medium leading-tight truncate w-full">
            {teams.home.name}
          </span>
        </div>

        {/* VS + date */}
        <div className="flex flex-col items-center gap-0.5 px-2">
          <span className="font-bebas text-2xl text-stadium-muted">VS</span>
          <span className="font-barlow text-xs text-lfc-red font-semibold">
            {date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </span>
          <span className="font-inter text-xs text-stadium-muted">
            {date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* Away */}
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <div className="relative w-10 h-10">
            <Image
              src={teams.away.logo || LFC_CREST}
              alt={teams.away.name}
              fill
              sizes="40px"
              className="object-contain"
              unoptimized
            />
          </div>
          <span className="font-inter text-xs text-white text-center font-medium leading-tight truncate w-full">
            {teams.away.name}
          </span>
        </div>
      </div>

      {/* League */}
      <div className="border-t border-stadium-border mt-4 pt-3 flex items-center gap-2">
        <div className="relative w-4 h-4 shrink-0">
          <Image
            src={league.logo}
            alt={league.name}
            fill
            sizes="16px"
            className="object-contain"
            unoptimized
          />
        </div>
        <span className="font-inter text-xs text-stadium-muted truncate">
          {league.name}
        </span>
      </div>
    </Link>
  );
}
