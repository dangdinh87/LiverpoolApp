"use client";

import { useState, useRef, useEffect } from "react";
import Cookies from "js-cookie";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const LOCALES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
] as const;

function setLocaleAndReload(code: string, current: string) {
  if (code === current) return;
  Cookies.set("NEXT_LOCALE", code, { expires: 365, path: "/", sameSite: "lax" });
  // The locale is part of the URL (/x Vietnamese, /en/x English), so reloading
  // the same URL would keep the old language.
  const { pathname, search, hash } = window.location;
  const bare = pathname.replace(/^\/en(?=\/|$)/, "") || "/";
  const target = code === "en" ? `/en${bare === "/" ? "" : bare}` : bare;
  window.location.assign(target + search + hash);
}

/**
 * Language switch.
 * - `dropdown` (default): compact EN/VI trigger + menu for the desktop header.
 * - `segmented`: all languages visible as one row, for the mobile menu.
 */
export function LanguageSwitcher({ variant = "dropdown" }: { variant?: "dropdown" | "segmented" }) {
  const t = useTranslations("Language");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside pointer / Escape (focus goes back to the trigger).
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (variant === "segmented") {
    return (
      <div role="group" aria-label={t("aria.toggle")} className="grid grid-cols-2 border border-[var(--line-strong)]">
        {LOCALES.map((l) => {
          const active = l.code === locale;
          return (
            <button
              key={l.code}
              type="button"
              aria-pressed={active}
              onClick={() => setLocaleAndReload(l.code, locale)}
              className={cn(
                "flex min-h-12 items-center justify-center gap-2 font-barlow text-sm font-semibold uppercase tracking-[0.12em] transition-colors cursor-pointer",
                active ? "bg-white/10 text-white" : "text-stadium-muted hover:text-white"
              )}
            >
              <span aria-hidden className="text-base">{l.flag}</span>
              {l.label}
            </button>
          );
        })}
      </div>
    );
  }

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="flex min-h-10 items-center gap-1.5 px-2.5 bg-transparent hover:bg-white/10 transition-colors group cursor-pointer"
        aria-label={t("aria.toggle")}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="font-barlow text-sm font-bold uppercase tracking-wider text-white/80 group-hover:text-white transition-colors">
          {current.code.toUpperCase()}
        </span>
        <ChevronDown
          aria-hidden
          className={cn("size-3 text-white/70 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-stadium-surface border border-[var(--line-strong)] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {LOCALES.map((l) => {
            const isActive = l.code === locale;
            return (
              <button
                key={l.code}
                type="button"
                aria-pressed={isActive}
                onClick={() => {
                  setOpen(false);
                  setLocaleAndReload(l.code, locale);
                }}
                className={cn(
                  "w-full flex min-h-11 items-center gap-3 px-4 text-left transition-colors cursor-pointer",
                  isActive
                    ? "bg-lfc-red/10 text-white"
                    : "text-stadium-muted hover:bg-stadium-surface2 hover:text-white"
                )}
              >
                <span aria-hidden className="text-base">{l.flag}</span>
                <span className="font-inter text-sm flex-1">{l.label}</span>
                {isActive && <Check size={14} className="text-lfc-red-text" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
