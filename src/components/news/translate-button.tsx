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

// ─── Helpers ────────────────────────────────────────────────────────────────────

function stripPrefix(s: string): string {
  return s.replace(/^(TITLE|TIÊU ĐỀ|P\d+)\s*[:：]\s*/i, "").trim();
}

const JUNK_PATTERN =
  /FOLLOW\s+(OUR|US)|FACEBOOK\s+PAGE|Sign up|Newsletter|Subscribe|Click here|READ MORE|READ NEXT|All the latest|dedicated .* page|IconSport|Getty Images|Image:|^\s*Share\s*$/i;

function filterJunk(paragraphs: string[]): string[] {
  return paragraphs.filter((p) => !JUNK_PATTERN.test(p) && p.length > 15);
}

// ─── Shared context between header + body ───────────────────────────────────────

interface TranslateState {
  mode: "original" | "translated";
  loading: boolean;
  error: string | null;
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

// ─── Provider (wraps header + grid) ─────────────────────────────────────────────

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
  const [error, setError] = useState<string | null>(null);
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null);
  const [translatedDescription, setTranslatedDescription] = useState<
    string | null
  >(null);
  const [translatedParagraphs, setTranslatedParagraphs] = useState<
    string[] | null
  >(null);

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
      setTranslatedDescription(
        cached.description_vi ? stripPrefix(cached.description_vi) : null
      );
      setTranslatedParagraphs(filterJunk(cached.paragraphs.map(stripPrefix)));
      setMode("translated");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/news/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: articleUrl }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Translation failed (${res.status})`);
      }

      const data = await res.json();
      const cleanTitle = stripPrefix(data.title_vi || "");
      const cleanDesc = data.description_vi
        ? stripPrefix(data.description_vi)
        : null;
      const cleanParagraphs = filterJunk(
        (data.paragraphs || []).map((p: string) => stripPrefix(p))
      );

      setTranslatedTitle(cleanTitle);
      setTranslatedDescription(cleanDesc);
      setTranslatedParagraphs(cleanParagraphs);
      setMode("translated");

      setCachedTranslation(
        articleUrl,
        cleanTitle,
        cleanParagraphs,
        cleanDesc || undefined
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setLoading(false);
    }
  }, [articleUrl, mode, translatedParagraphs]);

  const isTranslated = mode === "translated";

  const value: TranslateState = {
    mode,
    loading,
    error,
    displayTitle:
      isTranslated && translatedTitle ? translatedTitle : originalTitle,
    displayDescription:
      isTranslated && translatedDescription
        ? translatedDescription
        : originalDescription,
    displayParagraphs:
      isTranslated && translatedParagraphs
        ? translatedParagraphs
        : cleanOriginalParagraphs,
    handleTranslate,
  };

  return <TranslateCtx.Provider value={value}>{children}</TranslateCtx.Provider>;
}

// ─── Header slot: title + description (rendered in hero overlap area) ───────────

export function TranslateHeader({
  originalDescription,
}: {
  originalDescription?: string;
}) {
  const { loading, displayTitle, displayDescription } = useTranslate();

  return (
    <>
      <h1 className="font-inter text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-[1.15] mb-6 max-w-4xl">
        {loading ? (
          <span className="inline-block w-full">
            <span className="block h-10 sm:h-12 bg-stadium-surface/60 animate-pulse mb-3 w-[95%]" />
            <span className="block h-10 sm:h-12 bg-stadium-surface/60 animate-pulse w-[70%]" />
          </span>
        ) : (
          displayTitle
        )}
      </h1>

      {displayDescription && !loading && (
        <blockquote className="font-inter text-lg sm:text-xl text-white/60 leading-relaxed mb-8 pl-5 border-l-4 border-lfc-red italic max-w-3xl">
          {displayDescription}
        </blockquote>
      )}
      {loading && originalDescription && (
        <div className="mb-8 pl-5 border-l-4 border-lfc-red space-y-2 animate-pulse">
          <div className="h-5 bg-stadium-surface/50 w-[90%]" />
          <div className="h-5 bg-stadium-surface/50 w-[75%]" />
        </div>
      )}
    </>
  );
}

// ─── Body slot: toggle button + article paragraphs (rendered in grid) ───────────

export function TranslateBody() {
  const { mode, loading, error, displayParagraphs, handleTranslate } =
    useTranslate();
  const t = useTranslations("News.translate");
  const isTranslated = mode === "translated";

  return (
    <div>
      {/* Toggle button + AI disclaimer */}
      <div className="flex items-center justify-between gap-3 mb-8">
        {isTranslated && (
          <p className="font-inter text-[11px] text-amber-400/70">
            {t("aiDisclaimer")}
          </p>
        )}
        {error && (
          <span className="font-inter text-xs text-red-400">{error}</span>
        )}
        <button
          onClick={handleTranslate}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-1.5 font-barlow text-xs uppercase tracking-wider px-3 py-1.5 border border-stadium-border hover:border-lfc-red/40 bg-stadium-surface text-white/80 hover:text-white transition-all disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Languages className="w-3.5 h-3.5" />
          )}
          {loading
            ? t("translating")
            : isTranslated
              ? t("showOriginal")
              : t("showTranslated")}
        </button>
      </div>

      {/* Article body */}
      <div id="article-body">
        {loading ? (
          <div className="space-y-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2.5 animate-pulse">
                <div className="h-[17px] bg-stadium-surface/40 w-full" />
                <div className="h-[17px] bg-stadium-surface/40 w-[92%]" />
                <div className="h-[17px] bg-stadium-surface/40 w-[78%]" />
                {i < 3 && (
                  <div className="h-[17px] bg-stadium-surface/40 w-[60%]" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {displayParagraphs.map((p, i) => (
              <p
                key={`${mode}-${i}`}
                className={
                  i === 0
                    ? "font-inter text-lg text-white/90 leading-[1.9] font-medium"
                    : "font-inter text-[17px] text-white/80 leading-[1.85]"
                }
              >
                {p}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
