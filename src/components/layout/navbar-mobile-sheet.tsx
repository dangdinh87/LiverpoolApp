"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { Menu, Shield, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { BRAND } from "@/lib/brand";
import { BrandLogo } from "./brand-mark";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { isActiveAny } from "./nav-items";
import { useMenuStore } from "./menu-store";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface SheetNavLink {
  href: string;
  label: string;
  paths: readonly string[];
  inTabBar: boolean;
}

interface NavbarMobileSheetProps {
  mounted: boolean;
  authReady: boolean;
  isSignedIn: boolean;
  isPending: boolean;
  sheetLinks: SheetNavLink[];
  onOpenLogin: () => void;
  onLogout: () => void;
}

export function NavbarMobileSheet({
  mounted,
  authReady,
  isSignedIn,
  isPending,
  sheetLinks,
  onOpenLogin,
  onLogout,
}: NavbarMobileSheetProps) {
  const t = useTranslations("Common.nav");
  const pathname = usePathname();
  const menuOpen = useMenuStore((st) => st.open);
  const setMenuOpen = useMenuStore((st) => st.setOpen);

  if (!mounted) {
    return (
      <button className="lg:hidden inline-flex size-11 items-center justify-center text-white" aria-label={t("menu")}>
        <Menu size={24} aria-hidden />
      </button>
    );
  }

  return (
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
        // Opened from the "Thêm" tab: hand focus back to that tab, not the hamburger.
        onCloseAutoFocus={(e) => {
          const { returnFocusTo, clearReturnFocus } = useMenuStore.getState();
          if (!returnFocusTo) return;
          e.preventDefault();
          returnFocusTo.focus();
          clearReturnFocus();
        }}
        className="w-full max-w-none sm:max-w-none bg-stadium-bg border-none gap-0 overflow-y-auto"
      >
        <div className="flex h-[var(--header-h)] shrink-0 items-center justify-between px-4 border-b border-[var(--line)]">
          <span className="flex items-center text-white">
            <BrandLogo markClassName="size-8" wordmarkClassName="text-[26px]" />
            <span className="sr-only">{BRAND.name}</span>
          </span>
          <SheetClose asChild>
            <button className="inline-flex size-11 items-center justify-center text-white" aria-label={t("closeMenu")}>
              <X size={24} aria-hidden />
            </button>
          </SheetClose>
        </div>

        <ul className="px-4 py-2">
          {sheetLinks.map(({ href, label, paths, inTabBar }) => {
            const active = isActiveAny(pathname, paths);
            return (
              <li key={href} className={cn("border-b border-[var(--line)]", inTabBar && "max-md:hidden")}>
                <SheetClose asChild>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-14 items-center gap-3 font-bebas text-3xl uppercase tracking-wide transition-colors",
                      active ? "text-white" : "text-white/75 hover:text-white",
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
          <LanguageSwitcher variant="segmented" />
          {!authReady ? (
            <div className="min-h-12" />
          ) : isSignedIn ? (
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
                onClick={onLogout}
                className="min-h-12 font-barlow font-semibold uppercase tracking-[0.12em] text-stadium-muted hover:text-white cursor-pointer disabled:opacity-50"
              >
                {t("logout")}
              </button>
            </>
          ) : (
            <SheetClose asChild>
              <button
                type="button"
                onClick={onOpenLogin}
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
  );
}
