"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { Menu, Shield, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { BRAND } from "@/lib/brand";
import { BrandLogo } from "./brand-mark";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { isActivePath } from "./nav-items";
import { useMenuStore } from "./menu-store";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface SheetNavLink {
  href: string;
  label: string;
}

export interface SheetNavSection {
  id: "matches" | "editorial" | "squad" | "club";
  label: string;
  links: SheetNavLink[];
}

interface NavbarMobileSheetProps {
  mounted: boolean;
  authReady: boolean;
  isSignedIn: boolean;
  isPending: boolean;
  sheetSections: SheetNavSection[];
  onOpenLogin: () => void;
  onLogout: () => void;
}

export function NavbarMobileSheet({
  mounted,
  authReady,
  isSignedIn,
  isPending,
  sheetSections,
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
            <BrandLogo markClassName="size-7" wordmarkClassName="text-[19px]" />
            <span className="sr-only">{BRAND.name}</span>
          </span>
          <SheetClose asChild>
            <button className="inline-flex size-11 items-center justify-center text-white" aria-label={t("closeMenu")}>
              <X size={24} aria-hidden />
            </button>
          </SheetClose>
        </div>

        <div className="px-4 py-4 space-y-5">
          {/* Tablet-only Home link (on phones Home lives in BottomNav) */}
          <div className="max-md:hidden border-b border-[var(--line)] pb-3">
            <SheetClose asChild>
              <Link
                href="/"
                prefetch={true}
                aria-current={pathname === "/" ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 px-2 font-barlow text-base font-semibold uppercase tracking-[0.08em] transition-colors",
                  pathname === "/" ? "border-l-2 border-lfc-red bg-white/[0.06] text-white" : "text-white/80 hover:text-white",
                )}
              >
                {t("home")}
              </Link>
            </SheetClose>
          </div>

          {sheetSections.map((section) => (
            <section key={section.id} aria-label={section.label}>
              <h2 className="section-label mb-2 text-stadium-muted">{section.label}</h2>
              <ul className="grid grid-cols-2 gap-1.5 border-b border-[var(--line)] pb-4">
                {section.links.map(({ href, label }) => {
                  const basePath = href.split("?")[0];
                  const active = href === "/fixtures?view=results" ? false : isActivePath(pathname, basePath);
                  return (
                    <li key={href}>
                      <SheetClose asChild>
                        <Link
                          href={href}
                          prefetch={true}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex min-h-11 items-center border-l-2 px-3 font-barlow text-sm font-semibold uppercase tracking-[0.06em] transition-colors",
                            active
                              ? "border-lfc-red bg-white/[0.06] text-white"
                              : "border-transparent bg-[var(--surface-1)] text-white/80 hover:bg-[var(--surface-2)] hover:text-white",
                          )}
                        >
                          {label}
                        </Link>
                      </SheetClose>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

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
