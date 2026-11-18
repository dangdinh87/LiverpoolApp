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
import { NavbarMobileSheet, type SheetNavLink } from "./navbar-mobile-sheet";
import { MATCH_PATHS, SQUAD_PATHS, TABS, isActiveAny, isActivePath } from "./nav-items";
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

const DESKTOP_LINK =
  "relative inline-flex min-h-11 items-center whitespace-nowrap px-1.5 xl:px-2 2xl:px-3 text-sm font-barlow font-semibold uppercase tracking-[0.08em] 2xl:tracking-[0.12em] transition-colors";

function ActiveBar() {
  return <span aria-hidden className="absolute inset-x-3 bottom-1 h-0.5 bg-lfc-red" />;
}

export function NavbarClient({ user: initialUser, profile: initialProfile }: NavbarClientProps) {
  const t = useTranslations("Common.nav");
  const [scrolled, setScrolled] = useState(false);
  const [clubMenuOpen, setClubMenuOpen] = useState(false);
  const clubCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelClubMenuClose = () => {
    if (clubCloseTimer.current) clearTimeout(clubCloseTimer.current);
    clubCloseTimer.current = null;
  };
  const scheduleClubMenuClose = () => {
    cancelClubMenuClose();
    clubCloseTimer.current = setTimeout(() => setClubMenuOpen(false), 150);
  };
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
  const [authReady, setAuthReady] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [user, setUser] = useState(initialUser);
  const [profile, setProfile] = useState(initialProfile);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const pathname = usePathname();

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
  }, [pathname, setAuthUser]);

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
    startTransition(() => logout());
  };
  const displayName = profile?.username ?? user?.email?.split("@")[0] ?? t("profile");

  const mainLinks = [
    { href: "/", label: t("home"), paths: ["/"] as readonly string[] },
    { href: "/fixtures", label: t("season"), paths: MATCH_PATHS as readonly string[] },
    { href: "/news", label: t("news"), paths: ["/news"] as readonly string[] },
    { href: "/analysis", label: t("analysis"), paths: ["/analysis"] as readonly string[] },
    { href: "/squad", label: t("squad"), paths: SQUAD_PATHS as readonly string[] },
  ];
  const clubActive = isActivePath(pathname, "/history") || isActivePath(pathname, "/gallery");

  const sheetLinks: SheetNavLink[] = [
    ...mainLinks.map(({ href, label, paths }) => ({
      href,
      label,
      paths,
      inTabBar: TABS.some((tab) => tab.href === href),
    })),
    { href: "/history", label: t("history"), paths: ["/history"], inTabBar: false },
    { href: "/gallery", label: t("clubGallery"), paths: ["/gallery"], inTabBar: false },
    { href: "/about", label: t("about"), paths: ["/about"], inTabBar: false },
    { href: "/legal", label: t("legal"), paths: ["/legal"], inTabBar: false },
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
        <Link href="/" className="flex shrink-0 items-center min-h-11 text-white" aria-label={BRAND.name}>
          <BrandLogo markClassName="size-8 lg:size-9" wordmarkClassName="text-[26px] lg:text-[30px]" />
        </Link>

        {/* Desktop nav (from lg) */}
        <ul className="hidden lg:flex items-center gap-0.5">
          {mainLinks.map(({ href, label, paths }) => {
            const active = isActiveAny(pathname, paths);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(DESKTOP_LINK, active ? "text-white" : "text-white/80 hover:text-white")}
                >
                  {label}
                  {active && <ActiveBar />}
                </Link>
              </li>
            );
          })}

          <li>
            <DropdownMenu modal={false} open={clubMenuOpen} onOpenChange={setClubMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  onMouseEnter={openClubMenuOnHover}
                  onMouseLeave={scheduleClubMenuClose}
                  onKeyDown={() => {
                    openedByHover.current = false;
                  }}
                  onPointerDown={(e) => {
                    if (e.pointerType === "mouse" && clubMenuOpen) e.preventDefault();
                  }}
                  className={cn(DESKTOP_LINK, "gap-1 cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lfc-red-text", clubActive ? "text-white" : "text-white/80 hover:text-white")}
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
            sheetLinks={sheetLinks}
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
