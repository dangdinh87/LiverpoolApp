"use client";

import { ArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useNowAfterMount } from "@/hooks/use-now-after-mount";
import { useNewsBaseline } from "@/lib/news/last-visit";

/**
 * "12 new stories" beside the page title: how many of the stories on the page
 * came out after the reader's previous visit. Renders nothing on the server
 * and until the stored time is read, so there is no hydration mismatch.
 */
export function NewStoriesCount({ storyTimes }: { storyTimes: number[] }) {
  const t = useTranslations("News.feed");
  const baseline = useNewsBaseline();
  if (baseline === null) return null;
  const count = storyTimes.filter((time) => time > baseline).length;
  if (count === 0) return null;
  // Every story on the page is newer: the reader was away for longer than the page reaches back.
  const capped = count === storyTimes.length;

  return (
    <p className="inline-flex shrink-0 items-center gap-2 pb-1 text-sm font-semibold text-lfc-gold">
      <span aria-hidden className="size-2 rounded-full bg-lfc-red" />
      {capped ? t("newCountCapped", { count }) : t("newCount", { count })}
    </p>
  );
}

/**
 * A thin rule between the stories published after the previous visit (above
 * it, hence the arrow) and the ones the reader has already had a chance to
 * see: "New since 18:30".
 */
export function NewSinceDivider({ baseline, locale }: { baseline: number; locale: "en" | "vi" }) {
  const t = useTranslations("News.feed");
  const now = useNowAfterMount(5 * 60_000);
  if (now === null) return null;

  const since = new Date(baseline);
  const intl = locale === "vi" ? "vi-VN" : "en-GB";
  const time = new Intl.DateTimeFormat(intl, { hour: "2-digit", minute: "2-digit" }).format(since);
  // A time alone is ambiguous once the visit was not today.
  const sameDay = new Date(now).toDateString() === since.toDateString();
  const label = sameDay ? time : `${new Intl.DateTimeFormat(intl, { day: "numeric", month: "numeric" }).format(since)}, ${time}`;

  return (
    <div className="flex items-center gap-3 py-2 text-[13px] font-semibold text-lfc-gold col-span-full">
      <span aria-hidden className="h-px flex-1 bg-lfc-gold/30" />
      <p className="inline-flex items-center gap-1">
        <ArrowUp className="size-3.5" aria-hidden />
        {t("newSince", { time: label })}
      </p>
      <span aria-hidden className="h-px flex-1 bg-lfc-gold/30" />
    </div>
  );
}
