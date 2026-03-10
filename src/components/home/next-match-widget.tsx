"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import type { Fixture } from "@/lib/types/football";

/* Locale-aware date formatting */
function formatMatchDate(date: Date, locale: string): string {
  const loc = locale === "vi" ? "vi-VN" : "en-GB";
  const weekday = date.toLocaleDateString(loc, { weekday: "short" });
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const time = date.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" });

  if (locale === "vi") {
    return `${weekday}, ${day}/${month} · ${time}`;
  }
  const monthName = date.toLocaleDateString("en-GB", { month: "short" });
  return `${weekday}, ${day} ${monthName} · ${time}`;
}

function formatShortDate(date: Date, locale: string): string {
  const loc = locale === "vi" ? "vi-VN" : "en-GB";
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");

  if (locale === "vi") {
    return `${day}/${month}`;
  }
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatTime(date: Date, locale: string): string {
  const loc = locale === "vi" ? "vi-VN" : "en-GB";
  return date.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" });
}

interface NextMatchWidgetProps {
  fixture: Fixture | null;
}

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(targetDate));

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(calcTimeLeft(targetDate)), 60_000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

function calcTimeLeft(targetDate: string) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  return { days, hours, mins };
}

export function NextMatchWidget({ fixture }: NextMatchWidgetProps) {
  const t = useTranslations("NextMatch");
  const locale = useLocale();
  const countdown = useCountdown(fixture?.fixture.date ?? "");

  if (!fixture) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 py-6">
        <p className="text-stadium-muted font-inter text-sm">{t("noMatch")}</p>
      </div>
    );
  }

  const { teams, league, fixture: f } = fixture;
  const date = new Date(f.date);
  const isLive = ["1H", "HT", "2H", "ET", "P", "BT", "LIVE"].includes(f.status.short);
  const elapsed = f.status.elapsed;
  const isHT = f.status.short === "HT";

  return (
    <div className="flex flex-col gap-4 p-5 h-full">
      <div className="flex items-center justify-between">
        <span className="font-barlow text-stadium-muted text-xs uppercase tracking-widest font-semibold">
          {t("title")}
        </span>
        {isLive && (
          <span className="flex items-center gap-1.5 text-xs font-barlow font-semibold text-green-400 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {t("live")}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 flex-1">
        {/* Home team */}
        <div className="flex flex-col items-center gap-2.5 flex-1">
          <div className="relative w-14 h-14">
            <Image
              src={teams.home.logo}
              alt={teams.home.name}
              fill
              sizes="56px"
              className="object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
            />
          </div>
          <span className="font-inter text-xs text-white text-center font-semibold leading-tight">
            {teams.home.name}
          </span>
        </div>

        {/* Center: live score OR VS/countdown */}
        <div className="flex flex-col items-center gap-1.5 px-3">
          {isLive ? (
            <>
              <span className="font-bebas text-4xl text-white leading-none">
                {fixture.goals.home ?? 0} - {fixture.goals.away ?? 0}
              </span>
              <span className={`font-barlow text-xs font-semibold uppercase ${isHT ? "text-lfc-gold" : "text-lfc-red"}`}>
                {isHT ? "HT" : elapsed != null ? `${elapsed}'` : t("live")}
              </span>
            </>
          ) : (
            <>
              <span className="font-bebas text-3xl text-stadium-muted/60">VS</span>
              {countdown ? (
                <div className="flex items-center gap-1.5 text-center">
                  {countdown.days > 0 && (
                    <div className="flex flex-col items-center">
                      <span className="font-bebas text-lg text-lfc-red leading-none">{countdown.days}</span>
                      <span className="font-barlow text-[9px] text-stadium-muted uppercase">d</span>
                    </div>
                  )}
                  <div className="flex flex-col items-center">
                    <span className="font-bebas text-lg text-lfc-red leading-none">{countdown.hours}</span>
                    <span className="font-barlow text-[9px] text-stadium-muted uppercase">h</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-bebas text-lg text-lfc-red leading-none">{countdown.mins}</span>
                    <span className="font-barlow text-[9px] text-stadium-muted uppercase">m</span>
                  </div>
                </div>
              ) : (
                <>
                  <span className="font-barlow text-xs text-lfc-red font-semibold">
                    {formatShortDate(date, locale)}
                  </span>
                  <span className="font-inter text-[11px] text-stadium-muted">
                    {formatTime(date, locale)}
                  </span>
                </>
              )}
            </>
          )}
        </div>

        {/* Away team */}
        <div className="flex flex-col items-center gap-2.5 flex-1">
          <div className="relative w-14 h-14">
            <Image
              src={teams.away.logo}
              alt={teams.away.name}
              fill
              sizes="56px"
              className="object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
            />
          </div>
          <span className="font-inter text-xs text-white text-center font-semibold leading-tight">
            {teams.away.name}
          </span>
        </div>
      </div>

      {/* Date line + competition */}
      <div className="border-t border-stadium-border/50 pt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative w-4 h-4 shrink-0">
            <Image
              src={league.logo}
              alt={league.name}
              fill
              sizes="16px"
              className="object-contain"
            />
          </div>
          <span className="font-inter text-[11px] text-stadium-muted truncate">
            {league.name}
          </span>
        </div>
        <span className="font-inter text-[11px] text-stadium-muted">
          {formatMatchDate(date, locale)}
        </span>
      </div>
    </div>
  );
}
