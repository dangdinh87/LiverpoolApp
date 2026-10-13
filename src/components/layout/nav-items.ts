/**
 * Which section a path belongs to, shared by the header, the mobile bottom tab
 * bar and their tests. Paths are locale-less (use `usePathname` from
 * `@/i18n/navigation`, which strips the /en prefix).
 *
 * "Trận đấu" is one section: the season hub plus the fixture, standings and
 * stats pages it groups, so none of them needs its own top-level link.
 */

/** Active when on the page itself or any child route ("/" only matches exactly). */
export const isActivePath = (pathname: string, base: string) =>
  base === "/" ? pathname === "/" : pathname === base || pathname.startsWith(base + "/");

export const MATCH_PATHS = ["/season", "/fixtures", "/standings", "/stats"] as const;
export const SQUAD_PATHS = ["/squad", "/player", "/players"] as const;
/** Pages reached from the "Thêm" (More) sheet rather than a tab. */
export const MORE_PATHS = ["/analysis", "/history", "/gallery", "/about", "/legal", "/profile", "/auth"] as const;

export const isActiveAny = (pathname: string, bases: readonly string[]) =>
  bases.some((base) => isActivePath(pathname, base));

export type TabId = "home" | "matches" | "news" | "squad";

export const TABS: readonly { id: TabId; href: string; paths: readonly string[] }[] = [
  { id: "home", href: "/", paths: ["/"] },
  { id: "matches", href: "/fixtures", paths: MATCH_PATHS },
  { id: "news", href: "/news", paths: ["/news"] },
  { id: "squad", href: "/squad", paths: SQUAD_PATHS },
];

