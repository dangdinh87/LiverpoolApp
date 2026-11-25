"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { BrandMark } from "@/components/layout/brand-mark";
import { cn } from "@/lib/utils";

const OPEN_CHAT_EVENT = "ad:open-chat";
const WIDGET_TAB_STORAGE_KEY = "ad_widget_tab";

const AssistantPanel = dynamic(
  () => import("./assistant-panel").then((m) => m.AssistantPanel),
  { ssr: false },
);

/**
 * Floating site-wide Anfield Daily assistant button.
 *
 * Uses pure CSS transitions (`0 KB` framer-motion on initial page load) and
 * aligns vertically with `ScrollToTop` via `--fab-offset`.
 */
export function AssistantFab() {
  const t = useTranslations("Assistant");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [unread, setUnread] = useState(false);
  const openRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--fab-offset", "3.75rem");
    return () => {
      root.style.removeProperty("--fab-offset");
      root.removeAttribute("data-assistant-open");
    };
  }, []);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-assistant-open", open);
  }, [open]);

  useEffect(() => {
    const onOpenChat = () => {
      try {
        window.sessionStorage.setItem(WIDGET_TAB_STORAGE_KEY, "chat");
      } catch {
        // ignore storage errors
      }
      setMounted(true);
      setOpen(true);
      setUnread(false);
    };
    window.addEventListener(OPEN_CHAT_EVENT, onOpenChat);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpenChat);
  }, []);

  const toggle = useCallback(() => {
    setMounted(true);
    setOpen((prev) => {
      const next = !prev;
      if (next) setUnread(false);
      return next;
    });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const handleReplyFinished = useCallback(() => {
    if (!openRef.current) setUnread(true);
  }, []);

  return (
    <>
      {mounted && (
        <AssistantPanel
          open={open}
          onClose={close}
          onReplyFinished={handleReplyFinished}
        />
      )}

      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={open ? t("close") : t("fabAria")}
        className={cn(
          "fixed z-[60] flex size-12 items-center justify-center rounded-full border border-[var(--line-strong)] bg-stadium-surface/95 text-white shadow-lg shadow-black/50 backdrop-blur",
          "transition-[background-color,border-color,transform] duration-200 ease-[var(--ease-out)] hover:border-lfc-red hover:bg-stadium-surface2 active:scale-95",
          open && "border-lfc-red bg-stadium-surface2",
        )}
        style={{
          right: "max(1.5rem, env(safe-area-inset-right))",
          bottom: "var(--fab-base-bottom, 1.25rem)",
        }}
      >
        <span className="relative grid size-6 place-items-center">
          <BrandMark
            className={cn(
              "col-start-1 row-start-1 size-6 rounded-md transition-[opacity,transform] duration-200 ease-[var(--ease-out)]",
              open
                ? "scale-75 rotate-45 opacity-0"
                : "scale-100 rotate-0 opacity-100",
            )}
          />
          <X
            aria-hidden
            className={cn(
              "col-start-1 row-start-1 size-5 text-white transition-[opacity,transform] duration-200 ease-[var(--ease-out)]",
              open
                ? "scale-100 rotate-0 opacity-100"
                : "scale-75 -rotate-45 opacity-0",
            )}
          />
          {unread && !open && (
            <span
              aria-hidden
              className="pointer-events-none absolute -right-1 -top-1 flex size-2.5"
            >
              <span className="assistant-ping absolute inset-0 rounded-full bg-lfc-red-text" />
              <span className="relative size-2.5 rounded-full border border-stadium-surface bg-lfc-red-text" />
            </span>
          )}
        </span>
      </button>
    </>
  );
}
