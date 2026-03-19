"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, Newspaper } from "lucide-react";
import { useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { unsaveArticle } from "@/app/actions/profile";
import { useToast } from "@/stores/toast-store";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { getArticleUrl, SOURCE_CONFIG } from "@/lib/news-config";
import type { SavedArticle } from "@/lib/supabase";
import type { NewsSource } from "@/lib/news/types";

interface SavedArticlesListProps {
  articles: SavedArticle[];
}

export function SavedArticlesList({ articles: initialArticles }: SavedArticlesListProps) {
  const [articles, setArticles] = useState(initialArticles);
  const [isPending, startTransition] = useTransition();
  const { show: showToast } = useToast();
  const t = useTranslations("Profile");
  const locale = useLocale();
  const dateLoc = locale === "vi" ? "vi-VN" : "en-GB";
  const [confirmTarget, setConfirmTarget] = useState<SavedArticle | null>(null);

  function handleUnsave(article: SavedArticle) {
    setConfirmTarget(null);
    // Optimistic removal
    setArticles((prev) => prev.filter((a) => a.id !== article.id));

    startTransition(async () => {
      await unsaveArticle(article.article_url);
      showToast({ type: "success", message: t("unsaveSuccess") });
    });
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-10">
        <Bookmark className="w-10 h-10 text-stadium-muted mx-auto mb-3" />
        <p className="font-inter text-stadium-muted text-sm">
          {t("savedArticlesEmpty")}
        </p>
      </div>
    );
  }

  return (
    <>
      <AlertDialog
        open={!!confirmTarget}
        onOpenChange={(v) => { if (!v) setConfirmTarget(null); }}
      >
        <AlertDialogContent className="bg-stadium-surface border-stadium-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-bebas text-2xl tracking-wider">
              {t("confirmUnsave")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-stadium-muted font-inter">
              {t("confirmUnsaveDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-stadium-surface2 border-stadium-border text-white hover:bg-stadium-surface hover:text-white cursor-pointer">
              {t("cancelAction")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmTarget && handleUnsave(confirmTarget)}
              className="bg-lfc-red hover:bg-lfc-red/80 text-white cursor-pointer"
            >
              {t("confirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-3">
        {articles.map((article) => {
          const sourceCfg = SOURCE_CONFIG[article.article_source as NewsSource];
          return (
            <div
              key={article.id}
              className="flex gap-3 bg-stadium-bg border border-stadium-border/50 overflow-hidden group"
            >
              {/* Thumbnail */}
              <Link
                href={getArticleUrl(article.article_url)}
                className="relative w-28 sm:w-36 h-24 shrink-0 overflow-hidden"
              >
                {article.article_thumbnail ? (
                  <Image
                    src={article.article_thumbnail}
                    alt={article.article_title}
                    fill
                    className="object-cover"
                    sizes="144px"
                    loading="lazy"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 bg-linear-to-br from-lfc-red/15 to-stadium-surface flex items-center justify-center">
                    <Newspaper className="w-5 h-5 text-stadium-muted" />
                  </div>
                )}
              </Link>

              {/* Content */}
              <div className="flex flex-col justify-center gap-1.5 flex-1 min-w-0 py-2 pr-3">
                {/* Source badge */}
                {sourceCfg && (
                  <span
                    className={`self-start inline-flex items-center font-barlow font-bold text-[10px] uppercase tracking-wider px-1.5 py-0.5 ${sourceCfg.color}`}
                  >
                    {sourceCfg.label}
                  </span>
                )}

                {/* Title */}
                <Link href={getArticleUrl(article.article_url)}>
                  <p className="font-inter text-sm text-white font-medium leading-snug line-clamp-2 group-hover:text-lfc-red transition-colors">
                    {article.article_title}
                  </p>
                </Link>

                {/* Actions row */}
                <div className="flex items-center gap-3 mt-0.5">
                  {article.article_published_at && (
                    <span className="font-inter text-[11px] text-stadium-muted">
                      {new Date(article.article_published_at).toLocaleDateString(
                        dateLoc,
                        { day: "numeric", month: "short" }
                      )}
                    </span>
                  )}
                  <button
                    onClick={() => setConfirmTarget(article)}
                    disabled={isPending}
                    className="flex items-center gap-1 text-amber-400 font-inter text-xs hover:text-white transition-colors cursor-pointer"
                    aria-label={t("unsave")}
                  >
                    <Bookmark size={12} className="fill-amber-400" />
                    {t("unsave")}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
