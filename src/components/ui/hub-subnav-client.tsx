"use client";

import { useTranslations } from "next-intl";
import { SubNavBar, type SubNavItem } from "@/components/ui/sub-nav-bar";

type ClientHubGroup = "editorial" | "club" | "heritage";

type EditorialSlug = "news" | "digest" | "analysis";
type ClubSlug = "squad" | "injuries" | "transfers";
type HeritageSlug = "history" | "gallery" | "about";

type HubNavKey =
  | "news"
  | "dailyBriefing"
  | "analysis"
  | "squad"
  | "injuries"
  | "transfers"
  | "history"
  | "gallery"
  | "about";

const HUB_ITEMS: Record<ClientHubGroup, readonly { slug: string; href: string; labelKey: HubNavKey }[]> = {
  editorial: [
    { slug: "news", href: "/news", labelKey: "news" },
    { slug: "digest", href: "/news/digest", labelKey: "dailyBriefing" },
    { slug: "analysis", href: "/analysis", labelKey: "analysis" },
  ],
  club: [
    { slug: "squad", href: "/squad", labelKey: "squad" },
    { slug: "injuries", href: "/injuries", labelKey: "injuries" },
    { slug: "transfers", href: "/transfers", labelKey: "transfers" },
  ],
  heritage: [
    { slug: "history", href: "/history", labelKey: "history" },
    { slug: "gallery", href: "/gallery", labelKey: "gallery" },
    { slug: "about", href: "/about", labelKey: "about" },
  ],
};

export interface HubSubNavClientProps {
  group: ClientHubGroup;
  current: EditorialSlug | ClubSlug | HeritageSlug;
  className?: string;
}

/**
 * Client-safe sub-navigation bar for `loading.tsx` skeletons so hub tabs
 * stay interactive and pixel-identical during route transitions.
 */
export function HubSubNavClient({ group, current, className }: HubSubNavClientProps) {
  const t = useTranslations("Common.nav");
  const items: SubNavItem[] = HUB_ITEMS[group].map((entry) => ({
    slug: entry.slug,
    href: entry.href,
    label: t(entry.labelKey),
  }));

  return <SubNavBar ariaLabel={t("quick")} items={items} current={current} className={className} />;
}
