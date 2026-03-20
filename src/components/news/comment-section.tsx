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
  ChevronDown,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase";
import { useToast } from "@/stores/toast-store";

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
    return date.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-GB", {
      day: "numeric",
      month: "short",
    });
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
          <span className="font-inter text-[11px] text-white/40">
            {t("replyingTo", { name: target?.username || "" })}
          </span>
          <button
            type="button"
            onClick={closeReply}
            className="p-0.5 text-stadium-muted hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
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
            maxLength={1000}
            rows={1}
            disabled={submitting}
            className="flex-1 bg-stadium-surface border border-stadium-border/60 px-3 py-1.5 font-inter text-[13px] text-white placeholder:text-stadium-muted resize-none focus:outline-none focus:border-lfc-red/50 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!replyContent.trim() || submitting}
            className="self-end h-8 w-8 bg-lfc-red text-white hover:bg-lfc-red/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer shrink-0"
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

  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-10 pt-8 border-t border-stadium-border/50">
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="comment-content"
        className="w-full flex items-center justify-between mb-4 cursor-pointer group"
      >
        <h3 className="font-bebas text-2xl text-white flex items-center gap-2">
          <MessageSquareText className="w-5 h-5 text-lfc-red" />
          {t("title")}
          {comments.length > 0 && (
            <span className="font-inter text-sm font-normal text-stadium-muted ml-1">
              ({comments.length})
            </span>
          )}
        </h3>
        <ChevronDown className={`w-5 h-5 text-stadium-muted transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* Collapsible content */}
      <div
        id="comment-content"
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">

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
              maxLength={1000}
              rows={2}
              disabled={submitting}
              className="flex-1 bg-stadium-surface border border-stadium-border px-4 py-3 font-inter text-sm text-white placeholder:text-stadium-muted resize-none focus:outline-none focus:border-lfc-red/50 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="self-end h-10 w-10 bg-lfc-red text-white hover:bg-lfc-red/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer shrink-0"
              aria-label={t("send")}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="font-inter text-[10px] text-stadium-muted mt-1.5">
            {t("charCount", { n: newComment.length })}
          </p>
        </form>
      ) : (
        <div className="mb-8 p-5 bg-stadium-surface/60 border border-stadium-border/50 text-center">
          <p className="font-inter text-sm text-stadium-muted mb-3">
            {t("login")}
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 font-barlow text-sm text-white bg-lfc-red px-4 py-2 hover:bg-lfc-red/80 transition-colors uppercase tracking-wider"
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
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-stadium-surface shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-stadium-surface" />
                <div className="h-4 w-3/4 bg-stadium-surface" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="font-inter text-sm text-stadium-muted text-center py-8">
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

        </div>{/* end overflow-hidden */}
      </div>{/* end collapsible grid */}
    </div>
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
      className={`flex gap-2.5 py-2.5 px-3 hover:bg-stadium-surface/30 transition-colors group ${
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
        <p className={`font-inter text-white/85 leading-relaxed break-words ${isReply ? "text-[13px]" : "text-sm"}`}>
          <span className="font-semibold text-white mr-1.5">
            {comment.username}
          </span>
          {/* Show @mention for reply-to-reply */}
          {comment.replyToName && (
            <span className="text-lfc-red font-medium mr-1">
              @{comment.replyToName}
            </span>
          )}
          {comment.content}
        </p>

        {/* Meta row: time · reply · delete */}
        <div className="flex items-center gap-3 mt-0.5">
          <span className="font-inter text-[10px] text-stadium-muted">
            {formatDate(comment.createdAt)}
          </span>
          {userId && (
            <button
              onClick={onReply}
              className="opacity-0 group-hover:opacity-100 transition-opacity font-inter text-[11px] text-stadium-muted hover:text-lfc-red cursor-pointer font-medium"
            >
              {t("reply")}
            </button>
          )}
          {userId === comment.userId && (
            <button
              onClick={() => onDelete(comment.id)}
              disabled={isDeleting}
              className="opacity-0 group-hover:opacity-100 transition-opacity font-inter text-[11px] text-stadium-muted hover:text-rose-400 cursor-pointer disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <Loader2 className="w-3 h-3 animate-spin inline" />
              ) : (
                <Trash2 className="w-3 h-3 inline" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
