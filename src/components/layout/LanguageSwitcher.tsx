"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const LOCALES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
] as const;

export function LanguageSwitcher() {
  const t = useTranslations("Language");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const switchLocale = (code: string) => {
    if (code === locale) { setOpen(false); return; }
    Cookies.set("NEXT_LOCALE", code, { expires: 365 });
    setOpen(false);
    router.refresh();
  };

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-transparent hover:bg-white/10 transition-colors group cursor-pointer"
        aria-label={t("aria.toggle")}
      >
        <span className="font-barlow text-xs font-bold uppercase tracking-wider text-stadium-muted group-hover:text-white transition-colors">
          {current.code.toUpperCase()}
        </span>
        <ChevronDown
          className={cn(
            "w-3 h-3 text-stadium-muted transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-stadium-surface border border-stadium-border shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {LOCALES.map((l) => {
            const isActive = l.code === locale;
            return (
              <button
                key={l.code}
                onClick={() => switchLocale(l.code)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer",
                  isActive
                    ? "bg-lfc-red/10 text-white"
                    : "text-stadium-muted hover:bg-stadium-surface2 hover:text-white"
                )}
              >
                <span className="text-base">{l.flag}</span>
                <span className="font-inter text-sm flex-1">{l.label}</span>
                {isActive && <Check size={14} className="text-lfc-red" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
