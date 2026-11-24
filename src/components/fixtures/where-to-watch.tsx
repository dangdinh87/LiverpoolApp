"use client";

import { Tv } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  broadcasterCountryLabel,
  findBroadcaster,
} from "@/lib/football/premier-league-broadcasters";
import { useViewerTimeZone } from "@/hooks/use-viewer-time-zone";
import { cn } from "@/lib/utils";

/**
 * "Where to watch", answered for the viewer's own country.
 *
 * A client component because only the browser knows the viewer's time zone,
 * which is what the country is inferred from. It renders nothing on the server
 * and nothing where the table has no entry, so the surrounding layout must not
 * depend on it being there.
 */
export function WhereToWatch({
  competition,
  className,
}: {
  competition: string | null | undefined;
  className?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("Match");
  // No fallback zone: guessing a country is worse than saying nothing.
  const timeZone = useViewerTimeZone("");
  const broadcaster = findBroadcaster(competition, timeZone || null);
  if (!broadcaster) return null;

  return (
    <p
      className={cn(
        "flex items-center gap-2 text-[13px] leading-snug text-white/80",
        className,
      )}
    >
      <Tv className="size-4 shrink-0 text-lfc-gold" aria-hidden />
      <span>
        {t("whereToWatch", {
          country: broadcasterCountryLabel(broadcaster.country, locale),
          service: broadcaster.service,
        })}
      </span>
    </p>
  );
}
