"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Link, usePathname } from "@/i18n/navigation";
import { User, LogOut, Shield, ChevronDown, Flame } from "lucide-react";
import { useTranslations } from "next-intl";
import { BRAND } from "@/lib/brand";
import { BrandLogo } from "./brand-mark";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NavbarMobileSheet, type SheetNavSection } from "./navbar-mobile-sheet";
import {
  HERITAGE_PATHS,
  MATCH_PATHS,
  NEWS_PATHS,
  SQUAD_PATHS,
  isActiveAny,
  isActivePath,
} from "./nav-items";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/auth";
import type { UserProfile } from "@/lib/supabase";
import { hasSupabaseSession, loadSupabaseClient } from "@/lib/supabase-lazy";
import { useAuthStore } from "@/stores/auth-store";

// The sign-in form drags in the Supabase browser client (~60 KB gzip). The
// header is on every page, so load the form the first time the dialog opens.
const LoginForm = dynamic(() => import("@/components/auth/login-form").then((m) => m.LoginForm), {
  ssr: false,
  loading: () => <div aria-hidden className="h-80 border border-[var(--line)] bg-[var(--surface-2)]" />,
});

interface NavbarClientProps {
  user: { id: string; email: string | null } | null;
  profile: UserProfile | null;
}

type NavDropdownId = "matches" | "news" | "squad" | "club";

const DESKTOP_LINK =
  "relative inline-flex min-h-11 items-center whitespace-nowrap px-1.5 xl:px-2 2xl:px-3 text-sm font-barlow font-semibold uppercase tracking-[0.08em] 2xl:tracking-[0.12em] transition-colors";

function ActiveBar() {
  return <span aria-hidden className="absolute inset-x-1.5 bottom-1 h-0.5 bg-lfc-red" />;
}

export function NavbarClient({ user: initialUser, profile: initialProfile }: NavbarClientProps) {
  const t = useTranslations("Common.nav");
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<NavDropdownId | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navListRef = useRef<HTMLUListElement | null>(null);

  const cancelDropdownClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const openMenu = (id: NavDropdownId) => {
    cancelDropdownClose();
    setOpenDropdown(id);
  };
  const scheduleDropdownClose = () => {
    cancelDropdownClose();
    closeTimer.current = setTimeout(() => setOpenDropdown(null), 120);
  };
  useEffect(() => cancelDropdownClose, []);

  const [loginOpen, setLoginOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [authTick, setAuthTick] = useState(0);
  const [user, setUser] = useState(initialUser);
  const [profile, setProfile] = useState(initialProfile);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const pathname = usePathname();

  // Close open nav dropdown on route change, Escape key, or outside click.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setOpenDropdown(null); }, [pathname]);

  useEffect(() => {
    if (!openDropdown) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenDropdown(null);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (navListRef.current && !navListRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openDropdown]);

  useEffect(() => {
    const onAuthChanged = () => {
      setLoginOpen(false);
      setAuthTick((n) => n + 1);
    };
    window.addEventListener("lfc:auth-changed", onAuthChanged);
    return () => window.removeEventListener("lfc:auth-changed", onAuthChanged);
  }, []);

  const setAuthUser = useAuthStore((s) => s.setUser);
  useEffect(() => {
    let cancelled = false;

    async function syncAuth() {
      const signOut = () => {
        setUser(null);
        setProfile(null);
        setAuthUser(null);
      };
      let unsubscribe: (() => void) | undefined;
      try {
        if (!hasSupabaseSession()) return signOut();
        const supabase = await loadSupabaseClient();
        const { data: sub } = supabase.auth.onAuthStateChange((event) => {
          if (event === "SIGNED_OUT") signOut();
          else if (event === "SIGNED_IN") setAuthTick((n) => n + 1);
        });
        unsubscribe = () => sub.subscription.unsubscribe();
        const {
          data: { user: u },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!u) return signOut();
        setUser({ id: u.id, email: u.email ?? null });
        setAuthUser({ id: u.id });
        const { data } = await supabase.from("user_profiles").select("*").eq("user_id", u.id).maybeSingle();
        if (cancelled || !data) return;
        const p = data as UserProfile;
        setProfile(p);
        setAuthUser({ id: u.id, name: p.username ?? undefined, avatarUrl: p.avatar_url ?? undefined });
      } catch {
        // Unreachable auth service: stay as we are, the header just shows the guest actions.
      } finally {
        if (!cancelled) setAuthReady(true);
      }
      return unsubscribe;
    }

    let cleanupSub: (() => void) | undefined;
    void syncAuth().then((fn) => {
      if (typeof fn === "function") {
        if (cancelled) fn();
        else cleanupSub = fn;
      }
    });
    return () => {
      cancelled = true;
      cleanupSub?.();
    };
  }, [pathname, authTick, setAuthUser]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/streak").then((r) => r.json()).then((d) => setStreak(d.streak ?? 0)).catch(() => {});
  }, [user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const doLogout = () => {
    setUser(null);
    setProfile(null);
    setStreak(0);
    setAuthUser(null);
    void loadSupabaseClient().then((s) => s.auth.signOut()).catch(() => {});
    startTransition(() => logout());
  };
  const displayName = profile?.username ?? user?.email?.split("@")[0] ?? t("profile");

  const dropdownGroups: readonly {
    id: NavDropdownId;
    href: string;
    label: string;
    paths: readonly string[];
    items: readonly { href: string; label: string }[];
  }[] = [
    {
      id: "matches",
      href: "/fixtures",
      label: t("season"),
      paths: MATCH_PATHS,
      items: [
        { href: "/fixtures", label: t("fixtures") },
        { href: "/fixtures?view=results", label: t("results") },
        { href: "/standings", label: t("standings") },
        { href: "/stats", label: t("stats") },
        { href: "/predictions", label: t("predictions") },
        { href: "/season", label: t("seasonArchive") },
      ],
    },
    {
      id: "news",
      href: "/news",
      label: t("news"),
      paths: NEWS_PATHS,
      items: [
        { href: "/news", label: t("latestNews") },
        { href: "/news/digest", label: t("dailyBriefing") },
        { href: "/analysis", label: t("analysis") },
      ],
    },
    {
      id: "squad",
      href: "/squad",
      label: t("squad"),
      paths: SQUAD_PATHS,
      items: [
        { href: "/squad", label: t("firstTeam") },
        { href: "/injuries", label: t("injuries") },
        { href: "/transfers", label: t("transfers") },
      ],
    },
    {
      id: "club",
      href: "/history",
      label: t("club"),
      paths: HERITAGE_PATHS,
      items: [
        { href: "/history", label: t("history") },
        { href: "/gallery", label: t("clubGallery") },
        { href: "/about", label: t("about") },
      ],
    },
  ];

  const sheetSections: SheetNavSection[] = [
    {
      id: "matches",
      label: t("sections.matches"),
      links: [...dropdownGroups[0].items],
    },
    {
      id: "editorial",
      label: t("sections.editorial"),
      links: [...dropdownGroups[1].items],
    },
    {
      id: "squad",
      label: t("sections.squad"),
      links: [...dropdownGroups[2].items],
    },
    {
      id: "club",
      label: t("sections.club"),
      links: [...dropdownGroups[3].items, { href: "/legal", label: t("legal") }],
    },
  ];

  const avatar = (size: number) =>
    profile?.avatar_url && failedAvatarUrl !== profile.avatar_url ? (
      <Image
        src={profile.avatar_url}
        alt=""
        fill
        className="object-cover"
        sizes={`${size}px`}
        referrerPolicy="no-referrer"
        onError={() => setFailedAvatarUrl(profile.avatar_url)}
        unoptimized
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-stadium-surface2">
        <User size={Math.round(size / 2)} className="text-stadium-muted" aria-hidden />
      </div>
    );

  const streakBadge = user && streak > 0 && (
    <span
      className="inline-flex items-center gap-1 px-2 min-h-8 border border-orange-400/30 bg-orange-400/10 text-orange-300"
      title={`${t("streak")}: ${streak} ${streak === 1 ? t("day") : t("days")}`}
    >
      <Flame size={14} aria-hidden />
      <span className="font-bebas text-lg leading-none tabular-nums">{streak}</span>
      <span className="sr-only">{streak === 1 ? t("day") : t("days")}</span>
    </span>
  );

  const homeActive = isActivePath(pathname, "/");

  return (
    <header
      className={cn(
        "site-header fixed inset-x-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled
          ? "bg-stadium-bg/90 backdrop-blur-md border-[var(--line)]"
          : "bg-transparent border-transparent"
      )}
      style={{ top: "var(--live-banner-h, 0px)", height: "var(--header-h)" }}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 -z-10 h-24 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300",
          scrolled ? "opacity-0" : "opacity-100"
        )}
      />
      <nav aria-label={t("primary")} className="page-container flex h-full items-center justify-between gap-3">
        <Link href="/" prefetch={true} className="flex shrink-0 items-center min-h-11 text-white" aria-label={BRAND.name}>
          <BrandLogo markClassName="size-7 lg:size-8" wordmarkClassName="text-[19px] lg:text-[21px]" />
        </Link>

        {/* Desktop nav (from lg): 5 top-level items with hover + chevron dropdowns */}
        <ul ref={navListRef} className="hidden lg:flex items-center gap-1">
          <li>
            <Link
              href="/"
              prefetch={true}
              aria-current={homeActive ? "page" : undefined}
              className={cn(DESKTOP_LINK, homeActive ? "text-white" : "text-white/80 hover:text-white")}
            >
              {t("home")}
              {homeActive && <ActiveBar />}
            </Link>
          </li>

          {dropdownGroups.map(({ id, href, label, paths, items }) => {
            const active = isActiveAny(pathname, paths);
            const isOpen = openDropdown === id;
            return (
              <li
                key={id}
                className="relative flex items-center"
                onMouseEnter={() => openMenu(id)}
                onMouseLeave={scheduleDropdownClose}
              >
                <Link
                  href={href}
                  prefetch={true}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpenDropdown(null)}
                  className={cn(
                    DESKTOP_LINK,
                    "pr-0.5 xl:pr-1 2xl:pr-1",
                    active ? "text-white" : "text-white/80 hover:text-white",
                  )}
                >
                  {label}
                  {active && <ActiveBar />}
                </Link>
                <button
                  type="button"
                  aria-label={label}
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  onClick={() => setOpenDropdown(isOpen ? null : id)}
                  className={cn(
                    "inline-flex min-h-11 items-center px-1 cursor-pointer transition-colors",
                    isOpen || active ? "text-white" : "text-white/70 hover:text-white",
                  )}
                >
                  <ChevronDown
                    size={12}
                    aria-hidden
                    className={cn("transition-transform duration-200", isOpen && "rotate-180")}
                  />
                </button>

                {isOpen && (
                  <div
                    role="menu"
                    aria-label={label}
                    className="absolute left-0 top-full z-50 w-52 border border-[var(--line-strong)] bg-stadium-surface py-1 shadow-2xl"
                  >
                    {items.map((item) => {
                      const base = item.href.split("?")[0];
                      const itemActive =
                        item.href === "/fixtures?view=results"
                          ? false
                          : isActivePath(pathname, base) && (base !== "/news" || !isActivePath(pathname, "/news/digest"));
                      return (
                        <Link
                          key={item.href}
                          role="menuitem"
                          href={item.href}
                          prefetch={true}
                          onClick={() => setOpenDropdown(null)}
                          aria-current={itemActive ? "page" : undefined}
                          className={cn(
                            "flex min-h-11 items-center border-l-2 px-4 py-2.5 font-barlow text-sm font-semibold uppercase tracking-[0.1em] transition-colors",
                            itemActive
                              ? "border-lfc-red bg-stadium-surface2 text-white"
                              : "border-transparent text-stadium-muted hover:bg-stadium-surface2 hover:text-white",
                          )}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {/* Right side */}
        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-1 2xl:gap-2">
          {streakBadge}

          <LanguageSwitcher />

          {/* Auth slot (desktop). Fixed width so the swap never shifts neighbours. */}
          <div className="hidden lg:flex lg:w-40 lg:justify-end">
            {!authReady ? null : user ? (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="group flex min-h-11 max-w-full items-center gap-2 px-2 hover:bg-white/10 transition-colors cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lfc-red-text"
                    aria-label={`${t("profile")}: ${displayName}`}
                  >
                    <span className="relative size-7 shrink-0 overflow-hidden rounded-full ring-1 ring-white/20 group-hover:ring-lfc-red/60 transition-shadow">
                      {avatar(28)}
                    </span>
                    <span className="truncate font-barlow text-sm font-semibold uppercase tracking-wider text-white/80 group-hover:text-white">
                      {displayName}
                    </span>
                    <ChevronDown size={12} aria-hidden className="shrink-0 text-white/70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={6} className="w-60 p-0 bg-stadium-surface border-[var(--line-strong)] shadow-2xl">
                  <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--line)]">
                    <span className="relative size-11 shrink-0 overflow-hidden rounded-full ring-2 ring-lfc-red/40">{avatar(44)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-inter text-sm font-semibold leading-tight text-white">{displayName}</p>
                      <p className="truncate font-inter text-xs text-stadium-muted">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line)] bg-stadium-bg/50">
                    <span className="flex items-center gap-1.5 font-barlow text-xs uppercase tracking-wider text-stadium-muted">
                      <Flame size={14} aria-hidden className={streak > 0 ? "text-orange-400" : "text-stadium-muted"} />
                      {t("streak")}
                    </span>
                    <span className={cn("font-bebas text-lg leading-none tabular-nums", streak > 0 ? "text-orange-400" : "text-stadium-muted")}>
                      {streak} {streak === 1 ? t("day") : t("days")}
                    </span>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex min-h-11 items-center gap-2.5 px-4 text-sm font-inter text-white cursor-pointer rounded-none focus:bg-stadium-surface2">
                      <User size={14} className="text-stadium-muted" aria-hidden />
                      {t("profile")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isPending}
                    onSelect={doLogout}
                    className="min-h-11 gap-2.5 px-4 text-sm font-inter text-stadium-muted cursor-pointer rounded-none border-t border-[var(--line)] focus:bg-stadium-surface2 focus:text-white"
                  >
                    <LogOut size={14} aria-hidden />
                    {t("logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => setLoginOpen(true)}
                className="min-h-11 bg-lfc-red hover:bg-lfc-red-dark text-white font-barlow font-bold uppercase tracking-[0.12em] text-sm"
              >
                <Shield size={14} aria-hidden />
                {t("members")}
              </Button>
            )}
          </div>

          <NavbarMobileSheet
            mounted={mounted}
            authReady={authReady}
            isSignedIn={!!user}
            isPending={isPending}
            sheetSections={sheetSections}
            onOpenLogin={() => setLoginOpen(true)}
            onLogout={doLogout}
          />
        </div>
      </nav>

      {/* Login popup */}
      {!user && (
        <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
          <DialogContent
            aria-describedby={undefined}
            className="bg-transparent border-none shadow-none p-0 sm:max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto"
            showCloseButton={false}
          >
            <DialogTitle className="sr-only">{t("memberLogin")}</DialogTitle>
            <LoginForm embedded onClose={() => setLoginOpen(false)} />
          </DialogContent>
        </Dialog>
      )}
    </header>
  );
}
