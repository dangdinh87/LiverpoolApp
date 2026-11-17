"use client";

import { useCallback, useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { getCachedTranslation, setCachedTranslation } from "@/lib/news/translation-cache";
import { ArticleHtmlBody } from "./article-html-body";
import { ArticleExcerpt } from "./article-parts";
import { filterJunk } from "./news-text";

function stripPrefix(s: string): string {
  return s.replace(/^(TITLE|TIÊU ĐỀ|P\d+)\s*[:：]\s*/i, "").trim();
}

interface TranslatableExcerptProps {
  articleUrl: string;
  /** Plain-text paragraphs in the article's original language (fallback when htmlContent is absent). */
  paragraphs: string[];
  /** Extracted sanitised HTML body (preserves sub-headings, lists, figures, and inline videos). */
  htmlContent?: string;
  /** Small heading above the body. */
  label: string;
}

/**
 * Full article body with an on-demand Vietnamese translation toggle.
 *
 * When `htmlContent` is available, the original view renders `<ArticleHtmlBody>`
 * (server-rendered in first paint); toggling translation swaps cleanly to the
 * translated Vietnamese paragraphs and optionally shows the translated headline.
 */
export function TranslatableExcerpt({
  articleUrl,
  paragraphs,
  htmlContent,
  label,
}: TranslatableExcerptProps) {
  const t = useTranslations("News.translate");
  const [translated, setTranslated] = useState<string[] | null>(null);
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const toggle = useCallback(async () => {
    if (showTranslated) {
      setShowTranslated(false);
      return;
    }
    if (translated) {
      setShowTranslated(true);
      return;
    }

    const cached = getCachedTranslation(articleUrl);
    if (cached) {
      setTranslated(filterJunk(cached.paragraphs.map(stripPrefix)));
      if (cached.title_vi) setTranslatedTitle(stripPrefix(cached.title_vi));
      setShowTranslated(true);
      return;
    }

    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch("/api/news/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: articleUrl }),
      });
      if (!res.ok) throw new Error(`Translation failed (${res.status})`);

      const data = await res.json();
      const titleVi = stripPrefix(data.title_vi || "");
      const descriptionVi = data.description_vi ? stripPrefix(data.description_vi) : null;
      const translatedBody = filterJunk((data.paragraphs || []).map((p: string) => stripPrefix(p)));
      const shown = translatedBody.length > 0 ? translatedBody : descriptionVi ? [descriptionVi] : [];
      if (shown.length === 0) throw new Error("Empty translation");

      setTranslated(shown);
      if (titleVi) setTranslatedTitle(titleVi);
      setShowTranslated(true);
      setCachedTranslation(articleUrl, titleVi, shown, descriptionVi || undefined);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [articleUrl, showTranslated, translated]);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="section-label text-stadium-muted">{label}</p>
        <button
          type="button"
          onClick={toggle}
          disabled={loading}
          aria-pressed={showTranslated}
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 border border-[var(--line-strong)] bg-[var(--surface-2)] px-3.5 font-barlow text-sm font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:border-white/40 active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Languages className="size-4" aria-hidden />}
          {loading ? t("translating") : showTranslated ? t("showOriginal") : t("showTranslated")}
        </button>
      </div>

      <div id="article-body" aria-busy={loading}>
        {loading ? (
          <div aria-hidden className="space-y-2.5">
            <div className="skeleton h-[18px] w-full" />
            <div className="skeleton h-[18px] w-[94%]" />
            <div className="skeleton h-[18px] w-[88%]" />
            <div className="skeleton h-[18px] w-[60%]" />
          </div>
        ) : showTranslated && translated ? (
          <div className="space-y-4">
            {translatedTitle && (
              <p className="font-serif text-xl font-semibold leading-snug text-white sm:text-2xl">
                {translatedTitle}
              </p>
            )}
            <ArticleExcerpt paragraphs={translated} />
          </div>
        ) : htmlContent ? (
          <ArticleHtmlBody html={htmlContent} />
        ) : (
          <ArticleExcerpt paragraphs={paragraphs} />
        )}
      </div>

      <p aria-live="polite" className="mt-3 text-[13px] leading-snug text-stadium-muted">
        {failed ? t("error") : showTranslated ? t("aiDisclaimer") : ""}
      </p>
    </section>
  );
}
