import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseHTML } from "linkedom";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import enMessages from "@/messages/en.json";
import { SPOILER_ATTR, SPOILER_BOOT_SCRIPT, SPOILER_STORAGE_KEY, setSpoilerFree } from "@/lib/spoiler-mode";
import type { Fixture, Standing } from "@/lib/types/football";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => createElement("img", { src, alt: alt ?? "" }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: null }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

const SAMPLE_STANDINGS: Standing[] = [
  {
    rank: 1,
    team: { id: 40, name: "Liverpool FC", logo: "https://crests.football-data.org/64.png" },
    points: 68,
    goalsDiff: 41,
    group: "Premier League",
    form: "WWDWW",
    status: null,
    description: "Champions League",
    all: { played: 28, win: 21, draw: 5, lose: 2, goals: { for: 64, against: 23 } },
    home: { played: 14, win: 12, draw: 2, lose: 0, goals: { for: 35, against: 9 } },
    away: { played: 14, win: 9, draw: 3, lose: 2, goals: { for: 29, against: 14 } },
  },
];

describe("spoiler-free mode DOM & markup contracts", () => {
  it("toggles data-spoiler-free on <html>, persists to localStorage, and boots cleanly before paint", () => {
    const { document } = parseHTML("<!doctype html><html><body></body></html>");
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    vi.stubGlobal("document", document);
    vi.stubGlobal("localStorage", storage);

    setSpoilerFree(true);
    expect(document.documentElement.hasAttribute(SPOILER_ATTR)).toBe(true);
    expect(storage.getItem(SPOILER_STORAGE_KEY)).toBe("1");

    // Simulate a fresh page load running SPOILER_BOOT_SCRIPT before first paint.
    document.documentElement.removeAttribute(SPOILER_ATTR);
    new Function(SPOILER_BOOT_SCRIPT)();
    expect(document.documentElement.hasAttribute(SPOILER_ATTR)).toBe(true);

    setSpoilerFree(false);
    expect(document.documentElement.hasAttribute(SPOILER_ATTR)).toBe(false);
    expect(storage.getItem(SPOILER_STORAGE_KEY)).toBeNull();
  });

  it("emits .spoiler-hide and .spoiler-show placeholders in FormBadge and StandingsTable", async () => {
    const { StandingsTable } = await import("@/components/standings/standings-table");
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" timeZone="UTC" messages={enMessages as unknown as AbstractIntlMessages}>
        <StandingsTable standings={SAMPLE_STANDINGS} competition="pl" />
      </NextIntlClientProvider>,
    );

    const { document } = parseHTML(html);
    expect(document.querySelectorAll(".spoiler-hide").length).toBeGreaterThanOrEqual(8);
    expect(document.querySelectorAll(".spoiler-show").length).toBeGreaterThanOrEqual(8);
    // Masked form badge contains five '?' squares matching the 5-match form string.
    const maskedFormText = Array.from(document.querySelectorAll(".spoiler-show"))
      .map((el) => el.textContent?.trim() ?? "")
      .join("");
    expect(maskedFormText).toContain("?????");
  });

  it("emits .spoiler-hide and .spoiler-show placeholders in MatchCard for finished fixtures", async () => {
    const { MatchCard } = await import("@/components/fixtures/match-card");
    const finishedFixture: Fixture = {
      fixture: {
        id: 5001,
        date: "2026-11-15T15:00:00Z",
        venue: { id: 550, name: "Anfield", city: "Liverpool" },
        status: { long: "Match Finished", short: "FT", elapsed: 90 },
      },
      league: {
        id: 39,
        name: "Premier League",
        country: "England",
        logo: "",
        season: 2026,
        round: "Regular Season - 12",
      },
      teams: {
        home: { id: 40, name: "Liverpool FC", logo: "/assets/lfc/crest.webp", winner: true },
        away: { id: 42, name: "Arsenal FC", logo: "", winner: false },
      },
      goals: { home: 3, away: 1 },
      score: {
        halftime: { home: 1, away: 0 },
        fulltime: { home: 3, away: 1 },
        extratime: { home: null, away: null },
        penalty: { home: null, away: null },
      },
    };

    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" timeZone="UTC" messages={enMessages as unknown as AbstractIntlMessages}>
        <MatchCard fixture={finishedFixture} />
      </NextIntlClientProvider>,
    );

    const { document } = parseHTML(html);
    expect(document.querySelectorAll(".spoiler-hide").length).toBeGreaterThanOrEqual(3);
    const placeholderText = Array.from(document.querySelectorAll(".spoiler-show"))
      .map((el) => el.textContent?.trim() ?? "")
      .join(" ");
    expect(placeholderText).toContain("? - ?");
    expect(placeholderText).toContain("FT");
  });

  it("renders club initials fallback in TeamCrest when provider logo is empty", async () => {
    const { TeamCrest } = await import("@/components/ui/team-crest");
    const html = renderToStaticMarkup(
      <TeamCrest src="" name="Brighton & Hove Albion FC" sizes="48px" />,
    );
    expect(html).not.toContain("<img");
    expect(html).toContain(">BH<");
    const crystal = renderToStaticMarkup(
      <TeamCrest src={null} name="Crystal Palace FC" sizes="48px" />,
    );
    expect(crystal).toContain(">CP<");
  });
});
