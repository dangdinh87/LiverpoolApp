"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MessageSquareText,
  Send,
  Trash2,
  LogIn,
  Loader2,
  X,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase";
import { useToast } from "@/stores/toast-store";
import { formatDayMonth } from "@/lib/format-match-date";

interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  username: string;
  avatarUrl: string | null;
  parentId: string | null;
  /** Username being replied to (for nested replies within a thread) */
  replyToName?: string;
}

interface CommentSectionProps {
  articleUrl: string;
}

export function CommentSection({ articleUrl }: CommentSectionProps) {
  const t = useTranslations("News.comments");
  const locale = useLocale();
  const toast = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  // Top-level comment input
  const [newComment, setNewComment] = useState("");
  // Inline reply state: which comment id has the reply form open
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
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
    fetchComments();
  }, [fetchComments]);

  // Open inline reply form for a specific comment
  function openReply(commentId: string) {
    setReplyingToId(commentId);
    setReplyContent("");
    // Focus after render
    setTimeout(() => replyInputRef.current?.focus(), 50);
  }

  function closeReply() {
    setReplyingToId(null);
    setReplyContent("");
  }

  // Validate: min 2 chars, no duplicate of last comment
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

  // Submit top-level comment
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

  // Submit inline reply
  async function handleSubmitReply(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = replyContent.trim();
    if (!trimmed || submitting || !replyingToId) return;
    if (!validate(trimmed)) return;

    // Find the comment being replied to
    const target = comments.find((c) => c.id === replyingToId);
    if (!target) return;

    // Replies always nest under the top-level parent
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
          // Store which username this reply is directed at
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

  async function handleDelete(commentId: string) {
    if (!window.confirm(t("deleteConfirm"))) return;

    setDeletingId(commentId);
    try {
      const res = await fetch(
        `/api/news/comments?id=${commentId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId && c.parentId !== commentId));
        if (replyingToId === commentId) closeReply();
      }
    } catch {
      // silent
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

  // Thread structure — replies grouped by parent (chronological within thread)
  const repliesByParent = new Map<string, Comment[]>();
  for (const c of comments) {
    if (c.parentId) {
      const arr = repliesByParent.get(c.parentId) || [];
      arr.push(c);
      repliesByParent.set(c.parentId, arr);
    }
  }
  // Top-level: most replies first, then newest first
  const topLevel = comments
    .filter((c) => !c.parentId)
    .sort((a, b) => {
      const repliesA = repliesByParent.get(a.id)?.length ?? 0;
      const repliesB = repliesByParent.get(b.id)?.length ?? 0;
      if (repliesB !== repliesA) return repliesB - repliesA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Inline reply form component
  const renderInlineReply = (targetId: string) => {
    if (replyingToId !== targetId || !userId) return null;
    const target = comments.find((c) => c.id === targetId);

    return (
      <form onSubmit={handleSubmitReply} className="mt-1 pl-[42px] pr-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs text-stadium-muted">
            {t("replyingTo", { name: target?.username || "" })}
          </span>
          <button
            type="button"
            onClick={closeReply}
            className="inline-flex size-8 items-center justify-center text-stadium-muted hover:text-white transition-colors cursor-pointer"
            aria-label={t("cancel")}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="flex gap-2">
          <textarea
            ref={replyInputRef}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (replyContent.trim() && !submitting) handleSubmitReply(e);
              }
              if (e.key === "Escape") closeReply();
            }}
            placeholder={t("replyPlaceholder")}
            aria-label={t("replyPlaceholder")}
            maxLength={1000}
            rows={1}
            disabled={submitting}
            className="flex-1 min-w-0 border border-[var(--line-strong)] bg-[var(--surface-1)] px-3 py-2 text-base text-white placeholder:text-stadium-muted resize-none focus:outline-none focus:border-white/50 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!replyContent.trim() || submitting}
            className="self-end size-11 bg-lfc-red text-white hover:bg-lfc-red-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer shrink-0"
            aria-label={t("send")}
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </form>
    );
  };

  return (
    <section aria-labelledby="comments-title" className="mt-12 border-t border-[var(--line)] pt-8">
      <h2 id="comments-title" className="mb-6 flex items-center gap-2 font-bebas text-3xl leading-none text-white">
        <MessageSquareText className="size-6 text-lfc-red" aria-hidden />
        {t("title")} {comments.length > 0 && t("count", { count: comments.length })}
      </h2>

      {/* Top-level comment form */}
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

      {/* Comments list — threaded */}
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
              {/* Parent comment */}
              <CommentItem
                comment={comment}
                userId={userId}
                deletingId={deletingId}
                onDelete={handleDelete}
                onReply={() => openReply(comment.id)}
                formatDate={formatDate}
                t={t}
              />
              {renderInlineReply(comment.id)}

              {/* Replies */}
              {repliesByParent.has(comment.id) && (
                <div className="ml-[42px] border-l-2 border-lfc-red/25 pl-3 space-y-0.5 mt-0.5">
                  {repliesByParent.get(comment.id)!.map((reply) => (
                    <div key={reply.id}>
                      <CommentItem
                        comment={reply}
                        userId={userId}
                        deletingId={deletingId}
                        onDelete={handleDelete}
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

// --- Single comment item ---
function CommentItem({
  comment,
  userId,
  deletingId,
  onDelete,
  onReply,
  formatDate,
  isReply,
  t,
}: {
  comment: Comment;
  userId: string | null;
  deletingId: string | null;
  onDelete: (id: string) => void;
  onReply: () => void;
  formatDate: (d: string) => string;
  isReply?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  const isDeleting = deletingId === comment.id;

  return (
    <div
      className={`flex gap-2.5 py-3 px-1 sm:px-3 hover:bg-white/[0.03] transition-colors group ${
        isDeleting ? "opacity-50" : ""
      }`}
    >
      {/* Avatar */}
      <div className={`relative rounded-full overflow-hidden shrink-0 bg-stadium-surface ring-1 ring-stadium-border/40 ${isReply ? "w-6 h-6" : "w-8 h-8"}`}>
        {comment.avatarUrl ? (
          <Image
            src={comment.avatarUrl}
            alt={comment.username}
            fill
            className="object-cover"
            sizes={isReply ? "24px" : "32px"}
            unoptimized
          />
        ) : (
          <Image
            src="/assets/lfc/crest.webp"
            alt="LFC"
            fill
            className="object-contain p-1"
            sizes={isReply ? "24px" : "32px"}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Username + content on same line for compact look */}
        <p className="text-[15px] leading-relaxed text-white/90 break-words">
          <span className="font-semibold text-white mr-1.5">
            {comment.username}
          </span>
          {/* Show @mention for reply-to-reply */}
          {comment.replyToName && (
            <span className="text-brand font-medium mr-1">
              @{comment.replyToName}
            </span>
          )}
          {comment.content}
        </p>

        {/* Meta row: time · reply · delete */}
        <div className="flex items-center gap-1 mt-0.5">
          <span className="mr-2 text-xs text-stadium-muted">
            {formatDate(comment.createdAt)}
          </span>
          {userId && (
            <button
              onClick={onReply}
              className="inline-flex min-h-9 items-center px-2 text-xs font-medium text-stadium-muted hover:text-white transition-colors cursor-pointer"
            >
              {t("reply")}
            </button>
          )}
          {userId === comment.userId && (
            <button
              onClick={() => onDelete(comment.id)}
              disabled={isDeleting}
              aria-label={t("delete")}
              className="inline-flex size-9 items-center justify-center text-stadium-muted hover:text-rose-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-4" aria-hidden />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
