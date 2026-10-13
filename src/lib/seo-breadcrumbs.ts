import { getTranslations } from "next-intl/server";
import { buildBreadcrumbJsonLd, getLocalizedUrl } from "./seo";

/** Sections whose breadcrumb label is the navigation label (`Common.nav.<key>`). */
type NavKey =
  | "squad"
  | "fixtures"
  | "standings"
  | "stats"
  | "gallery"
  | "history"
  | "about"
  | "news"
  | "analysis";

/** One step after Home: an unprefixed app path plus either its own name or a nav label. */
export type Crumb = { path: string } & ({ name: string } | { nav: NavKey });

/**
 * BreadcrumbList for a page rendered in `locale`.
 *
 * Every page used to build this by hand with `getCanonical()` and English
 * labels, so a Vietnamese page's breadcrumb read "Home › Squad" and pointed at
 * the English URLs — structured data contradicting the page's own canonical and
 * language. Home is prepended here, names come from the page's locale and URLs
 * carry that locale's prefix.
 */
export async function buildLocalizedBreadcrumbJsonLd(locale: string, trail: Crumb[]) {
  const t = await getTranslations({ locale, namespace: "Common.nav" });
  return buildBreadcrumbJsonLd([
    { name: t("home"), url: getLocalizedUrl("/", locale) },
    ...trail.map((crumb) => ({
      name: "name" in crumb ? crumb.name : t(crumb.nav),
      url: getLocalizedUrl(crumb.path, locale),
    })),
  ]);
}
