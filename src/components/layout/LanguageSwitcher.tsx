"use client";

import { useState } from "react";
import Cookies from "js-cookie";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { splitLocalePrefix, withLocalePrefix } from "@/i18n/routing";

const LOCALES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
] as const;

function setLocaleAndReload(code: string, current: string) {
  if (code === current) return;
  Cookies.set("NEXT_LOCALE", code, { expires: 365, path: "/", sameSite: "lax" });
  const { pathname, search, hash } = window.location;
  const bare = splitLocalePrefix(pathname).path;
  const target = withLocalePrefix(bare, code);
  window.location.assign(target + search + hash);
}

/**
 * Language switch.
 * - `dropdown` (default): accessible Radix menu for the desktop header.
 * - `segmented`: all languages visible as one row, for the mobile menu.
 */
export function LanguageSwitcher({ variant = "dropdown" }: { variant?: "dropdown" | "segmented" }) {
  const t = useTranslations("Language");
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  if (variant === "segmented") {
    return (
      <div
        role="group"
        aria-label={t("aria.toggle", { code: locale.toUpperCase() })}
        className="grid grid-cols-2 border border-[var(--line-strong)]"
      >
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
                active ? "bg-white/10 text-white" : "text-stadium-muted hover:text-white",
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
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 px-2.5 bg-transparent hover:bg-white/10 transition-colors group cursor-pointer outline-none"
          aria-label={t("aria.toggle", { code: locale.toUpperCase() })}
        >
          <span className="font-barlow text-sm font-bold uppercase tracking-wider text-white/80 group-hover:text-white transition-colors">
            {current.code.toUpperCase()}
          </span>
          <ChevronDown
            aria-hidden
            className={cn("size-3 text-white/70 transition-transform duration-200", open && "rotate-180")}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-44 p-0 bg-stadium-surface border-[var(--line-strong)] shadow-2xl"
      >
        {LOCALES.map((l) => {
          const isActive = l.code === locale;
          return (
            <DropdownMenuItem
              key={l.code}
              onSelect={() => setLocaleAndReload(l.code, locale)}
              className={cn(
                "flex min-h-11 items-center gap-3 px-4 rounded-none cursor-pointer transition-colors",
                isActive
                  ? "bg-lfc-red/10 text-white focus:bg-lfc-red/15 focus:text-white"
                  : "text-stadium-muted focus:bg-stadium-surface2 focus:text-white",
              )}
            >
              <span aria-hidden className="text-base">{l.flag}</span>
              <span className="font-inter text-sm flex-1">{l.label}</span>
              {isActive && <Check size={14} className="text-lfc-red-text" aria-hidden />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
