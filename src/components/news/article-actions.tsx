"use client";

import { useState, useEffect } from "react";
import { Heart, Bookmark, Share2, ExternalLink, Check, LogIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toggleSavedArticle } from "@/app/actions/profile";
import { useToast } from "@/stores/toast-store";
import { useAuthStore } from "@/stores/auth-store";
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
import {
  getSavedArticles as getLocalSaved,
  toggleSave as toggleLocalSave,
} from "@/lib/news/read-history";

/** Equal-width, 44px-tall action button (Like / Save / Share / Original). */
const ACTION_CLASS =
  "inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 border border-[var(--line-strong)] bg-[var(--surface-1)] px-1 font-barlow text-xs font-semibold uppercase tracking-[0.04em] text-stadium-muted transition-colors hover:border-white/40 hover:text-white disabled:opacity-60 cursor-pointer";

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
  const t = useTranslations("News.actions");
  const tp = useTranslations("Profile");
  const { show: showToast } = useToast();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [shared, setShared] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

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
    if (!user) { setShowLoginPrompt(true); return; }
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

  async function doSaveToggle() {
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
      } else {
        showToast({
          type: "success",
          message: wasSaved ? t("articleUnsaved") : t("articleSaved"),
        });
      }
    } catch {
      // Keep localStorage state, don't revert
    } finally {
      setSaveLoading(false);
    }
  }

  function handleSave() {
    if (!user) { setShowLoginPrompt(true); return; }
    if (saved) {
      setShowConfirm(true);
    } else {
      doSaveToggle();
    }
  }

  async function handleShare() {
    const fullUrl = `${window.location.origin}${articleSlugUrl}`;
    // Web Share on phones; copy the link where it is missing (desktop) or fails.
    if (navigator.share) {
      try {
        await navigator.share({ title: articleTitle, url: fullUrl });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return; // user cancelled
      }
    }
    try {
      await navigator.clipboard.writeText(fullUrl);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // Clipboard blocked (insecure context / permissions): nothing more to do.
    }
  }

  return (
    <>
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
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
              {tp("cancelAction")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setShowConfirm(false); doSaveToggle(); }}
              className="bg-lfc-red hover:bg-lfc-red/80 text-white cursor-pointer"
            >
              {tp("confirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <AlertDialogContent className="bg-stadium-surface border-stadium-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-bebas text-2xl tracking-wider flex items-center gap-2">
              <LogIn size={20} className="text-brand" />
              {t("loginRequired")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-stadium-muted font-inter">
              {t("loginRequiredDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-stadium-surface2 border-stadium-border text-white hover:bg-stadium-surface hover:text-white cursor-pointer">
              {tp("cancelAction")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setShowLoginPrompt(false); router.push("/auth/login"); }}
              className="bg-lfc-red hover:bg-lfc-red/80 text-white cursor-pointer"
            >
              {tp("loginAction") || "Log in"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div role="group" aria-label={t("actionsLabel")} className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={handleLike}
          aria-pressed={liked}
          aria-label={t("like")}
          className={`${ACTION_CLASS} ${liked ? "border-rose-500/60 text-rose-400" : ""}`}
        >
          <Heart className={`size-4 shrink-0 ${liked ? "fill-rose-500 text-rose-500" : ""}`} aria-hidden />
          <span className="truncate">{likeCount > 0 ? likeCount : t("like")}</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saveLoading}
          aria-pressed={saved}
          aria-label={saved ? t("unsave") : t("save")}
          className={`${ACTION_CLASS} ${saved ? "border-amber-400/60 text-amber-300" : ""}`}
        >
          <Bookmark className={`size-4 shrink-0 ${saved ? "fill-amber-400 text-amber-400" : ""}`} aria-hidden />
          <span className="truncate">{saved ? t("saved") : t("save")}</span>
        </button>

        <button type="button" onClick={handleShare} aria-label={t("share")} className={ACTION_CLASS}>
          {shared ? <Check className="size-4 shrink-0 text-green-400" aria-hidden /> : <Share2 className="size-4 shrink-0" aria-hidden />}
          <span className="truncate" aria-live="polite">{shared ? t("copied") : t("share")}</span>
        </button>

        <a href={articleUrl} target="_blank" rel="noopener noreferrer" className={ACTION_CLASS}>
          <ExternalLink className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{t("original")}</span>
        </a>
      </div>
    </>
  );
}
