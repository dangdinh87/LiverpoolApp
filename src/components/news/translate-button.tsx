"use client";

import {
  useState,
  useCallback,
  useMemo,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { Languages, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  getCachedTranslation,
  setCachedTranslation,
} from "@/lib/news/translation-cache";
import { ArticleHtmlBody } from "./article-html-body";
import { ARTICLE_LEAD_CLASS, ARTICLE_TITLE_CLASS } from "./article-header";
import { ArticleFigures } from "./article-figures";
import { filterJunk } from "./news-text";

// ─── Helpers ────────────────────────────────────────────────────────────────────

function stripPrefix(s: string): string {
  return s.replace(/^(TITLE|TIÊU ĐỀ|P\d+)\s*[:：]\s*/i, "").trim();
}

// ─── Shared context between header + body ───────────────────────────────────────

interface TranslateState {
  mode: "original" | "translated";
  loading: boolean;
  failed: boolean;
  displayTitle: string;
  displayDescription?: string;
  displayParagraphs: string[];
  handleTranslate: () => void;
}

const TranslateCtx = createContext<TranslateState | null>(null);

function useTranslate() {
  const ctx = useContext(TranslateCtx);
  if (!ctx) throw new Error("useTranslate must be inside TranslateProvider");
  return ctx;
}

// ─── Provider (wraps header + body) ─────────────────────────────────────────────

interface TranslateProviderProps {
  articleUrl: string;
  originalTitle: string;
  originalDescription?: string;
  originalParagraphs: string[];
  children: ReactNode;
}

export function TranslateProvider({
  articleUrl,
  originalTitle,
  originalDescription,
  originalParagraphs,
  children,
}: TranslateProviderProps) {
  const [mode, setMode] = useState<"original" | "translated">("original");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null);
  const [translatedDescription, setTranslatedDescription] = useState<string | null>(null);
  const [translatedParagraphs, setTranslatedParagraphs] = useState<string[] | null>(null);

  const cleanOriginalParagraphs = useMemo(
    () => filterJunk(originalParagraphs),
    [originalParagraphs]
  );

  const handleTranslate = useCallback(async () => {
    if (mode === "translated") {
      setMode("original");
      return;
    }

    if (translatedParagraphs) {
      setMode("translated");
      return;
    }

    const cached = getCachedTranslation(articleUrl);
    if (cached) {
      setTranslatedTitle(stripPrefix(cached.title_vi));
      setTranslatedDescription(cached.description_vi ? stripPrefix(cached.description_vi) : null);
      setTranslatedParagraphs(filterJunk(cached.paragraphs.map(stripPrefix)));
      setMode("translated");
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
      const cleanTitle = stripPrefix(data.title_vi || "");
      const cleanDesc = data.description_vi ? stripPrefix(data.description_vi) : null;
      const cleanParagraphs = filterJunk((data.paragraphs || []).map((p: string) => stripPrefix(p)));

      setTranslatedTitle(cleanTitle);
      setTranslatedDescription(cleanDesc);
      setTranslatedParagraphs(cleanParagraphs);
      setMode("translated");

      setCachedTranslation(articleUrl, cleanTitle, cleanParagraphs, cleanDesc || undefined);
    } catch {
      // Calm, generic message in the UI: raw error text is never shown.
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [articleUrl, mode, translatedParagraphs]);

  const isTranslated = mode === "translated";

  const value: TranslateState = {
    mode,
    loading,
    failed,
    displayTitle: isTranslated && translatedTitle ? translatedTitle : originalTitle,
    displayDescription:
      isTranslated && translatedDescription ? translatedDescription : originalDescription,
    displayParagraphs:
      isTranslated && translatedParagraphs ? translatedParagraphs : cleanOriginalParagraphs,
    handleTranslate,
  };

  return <TranslateCtx.Provider value={value}>{children}</TranslateCtx.Provider>;
}

// ─── Header slot: title + description ───────────────────────────────────────────

export function TranslateHeader({ originalDescription }: { originalDescription?: string }) {
  const { loading, displayTitle, displayDescription } = useTranslate();

  return (
    <>
      <h1 className={ARTICLE_TITLE_CLASS}>
        {loading ? (
          <span aria-busy className="block">
            <span className="skeleton mb-3 block h-9 w-[95%] sm:h-11" />
            <span className="skeleton block h-9 w-[70%] sm:h-11" />
          </span>
        ) : (
          displayTitle
        )}
      </h1>

      {displayDescription && !loading && <p className={ARTICLE_LEAD_CLASS}>{displayDescription}</p>}
      {loading && originalDescription && (
        <div className="mt-4 max-w-3xl space-y-2 border-l-4 border-lfc-red pl-4">
          <div className="skeleton h-5 w-[90%]" />
          <div className="skeleton h-5 w-[75%]" />
        </div>
      )}
    </>
  );
}

// ─── Body slot: toggle + article body (original HTML, or translated text + photos) ──

interface TranslateBodyProps {
  /** Extracted article HTML (figures, embeds, video placeholders), if the source gave any. */
  html?: string;
  /** Photos shown with the plain-text body, hero already removed. */
  images: string[];
}

export function TranslateBody({ html, images }: TranslateBodyProps) {
  const { mode, loading, failed, displayParagraphs, handleTranslate } = useTranslate();
  const t = useTranslations("News.translate");
  const isTranslated = mode === "translated";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p aria-live="polite" className="min-w-0 flex-1 text-xs text-stadium-muted">
          {failed ? t("error") : isTranslated ? t("aiDisclaimer") : ""}
        </p>
        <button
          type="button"
          onClick={handleTranslate}
          disabled={loading}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 border border-[var(--line-strong)] bg-[var(--surface-2)] px-4 font-barlow text-sm font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:border-white/40 disabled:opacity-60 cursor-pointer"
        >
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Languages className="size-4" aria-hidden />}
          {loading ? t("translating") : isTranslated ? t("showOriginal") : t("showTranslated")}
        </button>
      </div>

      <div id="article-body">
        {loading ? (
          <div aria-busy className="space-y-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="space-y-2.5">
                <div className="skeleton h-[18px] w-full" />
                <div className="skeleton h-[18px] w-[92%]" />
                <div className="skeleton h-[18px] w-[78%]" />
              </div>
            ))}
          </div>
        ) : !isTranslated && html ? (
          <ArticleHtmlBody html={html} />
        ) : (
          <ArticleFigures paragraphs={displayParagraphs} images={images} />
        )}
      </div>
    </div>
  );
}
