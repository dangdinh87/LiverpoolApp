"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  Check,
  Loader2,
  MessageSquare,
  RefreshCw,
  Reply,
  Send,
  Shield,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useNowAfterMount } from "@/hooks/use-now-after-mount";
import { formatDayMonth } from "@/lib/format-match-date";
import { cn } from "@/lib/utils";
import { useToast } from "@/stores/toast-store";

export interface ChatMessageItem {
  id: string;
  room: string;
  authorName: string;
  authorAvatar: string | null;
  isMember: boolean;
  content: string;
  parentId: string | null;
  replyToName: string | null;
  createdAt: string;
  isOwn: boolean;
  canDelete: boolean;
}

interface ViewerInfo {
  signedIn: boolean;
  username: string | null;
  avatarUrl: string | null;
}

interface LiveChatBoxProps {
  variant?: "page" | "card" | "compact" | "embedded";
  initialMessages?: ChatMessageItem[];
  /** Pass `open && tab === "chat"` for embedded mode so polling pauses when hidden. */
  active?: boolean;
  headingTag?: "h2" | "h3";
  onOnlineCountChange?: (count: number) => void;
  refreshTrigger?: number;
  onRefreshingChange?: (refreshing: boolean) => void;
  className?: string;
}

const COMMUNITY_NAME_KEY = "ad_community_name";
const COMMUNITY_NAME_EVENT = "ad:community-name";
const POLL_MS = 4_000;
const CHAT_MAX_CHARS = 300;
const CHAT_COOLDOWN_SEC = 4;

const GUEST_AVATAR_PALETTE = [
  "bg-red-900/60 text-red-200 ring-red-500/40",
  "bg-amber-900/60 text-amber-200 ring-amber-500/40",
  "bg-emerald-900/60 text-emerald-200 ring-emerald-500/40",
  "bg-sky-900/60 text-sky-200 ring-sky-500/40",
  "bg-violet-900/60 text-violet-200 ring-violet-500/40",
  "bg-rose-900/60 text-rose-200 ring-rose-500/40",
] as const;

function guestAvatarColor(name: string): string {
  let hash = 0;
  const normalized = name.trim().toLowerCase();
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  return GUEST_AVATAR_PALETTE[hash % GUEST_AVATAR_PALETTE.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "F";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

/**
 * Shared real-time community chat room backed by `/api/chat/messages`.
 * Works for guests and signed-in members inside the floating corner widget.
 */
export function LiveChatBox({
  variant = "card",
  initialMessages = [],
  active = true,
  headingTag: Heading = "h2",
  onOnlineCountChange,
  refreshTrigger,
  onRefreshingChange,
  className,
}: LiveChatBoxProps) {
  const t = useTranslations("Chat.box");
  const locale = useLocale();
  const uiLocale: "vi" | "en" = locale === "vi" ? "vi" : "en";
  const now = useNowAfterMount(60_000);
  const toast = useToast();

  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [viewer, setViewer] = useState<ViewerInfo>({ signedIn: false, username: null, avatarUrl: null });
  const [displayName, setDisplayName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [draft, setDraft] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(0);
  const [replyTarget, setReplyTarget] = useState<{ id: string; authorName: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottomRef = useRef(true);
  const hydratedNameRef = useRef(false);
  const userEditedNameRef = useRef(false);
  const onOnlineCountChangeRef = useRef(onOnlineCountChange);
  const onRefreshingChangeRef = useRef(onRefreshingChange);
  const lastRefreshTriggerRef = useRef(refreshTrigger ?? 0);

  useEffect(() => {
    onOnlineCountChangeRef.current = onOnlineCountChange;
  }, [onOnlineCountChange]);

  useEffect(() => {
    onRefreshingChangeRef.current = onRefreshingChange;
  }, [onRefreshingChange]);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSec((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSec]);

  useEffect(() => {
    const syncStoredName = () => {
      if (userEditedNameRef.current) return;
      try {
        const stored = window.localStorage.getItem(COMMUNITY_NAME_KEY);
        if (stored) {
          hydratedNameRef.current = true;
          setDisplayName(stored);
        }
      } catch {
        // ignore storage errors
      }
    };
    const frameId = window.requestAnimationFrame(syncStoredName);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== COMMUNITY_NAME_KEY || userEditedNameRef.current) return;
      setDisplayName(e.newValue ?? "");
    };
    const onCustomName = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string") setDisplayName(detail);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(COMMUNITY_NAME_EVENT, onCustomName);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(COMMUNITY_NAME_EVENT, onCustomName);
    };
  }, []);

  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/messages?room=general&limit=100", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const payload = (await res.json()) as {
        messages?: ChatMessageItem[];
        onlineCount?: number;
        viewer?: ViewerInfo;
      };
      if (Array.isArray(payload.messages)) {
        setMessages(payload.messages);
      }
      if (typeof payload.onlineCount === "number") {
        setOnlineCount(payload.onlineCount);
        onOnlineCountChangeRef.current?.(payload.onlineCount);
      }
      if (payload.viewer) {
        setViewer(payload.viewer);
        if (!hydratedNameRef.current && !userEditedNameRef.current) {
          hydratedNameRef.current = true;
          if (payload.viewer.username && !payload.viewer.username.startsWith("Fan ")) {
            setDisplayName((prev) => prev || payload.viewer?.username || "");
          }
        }
      }
    } catch {
      // keep existing messages on network hiccup
    }
  }, []);

  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true);
    onRefreshingChangeRef.current?.(true);
    try {
      await fetchLatest();
    } finally {
      setRefreshing(false);
      onRefreshingChangeRef.current?.(false);
    }
  }, [fetchLatest]);

  useEffect(() => {
    if (!active) return;
    const next = refreshTrigger ?? 0;
    if (next > lastRefreshTriggerRef.current) {
      lastRefreshTriggerRef.current = next;
      void handleManualRefresh();
    }
  }, [refreshTrigger, active, handleManualRefresh]);

  useEffect(() => {
    if (!active) return;
    let mounted = true;
    const run = async () => {
      if (!mounted) return;
      await fetchLatest();
    };
    void run();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchLatest();
      }
    }, POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchLatest();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active, fetchLatest]);

  const orderedMessages = useMemo(
    () => [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messages],
  );

  useEffect(() => {
    if (!active || !stickToBottomRef.current) return;
    const el = listRef.current;
    if (!el) return;
    const frameId = window.requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [orderedMessages.length, active]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    stickToBottomRef.current = nearBottom;
    setShowScrollBtn(!nearBottom);
  };

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    stickToBottomRef.current = true;
    setShowScrollBtn(false);
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const persistName = (raw: string) => {
    if (viewer.signedIn) return;
    const clean = raw.trim();
    try {
      if (clean) {
        window.localStorage.setItem(COMMUNITY_NAME_KEY, clean);
      } else {
        window.localStorage.removeItem(COMMUNITY_NAME_KEY);
        // Expire non-HttpOnly display name cookie immediately so reload does not resurrect it.
        document.cookie = "ad_display_name=; path=/; max-age=0; SameSite=Lax";
      }
      window.dispatchEvent(new CustomEvent(COMMUNITY_NAME_EVENT, { detail: clean }));
    } catch {
      // ignore
    }
  };

  const handleClearName = () => {
    userEditedNameRef.current = true;
    hydratedNameRef.current = true;
    setDisplayName("");
    persistName("");
  };

  const errorMessageFor = (code: string | undefined, status: number): string => {
    if (code === "cooldown") return t("errors.cooldown");
    if (status === 429 || code === "rate_limited") return t("errors.rateLimited");
    if (code === "profanity_name") return t("errors.badName");
    if (code === "profanity") return t("errors.profanity");
    if (code === "spam" || code === "too_many_links") return t("errors.spam");
    if (code === "duplicate") return t("errors.duplicate");
    if (code === "invalid_length") return t("errors.tooShort");
    return t("errors.submitFailed");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (submitting || cooldownSec > 0) return;
    if (trimmed.length < 2 || trimmed.length > CHAT_MAX_CHARS) {
      toast.show({ type: "error", message: t("errors.tooShort") });
      return;
    }

    setSubmitting(true);
    persistName(displayName);
    stickToBottomRef.current = true;

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: "general",
          content: trimmed,
          displayName: viewer.signedIn ? undefined : displayName.trim(),
          parentId: replyTarget?.id ?? null,
          replyToName: replyTarget?.authorName ?? null,
          website: honeypot || undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        message?: ChatMessageItem;
        error?: string;
      } | null;

      if (res.ok && data?.message) {
        setMessages((prev) => [...prev, data.message!]);
        setDraft("");
        setReplyTarget(null);
        setCooldownSec(CHAT_COOLDOWN_SEC);
      } else {
        if (data?.error === "cooldown") {
          setCooldownSec(CHAT_COOLDOWN_SEC);
        }
        toast.show({ type: "error", message: errorMessageFor(data?.error, res.status) });
      }
    } catch {
      toast.show({ type: "error", message: t("errors.submitFailed") });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDeleteId(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/chat/messages?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== id && m.parentId !== id));
        if (replyTarget?.id === id) setReplyTarget(null);
      } else {
        toast.show({ type: "error", message: t("errors.deleteFailed") });
      }
    } catch {
      toast.show({ type: "error", message: t("errors.deleteFailed") });
    } finally {
      setDeletingId(null);
    }
  };

  const formatTimestamp = (iso: string): string => {
    const date = new Date(iso);
    if (now === null) return formatDayMonth(date, uiLocale);
    const diffMs = Math.max(0, now - date.getTime());
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return t("justNow");
    if (mins < 60) return t("minutesAgo", { n: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t("hoursAgo", { n: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return t("daysAgo", { n: days });
    return formatDayMonth(date, uiLocale);
  };

  const isEmbedded = variant === "embedded";
  const isCompact = variant === "compact";
  const isPage = variant === "page";

  return (
    <section
      aria-label={t("chatTitle")}
      className={cn(
        "flex flex-col overflow-hidden",
        isEmbedded ? "min-h-0 flex-1 bg-transparent" : "surface",
        className,
      )}
    >
      {!isEmbedded && (
        <header
          className={cn(
            "flex shrink-0 items-center justify-between gap-2 border-b border-[var(--line)]",
            isPage
              ? "px-4 py-3.5 sm:px-5"
              : isCompact
                ? "px-3.5 py-2.5"
                : "px-4 py-3",
          )}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="size-2 shrink-0 rounded-full bg-emerald-400" aria-hidden />
              <Heading
                className={cn(
                  "truncate font-bebas leading-none tracking-wide text-white",
                  isPage ? "text-2xl sm:text-3xl" : isCompact ? "text-xl" : "text-2xl",
                )}
              >
                {t("chatTitle")}
              </Heading>
              {isPage ? (
                <span className="inline-flex items-center gap-1.5 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-barlow text-xs font-semibold uppercase tracking-[0.06em] text-emerald-300 tabular-nums">
                  {t("onlineCount", { count: onlineCount })}
                </span>
              ) : (
                onlineCount > 0 && (
                  <span className="font-barlow text-xs font-semibold text-emerald-300/90 tabular-nums">
                    {t("onlineCount", { count: onlineCount })}
                  </span>
                )
              )}
              {!isPage && orderedMessages.length > 0 && (
                <span className="font-barlow text-xs font-semibold text-stadium-muted tabular-nums">
                  ({orderedMessages.length})
                </span>
              )}
            </div>
            {!isCompact && (
              <p className="mt-0.5 text-xs text-stadium-muted">{t("chatSubtitle")}</p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {isPage && (
              <span className="mr-1 hidden items-center gap-1.5 font-barlow text-xs font-semibold uppercase tracking-[0.08em] text-stadium-muted sm:inline-flex">
                {t("liveLabel")}
              </span>
            )}
            <button
              type="button"
              onClick={() => void handleManualRefresh()}
              disabled={refreshing}
              aria-label={t("refresh")}
              className={cn(
                "inline-flex items-center justify-center border border-[var(--line)] text-stadium-muted transition-colors hover:border-[var(--line-strong)] hover:text-white cursor-pointer",
                isCompact ? "size-8" : "size-9",
              )}
            >
              <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} aria-hidden />
            </button>
          </div>
        </header>
      )}

      {/* Scrollable chat feed */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={listRef}
          onScroll={handleScroll}
          className={cn(
            "overflow-y-auto overflow-x-hidden",
            isPage
              ? "h-[calc(100dvh-var(--header-h)-14rem)] min-h-[460px] max-h-[680px] space-y-2.5 px-4 py-4 sm:px-5"
              : cn(
                  "space-y-3 px-3.5 py-3",
                  isEmbedded
                    ? "h-full"
                    : isCompact
                      ? "h-[280px]"
                      : "h-[360px] sm:h-[400px]",
                ),
          )}
        >
          {orderedMessages.length === 0 ? (
            <div className="flex h-full min-h-[160px] flex-col items-center justify-center px-3 text-center">
              <MessageSquare className="size-7 text-stadium-muted" aria-hidden />
              <p className="mt-2.5 text-sm leading-relaxed text-stadium-muted">{t("chatEmpty")}</p>
            </div>
          ) : (
            orderedMessages.map((msg) => {
              const isDeleting = deletingId === msg.id;
              const isConfirming = confirmDeleteId === msg.id;
              const avatarBlocked = failedAvatars[msg.id];
              const hasImageAvatar = Boolean(msg.authorAvatar && !avatarBlocked);

              return (
                <div
                  key={msg.id}
                  aria-busy={isDeleting}
                  className={cn(
                    "group flex items-start gap-2.5",
                    isPage && "rounded-lg px-3 py-2 transition-colors",
                    msg.isOwn
                      ? isPage
                        ? "bg-lfc-red/[0.08] ring-1 ring-lfc-red/25"
                        : "rounded-md bg-lfc-red/[0.06] px-2 py-1.5"
                      : isPage && "hover:bg-white/[0.025]",
                    isDeleting && "opacity-50",
                  )}
                >
                  <div
                    className={cn(
                      "relative mt-0.5 flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 font-barlow text-xs font-bold",
                      isPage ? "size-8" : "size-7",
                      hasImageAvatar || msg.isMember
                        ? "bg-stadium-surface2 ring-[var(--line-strong)] text-white/85"
                        : guestAvatarColor(msg.authorName),
                    )}
                  >
                    {hasImageAvatar ? (
                      <Image
                        src={msg.authorAvatar!}
                        alt=""
                        fill
                        sizes={isPage ? "32px" : "28px"}
                        className="object-cover"
                        referrerPolicy="no-referrer"
                        onError={() => setFailedAvatars((prev) => ({ ...prev, [msg.id]: true }))}
                        unoptimized
                      />
                    ) : msg.isMember ? (
                      <User className="size-3.5 text-stadium-muted" aria-hidden />
                    ) : (
                      <span aria-hidden>{initials(msg.authorName)}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                      <span
                        className={cn(
                          "font-inter text-xs font-semibold",
                          msg.isOwn ? "text-brand" : "text-white",
                        )}
                      >
                        {msg.authorName}
                      </span>
                      {msg.isMember && (
                        <span className="inline-flex items-center gap-0.5 font-barlow text-[10px] font-semibold uppercase tracking-wider text-lfc-gold">
                          <Shield className="size-2.5" aria-hidden />
                          {t("memberBadge")}
                        </span>
                      )}
                      <span className="text-[11px] text-stadium-muted tabular-nums">
                        {formatTimestamp(msg.createdAt)}
                      </span>
                    </div>

                    <p
                      className={cn(
                        "mt-0.5 whitespace-pre-wrap break-words font-inter leading-snug text-white/90",
                        isPage ? "text-sm leading-relaxed" : "text-[13.5px]",
                      )}
                    >
                      {msg.replyToName && (
                        <span className="mr-1 font-medium text-brand">@{msg.replyToName}</span>
                      )}
                      {msg.content}
                    </p>

                    <div className="mt-0.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyTarget({ id: msg.id, authorName: msg.authorName });
                          inputRef.current?.focus();
                        }}
                        className="inline-flex min-h-7 items-center gap-1 text-[11px] text-stadium-muted transition-colors hover:text-white cursor-pointer"
                      >
                        <Reply className="size-3" aria-hidden />
                        {t("reply")}
                      </button>

                      {msg.canDelete && !isConfirming && (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(msg.id)}
                          disabled={isDeleting}
                          aria-label={t("delete")}
                          className="inline-flex min-h-7 items-center gap-1 text-[11px] text-stadium-muted transition-colors hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="size-3" aria-hidden />
                        </button>
                      )}

                      {isConfirming && (
                        <span className="inline-flex items-center gap-1.5 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-1.5 py-0.5 text-stadium-muted hover:text-white cursor-pointer"
                          >
                            {t("deleteCancel")}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(msg.id)}
                            className="bg-lfc-red px-2 py-0.5 font-medium text-white hover:bg-lfc-red-dark cursor-pointer"
                          >
                            {t("deleteAction")}
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {showScrollBtn && (
          <button
            type="button"
            onClick={scrollToBottom}
            aria-label={t("scrollBottom")}
            className="absolute bottom-3 right-3 flex size-8 items-center justify-center rounded-full border border-[var(--line-strong)] bg-stadium-surface2/95 text-white shadow-md transition-colors hover:bg-lfc-red cursor-pointer"
          >
            <ArrowDown className="size-4" aria-hidden />
          </button>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        aria-busy={submitting}
        className={cn(
          "shrink-0 border-t border-[var(--line)]",
          isPage ? "p-3 sm:px-5 sm:py-3.5" : "px-2.5 py-2",
          isEmbedded ? "bg-stadium-surface" : "bg-stadium-bg/50",
        )}
      >
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="sr-only"
        />
        {replyTarget && (
          <div className="mb-1.5 flex items-center justify-between gap-2 rounded border-l-2 border-lfc-red bg-stadium-surface2/80 px-2 py-1 text-[11px] text-stadium-muted">
            <span className="truncate">{t("replyingTo", { name: replyTarget.authorName })}</span>
            <button
              type="button"
              onClick={() => setReplyTarget(null)}
              aria-label={t("cancelReply")}
              className="text-stadium-muted hover:text-white cursor-pointer"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        )}

        {!viewer.signedIn && editingName && (
          <div className="mb-1.5 flex items-center gap-1.5">
            <div className="relative min-w-0 flex-1">
              <input
                autoFocus
                type="text"
                value={displayName}
                onChange={(e) => {
                  const val = e.target.value;
                  userEditedNameRef.current = true;
                  hydratedNameRef.current = true;
                  setDisplayName(val);
                  if (!val.trim()) persistName("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") {
                    e.preventDefault();
                    setEditingName(false);
                    inputRef.current?.focus();
                  }
                }}
                maxLength={32}
                placeholder={t("namePlaceholder")}
                aria-label={t("namePlaceholder")}
                className="h-7 w-full rounded-md bg-[#0d0d0d] pl-2.5 pr-7 text-xs text-white placeholder:text-stadium-muted ring-1 ring-white/15 focus:outline-none focus:ring-lfc-red/80"
              />
              {displayName.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearName}
                  aria-label={t("clearName")}
                  title={t("clearName")}
                  className="absolute right-1 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-stadium-muted transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <X className="size-3" aria-hidden />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingName(false);
                inputRef.current?.focus();
              }}
              aria-label={t("doneName")}
              title={t("doneName")}
              className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/10 text-white transition-colors hover:bg-white/15 cursor-pointer"
            >
              <Check className="size-3.5" aria-hidden />
            </button>
          </div>
        )}

        <div className="flex items-end gap-1.5 rounded-lg bg-[#0d0d0d] px-2 py-1 ring-1 ring-white/10 transition-shadow focus-within:ring-lfc-red/80">
          {!viewer.signedIn && (
            <div className="mb-0.5 inline-flex h-6 max-w-[112px] shrink-0 items-center rounded bg-white/[0.07] text-[11px] text-white/85 ring-1 ring-white/[0.08]">
              <button
                type="button"
                onClick={() => setEditingName((v) => !v)}
                title={t("namePlaceholder")}
                aria-expanded={editingName}
                className="inline-flex h-full min-w-0 items-center gap-1 px-1.5 transition-colors hover:text-white cursor-pointer"
              >
                <User className="size-3 shrink-0 text-stadium-muted" aria-hidden />
                <span className="truncate">{displayName.trim() || t("setName")}</span>
              </button>
              {displayName.trim().length > 0 && (
                <button
                  type="button"
                  onClick={handleClearName}
                  aria-label={t("clearName")}
                  title={t("clearName")}
                  className="flex h-full items-center pl-0.5 pr-1 text-stadium-muted transition-colors hover:text-white cursor-pointer"
                >
                  <X className="size-3" aria-hidden />
                </button>
              )}
            </div>
          )}

          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (draft.trim() && !submitting && cooldownSec === 0) void handleSubmit(e);
              }
            }}
            placeholder={t("chatPlaceholder")}
            aria-label={t("chatPlaceholder")}
            maxLength={CHAT_MAX_CHARS}
            disabled={submitting}
            className="max-h-20 min-h-[28px] min-w-0 flex-1 resize-none bg-transparent py-1 text-[13.5px] leading-snug text-white placeholder:text-stadium-muted focus:outline-none disabled:opacity-50"
          />

          {draft.length >= 200 && (
            <span
              className={cn(
                "mb-1 shrink-0 text-[10px] tabular-nums text-stadium-muted",
                draft.length >= CHAT_MAX_CHARS && "text-lfc-red-text",
              )}
            >
              {t("charCount", { n: draft.length })}
            </span>
          )}

          <button
            type="submit"
            disabled={!draft.trim() || submitting || cooldownSec > 0}
            aria-label={cooldownSec > 0 ? `${t("send")} (${cooldownSec}s)` : t("send")}
            className="flex size-7 shrink-0 items-center justify-center rounded-md bg-lfc-red text-white transition-colors hover:bg-lfc-red-dark disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : cooldownSec > 0 ? (
              <span className="font-barlow text-[11px] font-bold tabular-nums">{cooldownSec}s</span>
            ) : (
              <Send className="size-3.5" aria-hidden />
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
