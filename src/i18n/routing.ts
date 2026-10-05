import { defineRouting } from 'next-intl/routing';

// Vietnamese keeps the existing unprefixed URLs (no SEO change); English lives
// under /en. The middleware still honours the NEXT_LOCALE cookie and
// Accept-Language, redirecting unprefixed requests to /en when they ask for it.
export const routing = defineRouting({
  locales: ['vi', 'en'],
  defaultLocale: 'vi',
  localePrefix: 'as-needed',
});

// Props shape for pages/layouts under app/[locale].
export type LocaleParams = { params: Promise<{ locale: string }> };
