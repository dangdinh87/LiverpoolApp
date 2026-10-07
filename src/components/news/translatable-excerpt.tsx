"use client";

import { useCallback, useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { getCachedTranslation, setCachedTranslation } from "@/lib/news/translation-cache";
import { buildExcerpt } from "@/lib/news/excerpt";
import { ArticleExcerpt } from "./article-parts";
import { filterJunk } from "./news-text";

function stripPrefix(s: string): string {
  return s.replace(/^(TITLE|TIÊU ĐỀ|P\d+)\s*[:：]\s*/i, "").trim();
}

interface TranslatableExcerptProps {
  articleUrl: string;
  /** The (already capped) excerpt in the article's own language. */
  paragraphs: string[];
  /** Small heading above the excerpt ("Đoạn trích"). */
  label: string;
}

/**
 * The excerpt with an on-demand Vietnamese translation. Only the excerpt is
 * translated: the headline and everything else on the page stay as published.
 * The translate API and the local cache both cap what they return to the same excerpt.
 */
export function TranslatableExcerpt({ articleUrl, paragraphs, label }: TranslatableExcerptProps) {
  const t = useTranslations("News.translate");
  const [translated, setTranslated] = useState<string[] | null>(null);
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
      // Cap here too: this localStorage entry can be up to 7 days old, from
      // before the excerpt limit shipped, and may still hold the full article.
      const { excerpt } = buildExcerpt(filterJunk(cached.paragraphs.map(stripPrefix)));
      setTranslated(excerpt);
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
      const { excerpt } = buildExcerpt(filterJunk((data.paragraphs || []).map((p: string) => stripPrefix(p))));
      // An article with no body text is shown from its description; translate that instead.
      const shown = excerpt.length > 0 ? excerpt : descriptionVi ? [descriptionVi] : [];
      if (shown.length === 0) throw new Error("Empty translation");

      setTranslated(shown);
      setShowTranslated(true);
      setCachedTranslation(articleUrl, titleVi, shown, descriptionVi || undefined);
    } catch {
      // Calm, generic message in the UI: raw error text is never shown.
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
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 border border-[var(--line-strong)] bg-[var(--surface-2)] px-3.5 font-barlow text-sm font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:border-white/40 disabled:opacity-60"
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
        ) : (
          <ArticleExcerpt paragraphs={showTranslated && translated ? translated : paragraphs} />
        )}
      </div>

      <p aria-live="polite" className="mt-3 text-[13px] leading-snug text-stadium-muted">
        {failed ? t("error") : showTranslated ? t("aiDisclaimer") : ""}
      </p>
    </section>
  );
}
