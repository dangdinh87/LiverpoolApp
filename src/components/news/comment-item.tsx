"use client";

import { useState, type RefObject } from "react";
import Image from "next/image";
import { Loader2, Send, Trash2, User, X } from "lucide-react";
import type { useTranslations } from "next-intl";

export interface Comment {
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

export type CommentTranslations = ReturnType<typeof useTranslations<"News.comments">>;

interface InlineReplyFormProps {
  targetUsername: string;
  replyContent: string;
  submitting: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  t: CommentTranslations;
}

export function InlineReplyForm({
  targetUsername,
  replyContent,
  submitting,
  inputRef,
  onChange,
  onSubmit,
  onClose,
  t,
}: InlineReplyFormProps) {
  return (
    <form onSubmit={onSubmit} aria-busy={submitting} className="mt-1 pl-[42px] pr-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs text-stadium-muted">
          {t("replyingTo", { name: targetUsername })}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-11 items-center justify-center text-stadium-muted hover:text-white transition-colors cursor-pointer"
          aria-label={t("cancel")}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div className="flex gap-2">
        <textarea
          ref={inputRef}
          value={replyContent}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (replyContent.trim() && !submitting) onSubmit(e);
            }
            if (e.key === "Escape") onClose();
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
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          ) : (
            <Send className="w-3.5 h-3.5" aria-hidden />
          )}
        </button>
      </div>
    </form>
  );
}

export function CommentItem({
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
  t: CommentTranslations;
}) {
  const isDeleting = deletingId === comment.id;
  const [avatarFailed, setAvatarFailed] = useState(false);

  return (
    <div
      aria-busy={isDeleting}
      className={`flex gap-2.5 py-3 px-1 sm:px-3 hover:bg-white/[0.03] transition-colors group ${
        isDeleting ? "opacity-50" : ""
      }`}
    >
      {/* Avatar — neutral User icon fallback (never the club crest) */}
      <div className={`relative rounded-full overflow-hidden shrink-0 bg-stadium-surface2 ring-1 ring-stadium-border/60 ${isReply ? "w-6 h-6" : "w-8 h-8"}`}>
        {comment.avatarUrl && !avatarFailed ? (
          <Image
            src={comment.avatarUrl}
            alt=""
            fill
            className="object-cover"
            sizes={isReply ? "24px" : "32px"}
            referrerPolicy="no-referrer"
            onError={() => setAvatarFailed(true)}
            unoptimized
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-stadium-muted" aria-hidden>
            <User size={isReply ? 13 : 16} />
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] leading-relaxed text-white/90 break-words">
          <span className="font-semibold text-white mr-1.5">
            {comment.username}
          </span>
          {comment.replyToName && (
            <span className="text-brand font-medium mr-1">
              @{comment.replyToName}
            </span>
          )}
          {comment.content}
        </p>

        {/* Meta row: time · reply · delete (>=44px touch targets) */}
        <div className="flex items-center gap-1 mt-0.5">
          <span className="mr-2 text-xs text-stadium-muted tabular-nums">
            {formatDate(comment.createdAt)}
          </span>
          {userId && (
            <button
              type="button"
              onClick={onReply}
              className="inline-flex min-h-11 items-center px-2.5 text-xs font-medium text-stadium-muted hover:text-white transition-colors cursor-pointer"
            >
              {t("reply")}
            </button>
          )}
          {userId === comment.userId && (
            <button
              type="button"
              onClick={() => onDelete(comment.id)}
              disabled={isDeleting}
              aria-label={t("delete")}
              className="inline-flex size-11 items-center justify-center text-stadium-muted hover:text-rose-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
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
