"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import type { Fixture } from "@/lib/types/football";
import {
  OverviewCardHeader,
  OverviewDivider,
} from "./overview-card-shared";

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

function isSameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Mock fixture for dev/fallback when no real upcoming match
function createMockFixture(): Fixture {
  const kickoff = new Date();
  kickoff.setDate(kickoff.getDate() + 3);
  kickoff.setHours(20, 0, 0, 0);
  return {
    fixture: {
      id: 0,
      date: kickoff.toISOString(),
      venue: { id: null, name: "Anfield", city: "Liverpool" },
      status: { long: "Not Started", short: "NS", elapsed: null },
    },
    league: {
      id: 39,
      name: "Premier League",
      country: "England",
      logo: "https://media.api-sports.io/football/leagues/39.png",
      season: 2025,
      round: "Regular Season - 30",
    },
    teams: {
      home: { id: 40, name: "Liverpool", logo: "/assets/lfc/crest.webp", winner: null },
      away: { id: 50, name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png", winner: null },
    },
    goals: { home: null, away: null },
    score: {
      halftime: { home: null, away: null },
      fulltime: { home: null, away: null },
      extratime: { home: null, away: null },
      penalty: { home: null, away: null },
    },
  };
}

interface NextMatchWidgetProps {
  fixture: Fixture | null;
}

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(targetDate));

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(calcTimeLeft(targetDate)), 1_000);
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
  const secs = Math.floor((diff % 60_000) / 1_000);
  return { days, hours, mins, secs };
}

export function NextMatchWidget({ fixture }: NextMatchWidgetProps) {
  const t = useTranslations("NextMatch");
  const locale = useLocale();
  // Use mock data when no real fixture available
  const isMock = !fixture;
  const displayFixture = fixture ?? createMockFixture();
  const countdown = useCountdown(displayFixture.fixture.date);

  const { teams, league, fixture: f } = displayFixture;
  const date = new Date(f.date);
  const isLive = ["1H", "HT", "2H", "ET", "P", "BT", "LIVE"].includes(f.status.short);
  const elapsed = f.status.elapsed;
  const isHT = f.status.short === "HT";
  const isToday = isSameCalendarDay(date, new Date());
  const roundName = league.round.includes(" - ")
    ? league.round.split(" - ").at(-1) ?? league.round
    : league.round;

  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <OverviewCardHeader
        title={t("title")}
        action={
          isMock ? (
            <span className="font-barlow text-[10px] font-semibold text-stadium-muted/60 uppercase tracking-wider">
              Preview
            </span>
          ) : isLive ? (
            <span className="flex items-center gap-1.5 text-xs font-barlow font-semibold text-green-400 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {t("live")}
            </span>
          ) : isToday ? (
            <span className="border border-lfc-red/40 bg-lfc-red/10 px-2 py-1 font-barlow text-[10px] font-semibold text-lfc-red uppercase tracking-wider">
              {t("today")}
            </span>
          ) : null
        }
      />

      <div className="flex items-center justify-between gap-2 flex-1 min-h-0">
        {/* Home team */}
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="relative w-12 h-12">
            <Image
              src={teams.home.logo}
              alt={teams.home.name}
              fill
              sizes="48px"
              className="object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
            />
          </div>
          <span className="font-inter text-[11px] text-white text-center font-semibold leading-tight">
            {teams.home.name}
          </span>
        </div>

        {/* Center: live score OR VS/countdown */}
        <div className="flex flex-col items-center gap-1 px-2">
          {isLive ? (
            <>
              <span className="font-bebas text-3xl text-white leading-none">
                {displayFixture.goals.home ?? 0} - {displayFixture.goals.away ?? 0}
              </span>
              <span className={`font-barlow text-xs font-semibold uppercase ${isHT ? "text-lfc-gold" : "text-lfc-red"}`}>
                {isHT ? "HT" : elapsed != null ? `${elapsed}'` : t("live")}
              </span>
            </>
          ) : (
            <>
              <span className="font-bebas text-[2rem] text-stadium-muted/60 leading-none">VS</span>
              {countdown ? (
                <div className="flex items-center gap-1.5 text-center">
                  {countdown.days > 0 && (
                    <div className="flex flex-col items-center">
                      <span className="font-bebas text-base text-lfc-red leading-none">{countdown.days}</span>
                      <span className="font-barlow text-[9px] text-stadium-muted uppercase">d</span>
                    </div>
                  )}
                  <div className="flex flex-col items-center">
                    <span className="font-bebas text-base text-lfc-red leading-none">{String(countdown.hours).padStart(2, "0")}</span>
                    <span className="font-barlow text-[9px] text-stadium-muted uppercase">h</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-bebas text-base text-lfc-red leading-none">{String(countdown.mins).padStart(2, "0")}</span>
                    <span className="font-barlow text-[9px] text-stadium-muted uppercase">m</span>
                  </div>
                  {countdown.days === 0 && countdown.hours === 0 && (
                    <div className="flex flex-col items-center">
                      <span className="font-bebas text-base text-lfc-gold leading-none animate-pulse">{String(countdown.secs).padStart(2, "0")}</span>
                      <span className="font-barlow text-[9px] text-stadium-muted uppercase">s</span>
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Away team */}
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="relative w-12 h-12">
            <Image
              src={teams.away.logo}
              alt={teams.away.name}
              fill
              sizes="48px"
              className="object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
            />
          </div>
          <span className="font-inter text-[11px] text-white text-center font-semibold leading-tight">
            {teams.away.name}
          </span>
        </div>
      </div>

      {/* Footer: competition + round + date */}
      <div className="mt-auto">
        <OverviewDivider />
        <div className="pt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
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
              {league.name} · {roundName}
            </span>
          </div>
          <span className="font-inter text-[11px] text-stadium-muted text-right shrink-0">
            {formatMatchDate(date, locale)}
          </span>
        </div>
      </div>
    </div>
  );
}
