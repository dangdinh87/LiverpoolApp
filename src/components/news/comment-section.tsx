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
        body: JSON.stringify({ url: articleUrl, content: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data.comment]);
        setNewComment("");
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
        setComments((prev) => prev.filter((c) => c.id !== commentId));
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

  return (
    <div className="mt-10 pt-8 border-t border-stadium-border/50">
      <h3 className="font-bebas text-2xl text-white flex items-center gap-2 mb-6">
        <MessageSquareText className="w-5 h-5 text-lfc-red" />
        {t("title")} {comments.length > 0 && t("count", { count: comments.length })}
      </h3>

      {/* Comment form */}
      {userId ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (newComment.trim() && !submitting) handleSubmit(e);
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

      {/* Comments list */}
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
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`group flex gap-3 p-3.5 bg-stadium-surface/40 border border-stadium-border/30 hover:border-stadium-border/60 transition-colors ${
                deletingId === comment.id ? "opacity-50" : ""
              }`}
            >
              {/* Avatar */}
              <div className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 bg-stadium-surface ring-1 ring-stadium-border/50">
                {comment.avatarUrl ? (
                  <Image
                    src={comment.avatarUrl}
                    alt={comment.username}
                    fill
                    className="object-cover"
                    sizes="36px"
                    unoptimized
                  />
                ) : (
                  <Image
                    src="/assets/lfc/crest.webp"
                    alt="LFC"
                    fill
                    className="object-contain p-1.5"
                    sizes="36px"
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
                  {userId === comment.userId && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      disabled={deletingId === comment.id}
                      className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-rose-400 text-stadium-muted cursor-pointer disabled:cursor-not-allowed"
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
                <p className="font-inter text-sm text-white/80 leading-relaxed break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
