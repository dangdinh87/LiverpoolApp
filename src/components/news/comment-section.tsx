"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MessageSquareText,
  Send,
  Trash2,
  LogIn,
  Loader2,
  Reply,
  X,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase";

interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  username: string;
  avatarUrl: string | null;
  parentId: string | null;
}

interface CommentSectionProps {
  articleUrl: string;
}

export function CommentSection({ articleUrl }: CommentSectionProps) {
  const t = useTranslations("News.comments");
  const locale = useLocale();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/news/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: articleUrl,
          content: trimmed,
          ...(replyTo ? { parentId: replyTo.id } : {}),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data.comment]);
        setNewComment("");
        setReplyTo(null);
      }
    } catch {
      // silent
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
        // Remove comment and its replies
        setComments((prev) => prev.filter((c) => c.id !== commentId && c.parentId !== commentId));
        if (replyTo?.id === commentId) setReplyTo(null);
      }
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
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

  // Build threaded structure: top-level + replies grouped by parentId
  const topLevel = comments.filter((c) => !c.parentId);
  const repliesByParent = new Map<string, Comment[]>();
  for (const c of comments) {
    if (c.parentId) {
      const arr = repliesByParent.get(c.parentId) || [];
      arr.push(c);
      repliesByParent.set(c.parentId, arr);
    }
  }

  return (
    <div className="mt-10 pt-8 border-t border-stadium-border/50">
      <h3 className="font-bebas text-2xl text-white flex items-center gap-2 mb-6">
        <MessageSquareText className="w-5 h-5 text-lfc-red" />
        {t("title")} {comments.length > 0 && t("count", { count: comments.length })}
      </h3>

      {/* Comment form */}
      {userId ? (
        <form onSubmit={handleSubmit} className="mb-8">
          {/* Reply indicator */}
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-stadium-surface/60 border-l-2 border-lfc-red">
              <Reply className="w-3.5 h-3.5 text-lfc-red shrink-0" />
              <span className="font-inter text-xs text-white/60 truncate">
                {t("replyingTo", { name: replyTo.username })}
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="ml-auto p-0.5 text-stadium-muted hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex gap-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (newComment.trim() && !submitting) handleSubmit(e);
                }
                if (e.key === "Escape" && replyTo) {
                  setReplyTo(null);
                }
              }}
              placeholder={replyTo ? t("replyPlaceholder") : t("placeholder")}
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
        <div className="space-y-3">
          {topLevel.map((comment) => (
            <div key={comment.id}>
              <CommentCard
                comment={comment}
                userId={userId}
                deletingId={deletingId}
                onDelete={handleDelete}
                onReply={() => setReplyTo(comment)}
                formatDate={formatDate}
                t={t}
              />
              {/* Replies — indented */}
              {repliesByParent.has(comment.id) && (
                <div className="ml-8 sm:ml-12 mt-1.5 space-y-1.5 border-l-2 border-stadium-border/30 pl-3">
                  {repliesByParent.get(comment.id)!.map((reply) => (
                    <CommentCard
                      key={reply.id}
                      comment={reply}
                      userId={userId}
                      deletingId={deletingId}
                      onDelete={handleDelete}
                      onReply={() => setReplyTo(reply)}
                      formatDate={formatDate}
                      isReply
                      t={t}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Single comment card ---
function CommentCard({
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
  return (
    <div
      className={`group flex gap-3 p-3.5 bg-stadium-surface/40 border border-stadium-border/30 hover:border-stadium-border/60 transition-colors ${
        deletingId === comment.id ? "opacity-50" : ""
      } ${isReply ? "py-2.5" : ""}`}
    >
      {/* Avatar */}
      <div className={`relative rounded-full overflow-hidden shrink-0 bg-stadium-surface ring-1 ring-stadium-border/50 ${isReply ? "w-7 h-7" : "w-9 h-9"}`}>
        {comment.avatarUrl ? (
          <Image
            src={comment.avatarUrl}
            alt={comment.username}
            fill
            className="object-cover"
            sizes={isReply ? "28px" : "36px"}
            unoptimized
          />
        ) : (
          <Image
            src="/assets/lfc/crest.webp"
            alt="LFC"
            fill
            className="object-contain p-1.5"
            sizes={isReply ? "28px" : "36px"}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-barlow text-xs text-white font-semibold tracking-wide">
            {comment.username}
          </span>
          <span className="font-inter text-[10px] text-stadium-muted">
            {formatDate(comment.createdAt)}
          </span>
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Reply button */}
            {userId && (
              <button
                onClick={onReply}
                className="p-1 text-stadium-muted hover:text-lfc-red transition-colors cursor-pointer"
                aria-label={t("reply")}
                title={t("reply")}
              >
                <Reply className="w-3 h-3" />
              </button>
            )}
            {/* Delete button (own comments only) */}
            {userId === comment.userId && (
              <button
                onClick={() => onDelete(comment.id)}
                disabled={deletingId === comment.id}
                className="p-1 hover:text-rose-400 text-stadium-muted cursor-pointer disabled:cursor-not-allowed"
                aria-label={t("deleteConfirm")}
              >
                {deletingId === comment.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        </div>
        <p className={`font-inter text-white/80 leading-relaxed break-words ${isReply ? "text-[13px]" : "text-sm"}`}>
          {comment.content}
        </p>
      </div>
    </div>
  );
}
