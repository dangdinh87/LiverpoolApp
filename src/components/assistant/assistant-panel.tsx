"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Maximize2,
  Minimize2,
  RefreshCw,
  Square,
  SquarePen,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { BrandMark } from "@/components/layout/brand-mark";
import { LiveChatBox } from "@/components/chat/live-chat-box";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useSpoilerFree } from "@/hooks/use-spoiler-free";
import { AssistantMarkdown } from "./assistant-markdown";
import {
  type AssistantErrorCode,
  useAssistantChat,
} from "./use-assistant-chat";

interface AssistantPanelProps {
  open: boolean;
  onClose: () => void;
  onReplyFinished?: () => void;
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const OPEN_CHAT_EVENT = "ad:open-chat";
const WIDGET_TAB_STORAGE_KEY = "ad_widget_tab";
const AI_MAX_CHARS = 600;
const AI_COOLDOWN_SEC = 3;

function readInitialTab(): "ai" | "chat" {
  if (typeof window === "undefined") return "ai";
  try {
    return window.sessionStorage.getItem(WIDGET_TAB_STORAGE_KEY) === "chat"
      ? "chat"
      : "ai";
  } catch {
    return "ai";
  }
}

export function AssistantPanel({
  open,
  onClose,
  onReplyFinished,
}: AssistantPanelProps) {
  const t = useTranslations("Assistant");
  const tChat = useTranslations("Chat.box");
  const rawLocale = useLocale();
  const locale: "en" | "vi" = rawLocale === "vi" ? "vi" : "en";
  const pathname = usePathname() || "/";
  const spoilerFree = useSpoilerFree();

  const [activeTab, setActiveTab] = useState<"ai" | "chat">(readInitialTab);
  const [expanded, setExpanded] = useState(false);
  const [confirmingNew, setConfirmingNew] = useState(false);
  const [input, setInput] = useState("");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [chatRefreshing, setChatRefreshing] = useState(false);
  const [chatRefreshTick, setChatRefreshTick] = useState(0);
  const [aiCooldownSec, setAiCooldownSec] = useState(0);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottomRef = useRef(true);

  const handleAiReplyFinished = useCallback(() => {
    setAiCooldownSec(AI_COOLDOWN_SEC);
    onReplyFinished?.();
  }, [onReplyFinished]);

  const {
    messages,
    status,
    activeTool,
    errorCode,
    sendMessage,
    stop,
    reset,
  } = useAssistantChat({
    locale,
    path: pathname,
    spoilerFree,
    onReplyFinished: handleAiReplyFinished,
  });

  const isStreaming = status === "streaming";

  const suggestions = useMemo(
    () => [
      t("chips.nextMatch"),
      t("chips.standings"),
      t("chips.briefing"),
      t("chips.injuries"),
    ],
    [t],
  );

  const toolLabel = (toolName: string | null): string => {
    switch (toolName) {
      case "getFixtures":
        return t("tools.getFixtures");
      case "getStandings":
        return t("tools.getStandings");
      case "findPlayer":
        return t("tools.findPlayer");
      case "getLatestNews":
        return t("tools.getLatestNews");
      case "getInjuries":
        return t("tools.getInjuries");
      case "navigate":
        return t("tools.navigate");
      default:
        return t("tools.default");
    }
  };

  const errorMessage = (code: AssistantErrorCode | null): string | null => {
    switch (code) {
      case "too_many_requests":
        return t("errors.tooManyRequests");
      case "conversation_too_long":
        return t("errors.conversationTooLong");
      case "input_too_long":
        return t("errors.inputTooLong");
      case "ai_unconfigured":
      case "upstream_failed":
        return t("errors.unavailable");
      case "network":
        return t("errors.network");
      default:
        return null;
    }
  };

  useEffect(() => {
    try {
      window.sessionStorage.setItem(WIDGET_TAB_STORAGE_KEY, activeTab);
    } catch {
      // ignore storage errors
    }
  }, [activeTab]);

  useEffect(() => {
    const onOpenChat = () => {
      setActiveTab("chat");
    };
    window.addEventListener(OPEN_CHAT_EVENT, onOpenChat);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpenChat);
  }, []);

  useEffect(() => {
    if (aiCooldownSec <= 0) return;
    const timer = window.setInterval(() => {
      setAiCooldownSec((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [aiCooldownSec]);

  useEffect(() => {
    if (!open || activeTab !== "ai") return;
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, activeTab]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirmingNew) {
          setConfirmingNew(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, confirmingNew, onClose]);

  useEffect(() => {
    const el = listRef.current;
    if (!el || !stickToBottomRef.current) return;
    const frameId = window.requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [messages, activeTool, open]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 48;
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

  const handleSubmit = (textOverride?: string) => {
    const next = (textOverride ?? input).trim();
    if (!next || next.length > AI_MAX_CHARS || isStreaming || aiCooldownSec > 0) return;
    stickToBottomRef.current = true;
    setConfirmingNew(false);
    if (!textOverride) setInput("");
    void sendMessage(next);
  };

  const handleClose = () => {
    setConfirmingNew(false);
    onClose();
  };

  const handleConfirmReset = () => {
    setConfirmingNew(false);
    reset();
  };

  const errText = errorMessage(errorCode);

  return (
    <MotionConfig reducedMotion="user">
      <motion.section
        role="dialog"
        aria-label={t("title")}
        aria-hidden={!open}
        inert={!open}
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={
          open
            ? { opacity: 1, scale: 1, y: 0 }
            : { opacity: 0, scale: 0.92, y: 12 }
        }
        transition={{
          duration: open ? 0.24 : 0.18,
          ease: EASE_OUT,
        }}
        className={cn(
          "fixed z-[60] flex origin-bottom-right flex-col overflow-hidden rounded-xl border border-[var(--line-strong)] bg-[#141414] text-white shadow-2xl shadow-black/75",
          "transition-[width,height] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          "inset-x-2 sm:inset-x-auto sm:right-6",
          expanded
            ? "h-[560px] sm:h-[680px] sm:w-[540px]"
            : "h-[560px] sm:h-[580px] sm:w-[416px]",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        style={{
          bottom: "calc(var(--fab-base-bottom, 1.25rem) + 3.75rem)",
          maxHeight:
            "calc(100dvh - var(--header-h, 4rem) - var(--fab-base-bottom, 1.25rem) - 4.75rem)",
        }}
      >
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between gap-1.5 border-b border-[var(--line)] bg-stadium-surface px-2.5 py-2">
          <div className="flex min-w-0 items-center gap-0.5 rounded-lg bg-stadium-bg/80 p-0.5 ring-1 ring-[var(--line)]">
            <button
              type="button"
              onClick={() => setActiveTab("ai")}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 font-barlow text-[11px] font-bold uppercase tracking-[0.07em] transition-colors cursor-pointer",
                activeTab === "ai"
                  ? "bg-stadium-surface2 text-white"
                  : "text-stadium-muted hover:text-white",
              )}
            >
              <BrandMark className="size-3.5 shrink-0 rounded-[4px]" />
              <span>{t("tabAi")}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 font-barlow text-[11px] font-bold uppercase tracking-[0.07em] transition-colors cursor-pointer",
                activeTab === "chat"
                  ? "bg-stadium-surface2 text-white"
                  : "text-stadium-muted hover:text-white",
              )}
            >
              <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
              <span>{t("tabChat")}</span>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            {activeTab === "ai" ? (
              <button
                type="button"
                onClick={() => setConfirmingNew((v) => !v)}
                disabled={messages.length === 0}
                title={t("newChat")}
                aria-label={t("newChat")}
                aria-expanded={confirmingNew}
                className={cn(
                  "flex size-7 items-center justify-center rounded-lg text-stadium-muted transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-stadium-muted",
                  confirmingNew && messages.length > 0 && "bg-white/10 text-white",
                )}
              >
                <SquarePen className="size-4" aria-hidden />
              </button>
            ) : (
              <>
                {onlineCount > 0 && (
                  <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-barlow text-[11px] font-semibold uppercase tracking-[0.06em] text-emerald-300 tabular-nums">
                    {tChat("onlineCount", { count: onlineCount })}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setChatRefreshTick((n) => n + 1)}
                  disabled={chatRefreshing}
                  title={tChat("refresh")}
                  aria-label={tChat("refresh")}
                  className="flex size-7 items-center justify-center rounded-lg text-stadium-muted transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={cn("size-3.5", chatRefreshing && "animate-spin")} aria-hidden />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? t("collapse") : t("expand")}
              aria-label={expanded ? t("collapse") : t("expand")}
              className="hidden size-7 items-center justify-center rounded-lg text-stadium-muted transition-colors hover:bg-white/10 hover:text-white sm:flex"
            >
              {expanded ? (
                <Minimize2 className="size-4" aria-hidden />
              ) : (
                <Maximize2 className="size-4" aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              title={t("close")}
              aria-label={t("close")}
              className="flex size-7 items-center justify-center rounded-lg text-stadium-muted transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </header>

        {activeTab === "chat" ? (
          <LiveChatBox
            variant="embedded"
            active={open && activeTab === "chat"}
            onOnlineCountChange={setOnlineCount}
            refreshTrigger={chatRefreshTick}
            onRefreshingChange={setChatRefreshing}
          />
        ) : (
          <>

        {/* Inline confirmation bar for starting a new conversation */}
        <AnimatePresence initial={false}>
          {confirmingNew && messages.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              className="shrink-0 overflow-hidden border-b border-[var(--line)] bg-stadium-surface2/95"
            >
              <div className="flex items-center justify-between gap-2 px-3.5 py-2">
                <p className="text-xs leading-snug text-white/90">
                  {t("newChatConfirm")}
                </p>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setConfirmingNew(false)}
                    className="rounded-md px-2.5 py-1 text-xs font-medium text-stadium-muted transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReset}
                    className="rounded-md bg-lfc-red px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-lfc-red-dark"
                  >
                    {t("confirmNew")}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spoiler-free mode reminder */}
        {spoilerFree && (
          <div className="shrink-0 border-b border-[var(--line)] bg-stadium-surface px-3.5 py-1.5 text-[11px] text-lfc-gold">
            {t("spoilerNotice")}
          </div>
        )}

        {/* Message stream */}
        <div className="relative flex-1 overflow-hidden">
          <div
            ref={listRef}
            onScroll={handleScroll}
            className="h-full space-y-4 overflow-y-auto overflow-x-hidden px-3.5 py-4"
          >
            {messages.length === 0 ? (
              <div className="space-y-4 py-1">
                <p className="text-[13.5px] leading-relaxed text-stadium-muted">
                  {t("welcome")}
                </p>
                <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
                  {suggestions.map((prompt, index) => (
                    <motion.button
                      key={prompt}
                      type="button"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.22,
                        delay: index * 0.04,
                        ease: EASE_OUT,
                      }}
                      onClick={() => handleSubmit(prompt)}
                      disabled={isStreaming || aiCooldownSec > 0}
                      className="group flex w-full items-center justify-between gap-3 py-3 text-left text-[13px] text-white/90 transition-colors hover:bg-white/[0.03] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="leading-snug">{prompt}</span>
                      <ArrowUpRight
                        className="size-3.5 shrink-0 text-stadium-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-lfc-red-text"
                        aria-hidden
                      />
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                  className={cn(
                    "flex flex-col gap-2.5",
                    msg.role === "user" ? "items-end" : "items-start",
                  )}
                >
                  {msg.role === "user" ? (
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-lfc-red/95 px-3.5 py-2 text-[13.5px] leading-relaxed text-white">
                      {msg.text}
                    </div>
                  ) : (
                    <div className="w-full min-w-0 space-y-2.5">
                      {msg.text.trim().length > 0 ? (
                        <div className="min-w-0 overflow-hidden break-words px-0.5">
                          <AssistantMarkdown content={msg.text} />
                        </div>
                      ) : (
                        isStreaming && (
                          <div className="inline-flex items-center gap-2.5 px-0.5 py-1 text-xs text-stadium-muted">
                            <span className="inline-flex items-center gap-1" aria-hidden>
                              <span className="assistant-dot size-1.5 rounded-full bg-lfc-red-text" />
                              <span className="assistant-dot assistant-dot-2 size-1.5 rounded-full bg-lfc-red-text" />
                              <span className="assistant-dot assistant-dot-3 size-1.5 rounded-full bg-lfc-red-text" />
                            </span>
                            <AnimatePresence mode="wait">
                              <motion.span
                                key={activeTool ?? "default"}
                                initial={{ opacity: 0, y: 2 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -2 }}
                                transition={{ duration: 0.15 }}
                              >
                                {toolLabel(activeTool)}
                              </motion.span>
                            </AnimatePresence>
                          </div>
                        )
                      )}

                      {isStreaming &&
                        msg.text.trim().length > 0 &&
                        msg.id === messages[messages.length - 1]?.id &&
                        activeTool && (
                          <div className="inline-flex items-center gap-2 px-0.5 text-[11px] text-stadium-muted">
                            <span className="inline-flex items-center gap-1" aria-hidden>
                              <span className="assistant-dot size-1 rounded-full bg-lfc-red-text" />
                              <span className="assistant-dot assistant-dot-2 size-1 rounded-full bg-lfc-red-text" />
                              <span className="assistant-dot assistant-dot-3 size-1 rounded-full bg-lfc-red-text" />
                            </span>
                            <AnimatePresence mode="wait">
                              <motion.span
                                key={activeTool}
                                initial={{ opacity: 0, y: 2 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -2 }}
                                transition={{ duration: 0.15 }}
                              >
                                {toolLabel(activeTool)}
                              </motion.span>
                            </AnimatePresence>
                          </div>
                        )}

                      {msg.cards.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          {msg.cards.map((card) => (
                            <motion.div
                              key={card.path}
                              initial={{ opacity: 0, y: 6, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ duration: 0.2, ease: EASE_OUT }}
                              className="min-w-0"
                            >
                              <Link
                                href={card.path}
                                onClick={() => {
                                  if (window.innerWidth < 640) onClose();
                                }}
                                className="group flex w-full min-w-0 items-center justify-between gap-2.5 rounded-lg border border-[var(--line)] bg-[#1a1a1a]/80 px-3 py-2 transition-colors hover:border-[var(--line-strong)] hover:bg-[#222]"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-barlow text-[13px] font-semibold uppercase tracking-[0.04em] text-white">
                                    {card.label}
                                  </div>
                                  {card.reason && (
                                    <p className="mt-0.5 line-clamp-2 break-words text-[11.5px] leading-snug text-stadium-muted">
                                      {card.reason}
                                    </p>
                                  )}
                                </div>
                                <ArrowUpRight
                                  className="size-4 shrink-0 text-lfc-red-text transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                                  aria-hidden
                                />
                              </Link>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))
            )}

            {errText && (
              <div className="rounded-lg border border-red-500/35 bg-red-950/30 px-3 py-2 text-xs text-red-200">
                <p>{errText}</p>
                {errorCode === "conversation_too_long" && (
                  <button
                    type="button"
                    onClick={reset}
                    className="mt-1.5 font-medium text-white underline underline-offset-2"
                  >
                    {t("newChat")}
                  </button>
                )}
              </div>
            )}
          </div>

          <AnimatePresence>
            {showScrollBtn && (
              <motion.button
                type="button"
                onClick={scrollToBottom}
                aria-label={t("scrollBottom")}
                initial={{ opacity: 0, scale: 0.85, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 4 }}
                transition={{ duration: 0.16, ease: EASE_OUT }}
                className="absolute bottom-3 right-3 flex size-8 items-center justify-center rounded-full border border-[var(--line-strong)] bg-stadium-surface2/95 text-white shadow-md transition-colors hover:bg-lfc-red"
              >
                <ArrowDown className="size-4" aria-hidden />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Composer */}
        <footer className="shrink-0 border-t border-[var(--line)] bg-stadium-surface px-2.5 py-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex items-end gap-1.5 rounded-lg bg-[#0d0d0d] px-2 py-1 ring-1 ring-white/10 transition-shadow focus-within:ring-lfc-red/80"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={t("placeholder")}
              aria-label={t("placeholder")}
              maxLength={AI_MAX_CHARS}
              className="max-h-24 min-h-[28px] min-w-0 flex-1 resize-none bg-transparent py-1 text-[13.5px] leading-snug text-white placeholder:text-stadium-muted focus:outline-none"
            />
            {input.length >= 450 && (
              <span
                className={cn(
                  "mb-1 shrink-0 text-[10px] tabular-nums text-stadium-muted",
                  input.length >= AI_MAX_CHARS && "text-lfc-red-text",
                )}
              >
                {input.length}/{AI_MAX_CHARS}
              </span>
            )}
            {isStreaming ? (
              <button
                type="button"
                onClick={stop}
                aria-label={t("stop")}
                className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/15 text-white transition-colors hover:bg-white/25 cursor-pointer"
              >
                <Square className="size-3 fill-current" aria-hidden />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() || aiCooldownSec > 0}
                aria-label={aiCooldownSec > 0 ? `${t("send")} (${aiCooldownSec}s)` : t("send")}
                className="flex size-7 shrink-0 items-center justify-center rounded-md bg-lfc-red text-white transition-colors hover:bg-lfc-red-dark disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                {aiCooldownSec > 0 ? (
                  <span className="font-barlow text-[11px] font-bold tabular-nums">
                    {aiCooldownSec}s
                  </span>
                ) : (
                  <ArrowUp className="size-3.5" aria-hidden />
                )}
              </button>
            )}
          </form>
        </footer>
          </>
        )}
      </motion.section>
    </MotionConfig>
  );
}
