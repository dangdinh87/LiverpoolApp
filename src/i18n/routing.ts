import { defineRouting } from 'next-intl/routing';

// English is the default locale and keeps unprefixed URLs; every other locale
// lives under its own prefix (/vi). The middleware still honours the
// NEXT_LOCALE cookie and Accept-Language, redirecting an unprefixed request to
// the reader's locale when they ask for it.
export const routing = defineRouting({
  locales: ['en', 'vi'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
});

// Props shape for pages/layouts under app/[locale].
export type LocaleParams = { params: Promise<{ locale: string }> };

/** Locales that appear in the URL. The default locale never does. */
export const PREFIXED_LOCALES = routing.locales.filter((l) => l !== routing.defaultLocale);

/**
 * Add a locale's prefix to an app path.
 *
 * Which locale carries a prefix is a property of the routing config, not a
 * constant: "/en" was hard-coded in eight places, so flipping the default
 * locale silently broke canonical URLs, the language switcher, the middleware's
 * auth paths and the ads gate all at once. Everything that needs to know asks
 * here instead.
 */
export function withLocalePrefix(path: string, locale: string): string {
  if (locale === routing.defaultLocale) return path;
  return `/${locale}${path === '/' ? '' : path}`;
}

/** Split a pathname into its locale prefix and the path beneath it. */
export function splitLocalePrefix(pathname: string): {
  path: string;
  prefix: string;
  locale: string;
} {
  for (const locale of PREFIXED_LOCALES) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return {
        path: pathname.slice(locale.length + 1) || '/',
        prefix: `/${locale}`,
        locale,
      };
    }
  }
  return { path: pathname, prefix: '', locale: routing.defaultLocale };
}

/** Regex source matching an optional locale prefix, e.g. `(?:vi\/)?`. */
export const LOCALE_PREFIX_PATTERN = `(?:${PREFIXED_LOCALES.join('|')}\\/)?`;
