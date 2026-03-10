"use client";

import { useState, useEffect } from "react";
import { Heart, Bookmark, Share2, ExternalLink, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { toggleSavedArticle } from "@/app/actions/profile";
import {
  getSavedArticles as getLocalSaved,
  toggleSave as toggleLocalSave,
} from "@/lib/news/read-history";

interface ArticleActionsProps {
  articleUrl: string;
  articleTitle: string;
  articleSlugUrl: string;
  /** Optional metadata for DB save */
  articleMeta?: {
    snippet?: string;
    thumbnail?: string;
    source?: string;
    language?: string;
    publishedAt?: string;
  };
}

export function ArticleActions({
  articleUrl,
  articleTitle,
  articleSlugUrl,
  articleMeta,
}: ArticleActionsProps) {
  const t = useTranslations("Profile");
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [shared, setShared] = useState(false);

  // Fetch like state from DB + saved state from localStorage
  useEffect(() => {
    setSaved(getLocalSaved().has(articleUrl));

    fetch(`/api/news/like?url=${encodeURIComponent(articleUrl)}`)
      .then((r) => r.json())
      .then((data) => {
        setLikeCount(data.count);
        setLiked(data.userLiked);
      })
      .catch(() => {});

    // Check DB saved state
    fetch(`/api/saved-articles/check?url=${encodeURIComponent(articleUrl)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.saved) setSaved(true);
      })
      .catch(() => {});
  }, [articleUrl]);

  async function handleLike() {
    if (likeLoading) return;
    setLikeLoading(true);

    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((prev) => prev + (wasLiked ? -1 : 1));

    try {
      const res = await fetch("/api/news/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: articleUrl }),
      });

      if (res.status === 401) {
        setLiked(wasLiked);
        setLikeCount((prev) => prev + (wasLiked ? 1 : -1));
      } else if (res.ok) {
        const data = await res.json();
        setLikeCount(data.count);
        setLiked(data.userLiked);
      }
    } catch {
      setLiked(wasLiked);
      setLikeCount((prev) => prev + (wasLiked ? 1 : -1));
    } finally {
      setLikeLoading(false);
    }
  }

  async function handleSave() {
    if (saveLoading) return;
    setSaveLoading(true);

    const wasSaved = saved;
    setSaved(!wasSaved);

    // Always keep localStorage in sync
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

      if (result.error) {
        // If not authenticated, localStorage save is enough
        if (result.error === "Not authenticated") return;
        // Revert on real error
        setSaved(wasSaved);
        toggleLocalSave(articleUrl);
      }
    } catch {
      // Keep localStorage state, don't revert
    } finally {
      setSaveLoading(false);
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

  return (
    <div className="bg-stadium-surface border border-stadium-border p-4">
      <div className="flex items-center justify-between">
        {/* Like */}
        <button
          onClick={handleLike}
          className="group flex flex-col items-center gap-1 cursor-pointer"
          aria-label={liked ? "Unlike" : "Like"}
        >
          <div className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${liked ? "bg-rose-500/20" : "hover:bg-white/10"}`}>
            <Heart
              className={`w-[18px] h-[18px] transition-all ${liked ? "text-rose-500 fill-rose-500 scale-110" : "text-white/50 group-hover:text-rose-400"}`}
            />
          </div>
          <span className={`font-barlow text-[9px] uppercase tracking-wider ${liked ? "text-rose-400" : "text-white/40"}`}>
            {likeCount > 0 ? likeCount : "Like"}
          </span>
        </button>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saveLoading}
          className="group flex flex-col items-center gap-1 cursor-pointer"
          aria-label={saved ? t("unsave") : "Save"}
        >
          <div className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${saved ? "bg-amber-500/20" : "hover:bg-white/10"}`}>
            <Bookmark
              className={`w-[18px] h-[18px] transition-all ${saved ? "text-amber-400 fill-amber-400 scale-110" : "text-white/50 group-hover:text-amber-400"}`}
            />
          </div>
          <span className={`font-barlow text-[9px] uppercase tracking-wider ${saved ? "text-amber-400" : "text-white/40"}`}>
            Save
          </span>
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="group flex flex-col items-center gap-1 cursor-pointer"
          aria-label="Share"
        >
          <div className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${shared ? "bg-green-500/20" : "hover:bg-white/10"}`}>
            {shared ? (
              <Check className="w-[18px] h-[18px] text-green-400" />
            ) : (
              <Share2 className="w-[18px] h-[18px] text-white/50 group-hover:text-sky-400 transition-colors" />
            )}
          </div>
          <span className={`font-barlow text-[9px] uppercase tracking-wider ${shared ? "text-green-400" : "text-white/40"}`}>
            {shared ? "Copied" : "Share"}
          </span>
        </button>

        {/* Original */}
        <a
          href={articleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center gap-1"
        >
          <div className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-all">
            <ExternalLink className="w-[18px] h-[18px] text-white/50 group-hover:text-lfc-red transition-colors" />
          </div>
          <span className="font-barlow text-[9px] uppercase tracking-wider text-white/40">
            Original
          </span>
        </a>
      </div>
    </div>
  );
}
