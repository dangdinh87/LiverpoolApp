"use client";

import { useEffect } from "react";
import { EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { SPOILER_REVEAL_ATTR, setSpoilerFree } from "@/lib/spoiler-mode";
import { useSpoilerFree } from "@/hooks/use-spoiler-free";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

/** On/off switch for spoiler-free mode (hides scores and results site-wide). */
export function SpoilerToggle({ className }: { className?: string }) {
  const t = useTranslations("Spoiler");
  const on = useSpoilerFree();
  return (
    <label
      title={t("hint")}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-2.5 border px-3 font-barlow text-sm font-semibold uppercase tracking-[0.1em] transition-colors",
        on ? "border-lfc-gold/60 bg-lfc-gold/10 text-lfc-gold" : "border-[var(--line-strong)] text-white hover:border-white/40 hover:bg-white/5",
        className,
      )}
    >
      <EyeOff className="size-4" aria-hidden />
      {t("toggle")}
      <Switch
        checked={on}
        onCheckedChange={setSpoilerFree}
        className="data-[state=checked]:bg-lfc-gold data-[state=unchecked]:bg-white/20 dark:data-[state=unchecked]:bg-white/20"
      />
    </label>
  );
}

/**
 * Shown on a match page while spoiler-free mode hides its result: reveal this
 * one match (the reveal lasts until the reader leaves the page) or turn the
 * mode off altogether.
 */
export function SpoilerRevealPanel() {
  const t = useTranslations("Spoiler");
  const reveal = () => document.documentElement.setAttribute(SPOILER_REVEAL_ATTR, "");

  // Leaving the page puts the veil back for every other match.
  useEffect(() => () => document.documentElement.removeAttribute(SPOILER_REVEAL_ATTR), []);

  return (
    <div className="spoiler-show">
      <div className="surface mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold text-white">
            <EyeOff className="size-4 text-lfc-gold" aria-hidden />
            {t("hiddenTitle")}
          </p>
          <p className="mt-1 text-sm text-stadium-muted">{t("hiddenDesc")}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={reveal}
            className="inline-flex min-h-11 items-center bg-lfc-red px-4 font-barlow text-sm font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-lfc-red-dark active:scale-[0.98]"
          >
            {t("reveal")}
          </button>
          <button
            type="button"
            onClick={() => setSpoilerFree(false)}
            className="inline-flex min-h-11 items-center border border-[var(--line-strong)] px-4 font-barlow text-sm font-semibold uppercase tracking-[0.1em] text-stadium-muted transition-colors hover:text-white"
          >
            {t("turnOff")}
          </button>
        </div>
      </div>
    </div>
  );
}
