"use client";

import { useTranslations } from "next-intl";
import { useNowAfterMount } from "@/hooks/use-now-after-mount";

/**
 * Countdown for the next match only (one timer on the whole page). Renders a
 * fixed-width placeholder until mount so server HTML and hydration agree and
 * the badge does not shift layout.
 */
export function MatchCountdown({ kickOff }: { kickOff: string }) {
  const t = useTranslations("Match");
  const now = useNowAfterMount(60_000);
  const diff = now === null ? null : new Date(kickOff).getTime() - now;

  let text = "";
  if (diff !== null && diff > 0) {
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    const mins = Math.floor((diff % 3_600_000) / 60_000);
    if (days > 30) {
      const months = Math.floor(days / 30);
      text = t("countdown.inMonths", { n: months, s: months > 1 ? "s" : "" });
    } else if (days > 0) text = t("countdown.inDays", { n: days, h: hours });
    else if (hours > 0) text = t("countdown.inHours", { n: hours, m: mins });
    else text = t("countdown.inMins", { n: mins });
  }

  return (
    <span className="inline-flex min-h-6 items-center border border-lfc-gold/40 bg-lfc-gold/10 px-2 py-0.5 font-barlow text-xs font-bold uppercase tracking-wider text-lfc-gold tabular-nums">
      {t("nextMatch")}
      {text && <span className="ml-1.5 text-white">{text}</span>}
    </span>
  );
}
