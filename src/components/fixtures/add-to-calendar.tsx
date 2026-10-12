"use client";

import { useState, useSyncExternalStore } from "react";
import { CalendarPlus, Check, Copy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { routing } from "@/i18n/routing";

const FEED_PATH = "/api/calendar/liverpool.ics";

const subscribeToNothing = () => () => {};
const readOrigin = () => window.location.origin;
const serverOrigin = () => process.env.NEXT_PUBLIC_SITE_URL ?? "";

/**
 * "Add to calendar": subscribe once and every Liverpool match appears in the
 * phone's calendar at the subscriber's local time, with a reminder, and moves
 * by itself when a kick-off is rescheduled. Links for the three calendar apps
 * people actually use, plus the raw link for anything else.
 */
export function AddToCalendar() {
  const t = useTranslations("Fixtures.calendar");
  const locale = useLocale();
  const origin = useSyncExternalStore(subscribeToNothing, readOrigin, serverOrigin);
  const [copied, setCopied] = useState(false);

  const query = locale === routing.defaultLocale ? "" : `?lang=${locale}`;
  const httpsUrl = `${origin}${FEED_PATH}${query}`;
  const webcalUrl = httpsUrl.replace(/^https?:/, "webcal:");
  const links = [
    { label: t("google"), href: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}` },
    { label: t("apple"), href: webcalUrl },
    {
      label: t("outlook"),
      href: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(httpsUrl)}&name=${encodeURIComponent(t("calendarName"))}`,
    },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(httpsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the link is still visible to select by hand */
    }
  };

  return (
    <Popover>
      <PopoverTrigger className="inline-flex min-h-11 items-center gap-2 border border-[var(--line-strong)] px-3 font-barlow text-sm font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:border-white/40 hover:bg-white/5 active:bg-white/10">
        <CalendarPlus className="size-4" aria-hidden />
        {t("button")}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-none border-[var(--line-strong)] bg-stadium-surface p-0 text-white">
        <p className="border-b border-[var(--line)] px-4 py-3 text-[13px] leading-snug text-stadium-muted">{t("hint")}</p>
        <ul className="py-1">
          {links.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                target={link.href.startsWith("webcal:") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="flex min-h-11 items-center px-4 text-sm font-medium transition-colors hover:bg-white/5"
              >
                {link.label}
              </a>
            </li>
          ))}
          <li className="border-t border-[var(--line)]">
            <button
              type="button"
              onClick={copy}
              className="flex min-h-11 w-full items-center gap-2 px-4 text-left text-sm font-medium text-stadium-muted transition-colors hover:bg-white/5 hover:text-white"
            >
              {copied ? <Check className="size-4 text-green-400" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              <span aria-live="polite">{copied ? t("copied") : t("copy")}</span>
            </button>
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}
