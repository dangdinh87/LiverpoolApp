"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { Fixture } from "@/lib/types/football";

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
  const isLive =
    f.status.short === "1H" ||
    f.status.short === "HT" ||
    f.status.short === "2H" ||
    f.status.short === "ET";

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

        {/* VS / Countdown */}
        <div className="flex flex-col items-center gap-1.5 px-3">
          <span className="font-bebas text-3xl text-stadium-muted/60">VS</span>
          {!isLive && countdown ? (
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
                {date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </span>
              <span className="font-inter text-[11px] text-stadium-muted">
                {date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </span>
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
          {date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}{" "}
          {date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
