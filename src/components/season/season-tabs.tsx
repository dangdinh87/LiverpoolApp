"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChipBar } from "@/components/fixtures/chip-bar";

const TAB_IDS = ["fixtures", "standings"] as const;
type TabId = (typeof TAB_IDS)[number];

interface SeasonTabsProps {
  fixturesPanel: ReactNode;
  standingsPanel: ReactNode;
  defaultTab?: string;
  matchCount: number;
  teamCount: number;
}

/**
 * Fixtures / Table switch. Both panels are server-rendered and stay in the
 * DOM (crawlable); the inactive one is just hidden.
 */
export function SeasonTabs({ fixturesPanel, standingsPanel, defaultTab, matchCount, teamCount }: SeasonTabsProps) {
  const t = useTranslations("Season");
  const [active, setActive] = useState<TabId>(TAB_IDS.includes(defaultTab as TabId) ? (defaultTab as TabId) : "fixtures");

  // Keep ?tab= in the URL (shallow) so a refresh or shared link lands on the same tab.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (active === "fixtures") url.searchParams.delete("tab");
    else url.searchParams.set("tab", active);
    window.history.replaceState(window.history.state, "", url.toString());
  }, [active]);

  return (
    <>
      <ChipBar
        sticky
        ariaLabel={t("tabsLabel")}
        active={active}
        onSelect={(k) => setActive(k as TabId)}
        items={[
          { key: "fixtures", label: t("tabs.fixtures"), count: matchCount },
          { key: "standings", label: t("tabs.standings"), count: teamCount },
        ]}
      />
      <div className="pt-4">
        <div hidden={active !== "fixtures"}>{fixturesPanel}</div>
        <div hidden={active !== "standings"}>{standingsPanel}</div>
      </div>
    </>
  );
}
