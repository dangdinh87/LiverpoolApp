"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Image from "next/image";
// usePathname from @/i18n/navigation (not next/navigation): it strips the /en
// prefix, so active-link checks against bare paths like "/history" still work
// on English pages.
import { usePathname } from "@/i18n/navigation";
import { Menu, User, LogOut, Shield, ChevronDown, Flame, Bird, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
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
  nextMatchDate?: string | null;
  isMatchLive?: boolean;
}

/** Active when on the page itself or any child route ("/" only matches exactly). */
const isActivePath = (pathname: string, base: string) =>
  base === "/" ? pathname === "/" : pathname === base || pathname.startsWith(base + "/");

const DESKTOP_LINK =
  // whitespace-nowrap: Vietnamese labels ("Trang chủ", "Tin tức") are two words and
  // wrapped onto two lines at 1440px. Padding/tracking only widen at 2xl: at xl (1280) the
  // Vietnamese row was 1174px wide inside the 1088px page container, so the right-hand
  // group ran 86px past the container (and 1px past the viewport at 1024).
  "relative inline-flex min-h-10 items-center whitespace-nowrap px-1.5 xl:px-2 2xl:px-3 text-sm font-barlow font-semibold uppercase tracking-[0.08em] 2xl:tracking-[0.12em] transition-colors";

function ActiveBar() {
  return <span aria-hidden className="absolute inset-x-3 bottom-1 h-0.5 bg-lfc-red" />;
}

export function NavbarClient({ user: initialUser, profile: initialProfile, nextMatchDate, isMatchLive }: NavbarClientProps) {
  const t = useTranslations("Common.nav");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clubMenuOpen, setClubMenuOpen] = useState(false);
  // Hover-to-open with a short grace period: the menu content is portalled, so
  // moving from the trigger to the menu briefly leaves both elements.
  const clubCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelClubMenuClose = () => {
    if (clubCloseTimer.current) clearTimeout(clubCloseTimer.current);
    clubCloseTimer.current = null;
  };
  const scheduleClubMenuClose = () => {
    cancelClubMenuClose();
    clubCloseTimer.current = setTimeout(() => setClubMenuOpen(false), 150);
  };
  // True while the menu was opened by pointer hover: closing it must not pull
  // focus onto the trigger (that painted a stray focus ring after mouse use).
  const openedByHover = useRef(false);
  const openClubMenuOnHover = () => {
    cancelClubMenuClose();
    openedByHover.current = true;
    setClubMenuOpen(true);
  };
  useEffect(() => cancelClubMenuClose, []);
  const [loginOpen, setLoginOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [mounted, setMounted] = useState(false);
  // False until the first client auth check settles, so the auth slot renders
  // an empty placeholder instead of flashing "Members" for signed-in users.
  const [authReady, setAuthReady] = useState(false);
  const [matchStartsSoon, setMatchStartsSoon] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [user, setUser] = useState(initialUser);
  const [profile, setProfile] = useState(initialProfile);
  const pathname = usePathname();

  // Client-side auth fetch — replaces server-side cookies() dependency.
  // The Supabase browser client is ~60 KB gzip, so it is imported only when a
  // session cookie exists (signed-in visitors); see supabase-lazy.ts.
  const setAuthUser = useAuthStore((s) => s.setUser);
  useEffect(() => {
    let cancelled = false;

    async function syncAuth() {
      const signOut = () => {
        setUser(null);
        setProfile(null);
        setAuthUser(null);
      };
      try {
        // No session cookie = guest; don't even load the Supabase client.
        if (!hasSupabaseSession()) return signOut();
        const supabase = await loadSupabaseClient();
        const {
          data: { user: u },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!u) return signOut();
        setUser({ id: u.id, email: u.email ?? null });
        setAuthUser({ id: u.id, email: u.email ?? undefined });
        const { data } = await supabase.from("user_profiles").select("*").eq("user_id", u.id).single();
        if (cancelled || !data) return;
        const p = data as UserProfile;
        setProfile(p);
        setAuthUser({ id: u.id, email: u.email ?? undefined, name: p.username ?? undefined, avatarUrl: p.avatar_url ?? undefined });
      } catch {
        // Unreachable auth service: stay as we are, the header just shows the guest actions.
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    }

    void syncAuth();
    return () => {
      cancelled = true;
    };
  }, [setAuthUser]);

  // Fetch & record streak on mount (authenticated users only)
  useEffect(() => {
    if (!user) return;
    fetch("/api/streak").then((r) => r.json()).then((d) => setStreak(d.streak ?? 0)).catch(() => {});
  }, [user]);

  // Client-only chrome: the flag must flip after hydration, never during it.
  useEffect(() => { setMounted(true); }, []);

  /**
   * Whether kick-off is inside the next 30 minutes.
   *
   * Derived after mount and refreshed on a timer, not during render. This
   * component is server-rendered too, and a render-time `Date.now()` disagrees
   * with the value the browser computes a moment later — that mismatch failed
   * hydration (React #418) on every page showing the navbar, intermittently,
   * whenever the 30-minute boundary fell between the two. The timer also lets
   * the badge appear on its own instead of waiting for a reload.
   */
  useEffect(() => {
    if (isMatchLive || !nextMatchDate) {
      // Clearing the badge is the early-return branch of the timer below.
      setMatchStartsSoon(false);
      return;
    }
    const kickOff = new Date(nextMatchDate).getTime();
    const sync = () => {
      const untilKickOff = kickOff - Date.now();
      setMatchStartsSoon(untilKickOff > 0 && untilKickOff <= 30 * 60_000);
    };
    sync();
    const timer = setInterval(sync, 30_000);
    return () => clearInterval(timer);
  }, [isMatchLive, nextMatchDate]);

  // Solid-on-scroll. State only flips when crossing the threshold, so scrolling
  // does not re-render. The header height never changes (no layout shift).
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const doLogout = () => startTransition(() => logout());
  const displayName = profile?.username ?? user?.email?.split("@")[0] ?? t("profile");

  const mainLinks = [
    { href: "/", label: t("home") },
    { href: "/news", label: t("news"), hot: true },
    { href: "/squad", label: t("squad") },
    { href: "/season", label: t("season"), soon: matchStartsSoon },
    { href: "/stats", label: t("stats") },
  ];
  const clubActive = isActivePath(pathname, "/history") || isActivePath(pathname, "/gallery");

  const mobileLinks = [
    ...mainLinks.map(({ href, label }) => ({ href, label })),
    { href: "/history", label: `${t("history")} · ${t("clubOverview")}` },
    { href: "/gallery", label: `${t("history")} · ${t("clubGallery")}` },
    { href: "/about", label: t("about") },
  ];

  const avatar = (size: number) =>
    profile?.avatar_url ? (
      <Image src={profile.avatar_url} alt="" fill className="object-cover" sizes={`${size}px`} unoptimized />
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
      {/* Top scrim keeps icons legible over hero photos while the header is transparent */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 -z-10 h-24 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300",
          scrolled ? "opacity-0" : "opacity-100"
        )}
      />
      <nav aria-label={t("primary")} className="page-container flex h-full items-center justify-between gap-3">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5 min-h-10" aria-label="LFCVN">
          <Image
            src="/assets/lfc/crest.webp"
            alt=""
            width={32}
            height={40}
            className="h-8 w-auto lg:h-9"
            priority
          />
          <span className="font-barlow font-bold uppercase text-white tracking-[0.2em] text-base">LFCVN</span>
        </Link>

        {/* Desktop nav (from lg) */}
        <ul className="hidden lg:flex items-center gap-0.5">
          {mainLinks.map(({ href, label, hot, soon }) => {
            const active = isActivePath(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(DESKTOP_LINK, active ? "text-white" : "text-white/80 hover:text-white")}
                >
                  {label}
                  {hot && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[11px] font-bold leading-none bg-lfc-red text-white uppercase">
                      {t("hot")}
                    </span>
                  )}
                  {soon && (
                    <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-bold leading-none bg-lfc-red text-white uppercase whitespace-nowrap">
                      <span className="size-1.5 rounded-full bg-white animate-pulse" />
                      {t("matchSoon")}
                    </span>
                  )}
                  {active && <ActiveBar />}
                </Link>
              </li>
            );
          })}

          {/* Club dropdown — Radix menu: keyboard operable, aria-expanded; opens on hover too */}
          <li>
            <DropdownMenu modal={false} open={clubMenuOpen} onOpenChange={setClubMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  onMouseEnter={openClubMenuOnHover}
                  onMouseLeave={scheduleClubMenuClose}
                  onKeyDown={() => {
                    openedByHover.current = false;
                  }}
                  // Hover already opened it: stop Radix's pointerdown toggle from
                  // closing the menu on the click that usually follows. Touch and
                  // keyboard keep the normal toggle.
                  onPointerDown={(e) => {
                    if (e.pointerType === "mouse" && clubMenuOpen) e.preventDefault();
                  }}
                  className={cn(DESKTOP_LINK, "gap-1 cursor-pointer outline-none", clubActive ? "text-white" : "text-white/80 hover:text-white")}
                >
                  {t("history")}
                  <ChevronDown size={12} aria-hidden className={cn("transition-transform duration-200", clubMenuOpen && "rotate-180")} />
                  {clubActive && <ActiveBar />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={0}
                onMouseEnter={cancelClubMenuClose}
                onMouseLeave={scheduleClubMenuClose}
                onCloseAutoFocus={(e) => {
                  if (openedByHover.current) e.preventDefault();
                }}
                className="w-48 p-0 bg-stadium-surface border-[var(--line-strong)] shadow-2xl"
              >
                {[
                  { href: "/history", label: t("clubOverview") },
                  { href: "/gallery", label: t("clubGallery") },
                ].map(({ href, label }) => (
                  <DropdownMenuItem key={href} asChild>
                    <Link
                      href={href}
                      aria-current={pathname === href ? "page" : undefined}
                      className={cn(
                        "block min-h-11 px-4 py-3 text-sm font-barlow font-semibold uppercase tracking-[0.12em] cursor-pointer rounded-none",
                        pathname === href
                          ? "text-white bg-stadium-surface2"
                          : "text-stadium-muted hover:text-white hover:bg-stadium-surface2 focus:bg-stadium-surface2 focus:text-white"
                      )}
                    >
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>

          <li>
            <Link
              href="/about"
              aria-current={pathname === "/about" ? "page" : undefined}
              className={cn(DESKTOP_LINK, pathname === "/about" ? "text-white" : "text-white/80 hover:text-white")}
            >
              {t("about")}
              {pathname === "/about" && <ActiveBar />}
            </Link>
          </li>
        </ul>

        {/* Right side */}
        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-1 2xl:gap-2">
          {streakBadge}

          {/* AI chat: labelled pill on desktop, icon-only on phones */}
          <Link
            href="/chat"
            aria-label="LiverBird AI"
            className="ai-btn group relative hidden lg:flex items-center gap-1.5 min-h-10 whitespace-nowrap px-3 2xl:px-4 rounded-full text-sm font-barlow font-semibold uppercase tracking-wider"
          >
            <Bird size={16} className="relative z-1 text-white" aria-hidden />
            {/* Label from 2xl; icon-only below so the row fits the page container */}
            <span className="ai-btn-text hidden 2xl:inline">LiverBird AI</span>
            <span className="ai-btn-shimmer" />
          </Link>
          <Link
            href="/chat"
            aria-label="LiverBird AI"
            className="lg:hidden inline-flex size-11 items-center justify-center text-white/90 hover:text-white"
          >
            <Bird size={22} aria-hidden />
          </Link>

          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>

          {/* Auth slot (desktop). Fixed width so the swap never shifts neighbours. */}
          <div className="hidden lg:flex lg:w-40 lg:justify-end">
            {!authReady ? null : user ? (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="group flex min-h-10 max-w-full items-center gap-2 px-2 hover:bg-white/10 transition-colors cursor-pointer outline-none"
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
                    <span className={cn("font-bebas text-lg leading-none", streak > 0 ? "text-orange-400" : "text-stadium-muted")}>
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
                className="min-h-10 bg-lfc-red hover:bg-lfc-red-dark text-white font-barlow font-bold uppercase tracking-[0.12em] text-sm"
              >
                <Shield size={14} aria-hidden />
                {t("members")}
              </Button>
            )}
          </div>

          {/* Mobile menu — Sheet mounts after hydration to avoid a Radix id mismatch */}
          {!mounted ? (
            <button className="lg:hidden inline-flex size-11 items-center justify-center text-white" aria-label={t("menu")}>
              <Menu size={24} aria-hidden />
            </button>
          ) : (
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button className="lg:hidden inline-flex size-11 items-center justify-center text-white" aria-label={t("menu")}>
                  <Menu size={24} aria-hidden />
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                showCloseButton={false}
                title={t("primary")}
                className="w-full max-w-none sm:max-w-none bg-stadium-bg border-none gap-0 overflow-y-auto"
              >
                <div className="flex h-[var(--header-h)] shrink-0 items-center justify-between px-4 border-b border-[var(--line)]">
                  <span className="flex items-center gap-2.5">
                    <Image src="/assets/lfc/crest.webp" alt="" width={32} height={40} className="h-8 w-auto" />
                    <span className="font-barlow font-bold uppercase text-white tracking-[0.2em]">LFCVN</span>
                  </span>
                  <SheetClose asChild>
                    <button className="inline-flex size-11 items-center justify-center text-white" aria-label={t("closeMenu")}>
                      <X size={24} aria-hidden />
                    </button>
                  </SheetClose>
                </div>

                <ul className="px-4 py-2">
                  {mobileLinks.map(({ href, label }) => {
                    const active = isActivePath(pathname, href);
                    return (
                      <li key={href} className="border-b border-[var(--line)]">
                        <SheetClose asChild>
                          <Link
                            href={href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex min-h-14 items-center gap-3 font-bebas text-3xl uppercase tracking-wide transition-colors",
                              active ? "text-white" : "text-white/75 hover:text-white"
                            )}
                          >
                            <span aria-hidden className={cn("h-6 w-1", active ? "bg-lfc-red" : "bg-transparent")} />
                            {label}
                          </Link>
                        </SheetClose>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-auto flex flex-col gap-3 px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                  <SheetClose asChild>
                    <Link
                      href="/chat"
                      className="flex min-h-12 items-center justify-center gap-2 border border-lfc-red/40 bg-lfc-red/10 font-barlow font-bold uppercase tracking-[0.12em] text-white"
                    >
                      <Bird size={18} aria-hidden />
                      LiverBird AI
                    </Link>
                  </SheetClose>
                  <LanguageSwitcher variant="segmented" />
                  {!authReady ? (
                    <div className="min-h-12" />
                  ) : user ? (
                    <>
                      <SheetClose asChild>
                        <Link
                          href="/profile"
                          className="flex min-h-12 items-center justify-center gap-2 border border-[var(--line-strong)] font-barlow font-bold uppercase tracking-[0.12em] text-white"
                        >
                          <Shield size={14} aria-hidden className="text-lfc-red-text" />
                          {t("memberArea")}
                        </Link>
                      </SheetClose>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={doLogout}
                        className="min-h-12 font-barlow font-semibold uppercase tracking-[0.12em] text-stadium-muted hover:text-white cursor-pointer disabled:opacity-50"
                      >
                        {t("logout")}
                      </button>
                    </>
                  ) : (
                    <SheetClose asChild>
                      <button
                        type="button"
                        onClick={() => setLoginOpen(true)}
                        className="flex min-h-12 items-center justify-center gap-2 bg-lfc-red font-barlow font-bold uppercase tracking-[0.12em] text-white hover:bg-lfc-red-dark cursor-pointer"
                      >
                        <Shield size={14} aria-hidden />
                        {t("members")}
                      </button>
                    </SheetClose>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </nav>

      {/* Login popup */}
      {!user && (
        <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
          <DialogContent
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
