import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseHTML } from "linkedom";
import { describe, expect, it, vi } from "vitest";
import enMessages from "@/messages/en.json";
import type { ConnectedGridPreset } from "@/components/ui/hub-links";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace?: string) => {
    const ns = namespace ? (enMessages as Record<string, unknown>)[namespace] : enMessages;
    return (key: string) => {
      const value = key.split(".").reduce<unknown>(
        (acc, part) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[part] : undefined),
        ns,
      );
      if (typeof value !== "string") {
        throw new Error(`Missing Hub key in test: ${namespace}.${key}`);
      }
      return value;
    };
  },
}));

describe("hub-links Server Components", () => {
  it("stays a pure Server Component module without a 'use client' directive", () => {
    const source = readFileSync(join(process.cwd(), "src/components/ui/hub-links.tsx"), "utf8");
    expect(source).not.toMatch(/["']use client["']/);
  });

  it("renders SectionSubNav with symmetric closed group routes, sticky shell, active state, and badges", async () => {
    const { SectionSubNav } = await import("@/components/ui/hub-links");

    const matchEl = await SectionSubNav({
      group: "match",
      current: "standings",
      badges: { fixtures: 12 },
    });
    const { document: matchDoc } = parseHTML(renderToStaticMarkup(matchEl));
    const matchNav = matchDoc.querySelector("nav");
    expect(matchNav?.className).toContain("section-subnav");
    expect(matchNav?.className).toContain("sticky");
    const matchLinks = Array.from(matchDoc.querySelectorAll("a"));
    expect(matchLinks.map((a) => a.getAttribute("href"))).toEqual([
      "/fixtures",
      "/standings",
      "/stats",
      "/predictions",
      "/season",
    ]);
    expect(matchLinks[1]?.getAttribute("aria-current")).toBe("page");
    expect(matchLinks[0]?.textContent).toContain("12");

    const editorialEl = await SectionSubNav({ group: "editorial", current: "digest" });
    const { document: editorialDoc } = parseHTML(renderToStaticMarkup(editorialEl));
    expect(Array.from(editorialDoc.querySelectorAll("a")).map((a) => a.getAttribute("href"))).toEqual([
      "/news",
      "/news/digest",
      "/analysis",
    ]);

    const clubEl = await SectionSubNav({ group: "club", current: "injuries" });
    const { document: clubDoc } = parseHTML(renderToStaticMarkup(clubEl));
    expect(Array.from(clubDoc.querySelectorAll("a")).map((a) => a.getAttribute("href"))).toEqual([
      "/squad",
      "/injuries",
      "/transfers",
    ]);

    const heritageEl = await SectionSubNav({ group: "heritage", current: "about" });
    const { document: heritageDoc } = parseHTML(renderToStaticMarkup(heritageEl));
    expect(Array.from(heritageDoc.querySelectorAll("a")).map((a) => a.getAttribute("href"))).toEqual([
      "/history",
      "/gallery",
      "/about",
    ]);
    expect(heritageDoc.querySelectorAll("a")[2]?.getAttribute("aria-current")).toBe("page");
  });

  it("renders DataPulseStrip KPI cards with static and linked items", async () => {
    const { DataPulseStrip } = await import("@/components/ui/hub-links");
    const html = renderToStaticMarkup(
      <DataPulseStrip
        eyebrow="Season & Club Pulse"
        items={[
          { label: "Played", value: 28, accent: "red" },
          { label: "PL Rank", value: "#1", sublabel: "68 pts", href: "/standings", accent: "gold" },
          { label: "Win Rate", value: "75%", accent: "emerald" },
          { label: "Upcoming", value: 10, href: "/predictions", accent: "muted" },
        ]}
      />,
    );

    const { document } = parseHTML(html);
    expect(document.querySelectorAll("a").length).toBe(2);
    expect(html).toContain("Season &amp; Club Pulse");
    expect(html).toContain("tabular-nums");
    expect(html).toContain("#1");
    expect(html).toContain("68 pts");
  });

  it("renders PresetConnectedGrid with 4 curated cards for every preset and applies metaOverrides", async () => {
    const { PresetConnectedGrid } = await import("@/components/ui/hub-links");
    const presets: ConnectedGridPreset[] = [
      "fromFixtures",
      "fromStandings",
      "fromStats",
      "fromSeason",
      "fromPredictions",
      "fromFixtureDetail",
      "fromSquad",
      "fromPlayer",
      "fromInjuries",
      "fromTransfers",
      "fromHistory",
      "fromGallery",
      "fromHome",
      "fromNews",
      "fromDigest",
      "fromAnalysis",
      "fromAbout",
      "fromProfile",
    ];

    for (const preset of presets) {
      const el = await PresetConnectedGrid({
        preset,
        metaOverrides: {
          standings: "1st · 68 pts",
          injuries: "3 flagged",
          squad: "26 players",
          fixtures: "Next vs Arsenal",
        },
      });
      const html = renderToStaticMarkup(el);
      const { document } = parseHTML(html);
      const links = document.querySelectorAll("a");
      expect(links.length, `${preset} card count`).toBe(4);
      expect(html).not.toContain("Hub.");
    }
  });
});
