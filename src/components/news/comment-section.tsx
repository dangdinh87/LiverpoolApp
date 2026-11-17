"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "@/i18n/navigation";
import {
  MessageSquareText,
  Send,
  LogIn,
  Loader2,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { hasSupabaseSession, loadSupabaseClient } from "@/lib/supabase-lazy";
import { useToast } from "@/stores/toast-store";
import { formatDayMonth } from "@/lib/format-match-date";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CommentItem, InlineReplyForm, type Comment } from "./comment-item";

interface CommentSectionProps {
  articleUrl: string;
  /**
   * How many comments the server render knew about. Most articles have none,
   * and asking the database to confirm that on every page view is the one
   * request this component can avoid entirely. The comments routes revalidate
   * this page when the count changes, so a zero here is a real zero.
   */
  initialCommentCount?: number;
}

export function CommentSection({ articleUrl, initialCommentCount = 0 }: CommentSectionProps) {
  const t = useTranslations("News.comments");
  const locale = useLocale();
  const toast = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(initialCommentCount > 0);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!hasSupabaseSession()) return;
    let cancelled = false;
    loadSupabaseClient()
      .then((supabase) => supabase.auth.getUser())
      .then(({ data: { user } }) => {
        if (!cancelled) setUserId(user?.id ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/news/comments?url=${encodeURIComponent(articleUrl)}`
      );
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [articleUrl]);

  useEffect(() => {
    if (initialCommentCount === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchComments();
  }, [fetchComments, initialCommentCount]);

  function openReply(commentId: string) {
    setReplyingToId(commentId);
    setReplyContent("");
    setTimeout(() => replyInputRef.current?.focus(), 50);
  }

  function closeReply() {
    setReplyingToId(null);
    setReplyContent("");
  }

  function validate(text: string): boolean {
    if (text.length < 2) {
      toast.show({ type: "error", message: t("tooShort") });
      return false;
    }
    if (text.length > 1000) {
      toast.show({ type: "error", message: t("tooLong") });
      return false;
    }
    const lastOwn = [...comments].reverse().find((c) => c.userId === userId);
    if (lastOwn && lastOwn.content === text) {
      toast.show({ type: "error", message: t("duplicate") });
      return false;
    }
    return true;
  }

  async function handleSubmitTop(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (!trimmed || submitting) return;
    if (!validate(trimmed)) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/news/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: articleUrl, content: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data.comment]);
        setNewComment("");
      } else {
        const err = await res.json().catch(() => null);
        toast.show({ type: "error", message: err?.error || t("submitError") });
      }
    } catch {
      toast.show({ type: "error", message: t("submitError") });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitReply(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = replyContent.trim();
    if (!trimmed || submitting || !replyingToId) return;
    if (!validate(trimmed)) return;

    const target = comments.find((c) => c.id === replyingToId);
    if (!target) return;

    const parentId = target.parentId || target.id;

    setSubmitting(true);
    try {
      const res = await fetch("/api/news/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: articleUrl,
          content: trimmed,
          parentId,
          replyToName: target.username,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        data.comment.replyToName = target.username;
        setComments((prev) => [...prev, data.comment]);
        closeReply();
      } else {
        const err = await res.json().catch(() => null);
        toast.show({ type: "error", message: err?.error || t("submitError") });
      }
    } catch {
      toast.show({ type: "error", message: t("submitError") });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete(commentId: string) {
    setConfirmDeleteId(null);
    setDeletingId(commentId);
    try {
      const res = await fetch(
        `/api/news/comments?id=${commentId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId && c.parentId !== commentId));
        if (replyingToId === commentId) closeReply();
      } else {
        toast.show({ type: "error", message: t("deleteError") });
      }
    } catch {
      toast.show({ type: "error", message: t("deleteError") });
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return t("justNow");
    if (diffMin < 60) return t("minutesAgo", { n: diffMin });
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return t("hoursAgo", { n: diffH });
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return t("daysAgo", { n: diffD });
    return formatDayMonth(date, locale === "vi" ? "vi" : "en");
  }

  const repliesByParent = new Map<string, Comment[]>();
  for (const c of comments) {
    if (c.parentId) {
      const arr = repliesByParent.get(c.parentId) || [];
      arr.push(c);
      repliesByParent.set(c.parentId, arr);
    }
  }

  const topLevel = comments
    .filter((c) => !c.parentId)
    .sort((a, b) => {
      const repliesA = repliesByParent.get(a.id)?.length ?? 0;
      const repliesB = repliesByParent.get(b.id)?.length ?? 0;
      if (repliesB !== repliesA) return repliesB - repliesA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const renderInlineReply = (targetId: string) => {
    if (replyingToId !== targetId || !userId) return null;
    const target = comments.find((c) => c.id === targetId);
    return (
      <InlineReplyForm
        targetUsername={target?.username || ""}
        replyContent={replyContent}
        submitting={submitting}
        inputRef={replyInputRef}
        onChange={setReplyContent}
        onSubmit={handleSubmitReply}
        onClose={closeReply}
        t={t}
      />
    );
  };

  return (
    <section aria-labelledby="comments-title" className="mt-12 border-t border-[var(--line)] pt-8">
      <AlertDialog
        open={confirmDeleteId !== null}
        onOpenChange={(v) => { if (!v) setConfirmDeleteId(null); }}
      >
        <AlertDialogContent className="bg-stadium-surface border-stadium-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-bebas text-2xl tracking-wider">
              {t("delete")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-stadium-muted font-inter">
              {t("deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 bg-stadium-surface2 border-stadium-border text-white hover:bg-stadium-surface hover:text-white cursor-pointer">
              {t("deleteCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteId && handleConfirmDelete(confirmDeleteId)}
              className="min-h-11 bg-lfc-red hover:bg-lfc-red-dark text-white cursor-pointer"
            >
              {t("deleteAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <h2 id="comments-title" className="mb-6 flex items-center gap-2 font-bebas text-3xl leading-none text-white">
        <MessageSquareText className="size-6 text-lfc-red" aria-hidden />
        {t("title")} {comments.length > 0 && <span className="tabular-nums">{t("count", { count: comments.length })}</span>}
      </h2>

      {userId ? (
        <form onSubmit={handleSubmitTop} className="mb-8">
          <div className="flex gap-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (newComment.trim() && !submitting) handleSubmitTop(e);
                }
              }}
              placeholder={t("placeholder")}
              aria-label={t("placeholder")}
              maxLength={1000}
              rows={2}
              disabled={submitting}
              className="flex-1 min-w-0 border border-[var(--line-strong)] bg-[var(--surface-1)] px-4 py-3 text-base text-white placeholder:text-stadium-muted resize-none focus:outline-none focus:border-white/50 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="self-end size-11 bg-lfc-red text-white hover:bg-lfc-red-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer shrink-0"
              aria-label={t("send")}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-stadium-muted">
            {t("charCount", { n: newComment.length })}
          </p>
        </form>
      ) : (
        <div className="surface mb-8 p-5 text-center">
          <p className="mb-3 text-[15px] text-stadium-muted">
            {t("login")}
          </p>
          <Link
            href="/auth/login"
            className="inline-flex min-h-11 items-center gap-2 bg-lfc-red px-5 font-barlow text-sm font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-lfc-red-dark"
          >
            <LogIn className="w-3.5 h-3.5" />
            {t("loginBtn")}
          </Link>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} aria-hidden className="flex gap-3">
              <div className="skeleton size-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="surface px-4 py-8 text-center text-[15px] text-stadium-muted">
          {t("empty")}
        </p>
      ) : (
        <div className="space-y-1">
          {topLevel.map((comment) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                userId={userId}
                deletingId={deletingId}
                onDelete={setConfirmDeleteId}
                onReply={() => openReply(comment.id)}
                formatDate={formatDate}
                t={t}
              />
              {renderInlineReply(comment.id)}

              {repliesByParent.has(comment.id) && (
                <div className="ml-[42px] border-l-2 border-lfc-red/25 pl-3 space-y-0.5 mt-0.5">
                  {repliesByParent.get(comment.id)!.map((reply) => (
                    <div key={reply.id}>
                      <CommentItem
                        comment={reply}
                        userId={userId}
                        deletingId={deletingId}
                        onDelete={setConfirmDeleteId}
                        onReply={() => openReply(reply.id)}
                        formatDate={formatDate}
                        isReply
                        t={t}
                      />
                      {renderInlineReply(reply.id)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
