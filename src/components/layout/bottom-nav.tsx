"use client";

import { CalendarDays, Ellipsis, House, Newspaper, Users, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { MORE_PATHS, TABS, isActiveAny, type TabId } from "./nav-items";
import { useMenuStore } from "./menu-store";

const ICONS: Record<TabId, LucideIcon> = {
  home: House,
  matches: CalendarDays,
  news: Newspaper,
  squad: Users,
};

// 56px tall cells that span a fifth of the width (78px on a 390px phone), so
// every tab is far past the 44px touch minimum. Labels stay 13px: no tiny caps.
const CELL =
  "relative flex h-14 w-full flex-col items-center justify-center gap-1 px-1 font-barlow text-[13px] font-semibold uppercase leading-none tracking-[0.06em] transition-colors [-webkit-tap-highlight-color:transparent] active:bg-white/5";

function ActiveMark() {
  // Red bar on the top edge: state is never colour alone (the icon also gets a heavier stroke).
  return <span aria-hidden className="absolute inset-x-6 top-0 h-0.5 bg-lfc-red" />;
}

/**
 * Phone navigation (< md): the four sections people open all day, plus "Thêm"
 * for the secondary pages. Rendered after the footer so keyboard order stays
 * header, content, footer, bar. It reserves space through `--bottom-nav-offset`
 * (see globals.css), which the footer, the chat button and scroll-to-top use.
 */
export function BottomNav() {
  const t = useTranslations("Common.nav");
  const pathname = usePathname();
  const menuOpen = useMenuStore((s) => s.open);
  const openFrom = useMenuStore((s) => s.openFrom);


  const moreActive = menuOpen || isActiveAny(pathname, MORE_PATHS);

  return (
    <nav
      aria-label={t("quick")}
      className="bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line-strong)] bg-stadium-bg/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {TABS.map(({ id, href, paths }) => {
          const active = isActiveAny(pathname, paths);
          const Icon = ICONS[id];
          return (
            <li key={id}>
              <Link
                href={href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={cn(CELL, active ? "text-white" : "text-stadium-muted")}
              >
                {active && <ActiveMark />}
                <Icon size={22} strokeWidth={active ? 2.5 : 2} aria-hidden />
                {t(`tabs.${id}`)}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={(e) => openFrom(e.currentTarget)}
            className={cn(CELL, "cursor-pointer", moreActive ? "text-white" : "text-stadium-muted")}
          >
            {moreActive && <ActiveMark />}
            <Ellipsis size={22} strokeWidth={moreActive ? 2.5 : 2} aria-hidden />
            {t("tabs.more")}
          </button>
        </li>
      </ul>
    </nav>
  );
}
