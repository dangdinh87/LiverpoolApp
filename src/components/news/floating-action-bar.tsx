"use client";

import { useState, useEffect, useRef } from "react";
import { Heart, Bookmark, Share2, Check, Languages, ArrowUp } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/stores/toast-store";
import { useTranslations } from "next-intl";
import { toggleSavedArticle } from "@/app/actions/profile";
import {
  getSavedArticles as getLocalSaved,
  toggleSave as toggleLocalSave,
} from "@/lib/news/read-history";
import { useScrollDirection } from "@/hooks/use-scroll-direction";

interface FloatingActionBarProps {
  articleUrl: string;
  articleTitle: string;
  articleSlugUrl: string;
  articleMeta?: {
    snippet?: string;
    thumbnail?: string;
    source?: string;
    language?: string;
    publishedAt?: string;
  };
  /** EN articles: provide translate handler + mode from TranslateProvider */
  isEnglish?: boolean;
  onTranslate?: () => void;
  translateMode?: "original" | "translated";
}

export function FloatingActionBar({
  articleUrl,
  articleTitle,
  articleSlugUrl,
  articleMeta,
  isEnglish,
  onTranslate,
  translateMode,
}: FloatingActionBarProps) {
  const t = useTranslations("News.actions");
  const { show: showToast } = useToast();
  const user = useAuthStore((s) => s.user);
  const scrollDirection = useScrollDirection();

  // ─── Action state (independent from sidebar — lightweight duplicate) ─────
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(() => getLocalSaved().has(articleUrl));
  const [shared, setShared] = useState(false);

  // ─── Hide when comment section is visible ─────
  const [nearComments, setNearComments] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    fetch(`/api/news/like?url=${encodeURIComponent(articleUrl)}`)
      .then((r) => r.json())
      .then((data) => { setLikeCount(data.count); setLiked(data.userLiked); })
      .catch(() => {});

    fetch(`/api/saved-articles/check?url=${encodeURIComponent(articleUrl)}`)
      .then((r) => r.json())
      .then((data) => { if (data.saved) setSaved(true); })
      .catch(() => {});
  }, [articleUrl]);

  // Observe comment section to auto-hide FAB
  useEffect(() => {
    const target = document.getElementById("comment-section");
    if (!target) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => setNearComments(entry.isIntersecting),
      { rootMargin: "0px" }
    );
    observerRef.current.observe(target);

    return () => observerRef.current?.disconnect();
  }, []);

  // ─── Handlers ─────
  async function handleLike() {
    if (!user) { showToast({ type: "error", message: t("loginRequired") }); return; }

    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((prev) => prev + (wasLiked ? -1 : 1));

    try {
      const res = await fetch("/api/news/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: articleUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        setLikeCount(data.count);
        setLiked(data.userLiked);
      } else {
        setLiked(wasLiked);
        setLikeCount((prev) => prev + (wasLiked ? 1 : -1));
      }
    } catch {
      setLiked(wasLiked);
      setLikeCount((prev) => prev + (wasLiked ? 1 : -1));
    }
  }

  async function handleSave() {
    if (!user) { showToast({ type: "error", message: t("loginRequired") }); return; }

    const wasSaved = saved;
    setSaved(!wasSaved);
    toggleLocalSave(articleUrl);

    try {
      const result = await toggleSavedArticle({
        url: articleUrl,
        title: articleTitle,
        snippet: articleMeta?.snippet,
        thumbnail: articleMeta?.thumbnail,
        source: articleMeta?.source,
        language: articleMeta?.language,
        publishedAt: articleMeta?.publishedAt,
      });

      if (result.error && result.error !== "Not authenticated") {
        setSaved(wasSaved);
        toggleLocalSave(articleUrl);
      } else if (!result.error) {
        showToast({
          type: "success",
          message: wasSaved ? t("articleUnsaved") : t("articleSaved"),
        });
      }
    } catch {
      // Keep localStorage state
    }
  }

  async function handleShare() {
    const fullUrl = `${window.location.origin}${articleSlugUrl}`;
    if (navigator.share) {
      try { await navigator.share({ title: articleTitle, url: fullUrl }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(fullUrl);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  }

  // ─── Visibility: hide on scroll down, hide near comments ─────
  const isHidden = scrollDirection === "down" || nearComments;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[60] lg:hidden transition-transform duration-300 ${
        isHidden ? "translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="bg-stadium-surface/95 backdrop-blur-md border-t border-stadium-border px-4 py-2.5">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {/* Like */}
          <button onClick={handleLike} className="flex flex-col items-center gap-0.5 p-1.5 cursor-pointer" aria-label={t("like")}>
            <Heart className={`w-5 h-5 transition-all ${liked ? "text-rose-500 fill-rose-500" : "text-white/50"}`} />
            <span className={`font-barlow text-[9px] uppercase tracking-wider ${liked ? "text-rose-400" : "text-white/40"}`}>
              {likeCount > 0 ? likeCount : t("like")}
            </span>
          </button>

          {/* Save */}
          <button onClick={handleSave} className="flex flex-col items-center gap-0.5 p-1.5 cursor-pointer" aria-label={saved ? t("unsave") : t("save")}>
            <Bookmark className={`w-5 h-5 transition-all ${saved ? "text-amber-400 fill-amber-400" : "text-white/50"}`} />
            <span className={`font-barlow text-[9px] uppercase tracking-wider ${saved ? "text-amber-400" : "text-white/40"}`}>
              {saved ? t("saved") : t("save")}
            </span>
          </button>

          {/* Share */}
          <button onClick={handleShare} className="flex flex-col items-center gap-0.5 p-1.5 cursor-pointer" aria-label={t("share")}>
            {shared ? (
              <Check className="w-5 h-5 text-green-400" />
            ) : (
              <Share2 className="w-5 h-5 text-white/50" />
            )}
            <span className={`font-barlow text-[9px] uppercase tracking-wider ${shared ? "text-green-400" : "text-white/40"}`}>
              {shared ? t("copied") : t("share")}
            </span>
          </button>

          {/* Translate (EN articles only) */}
          {isEnglish && onTranslate && (
            <button onClick={onTranslate} className="flex flex-col items-center gap-0.5 p-1.5 cursor-pointer" aria-label="Translate">
              <Languages className={`w-5 h-5 transition-all ${translateMode === "translated" ? "text-lfc-red" : "text-white/50"}`} />
              <span className={`font-barlow text-[9px] uppercase tracking-wider ${translateMode === "translated" ? "text-lfc-red" : "text-white/40"}`}>
                {translateMode === "translated" ? "EN" : "VI"}
              </span>
            </button>
          )}

          {/* Scroll to top */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex flex-col items-center gap-0.5 p-1.5 cursor-pointer"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-5 h-5 text-white/50" />
            <span className="font-barlow text-[9px] uppercase tracking-wider text-white/40">TOP</span>
          </button>
        </div>
      </div>
    </div>
  );
}
