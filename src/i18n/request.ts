import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

const SUPPORTED_LOCALES = ['en', 'vi'] as const;
const DEFAULT_LOCALE: Locale = 'vi';

type Locale = (typeof SUPPORTED_LOCALES)[number];

function isSupported(value: string | undefined): value is Locale {
  return !!value && SUPPORTED_LOCALES.includes(value as Locale);
}

// Parse Accept-Language header, return first supported locale.
// Format: "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7"
function detectFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const entries = header
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      const lang = tag.split('-')[0].toLowerCase();
      return { lang, q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { lang } of entries) {
    if (isSupported(lang)) return lang;
  }
  return null;
}

export default getRequestConfig(async () => {
  // Priority: NEXT_LOCALE cookie → Accept-Language header → default 'vi'
  let locale: Locale = DEFAULT_LOCALE;
  try {
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get('NEXT_LOCALE')?.value;
    if (isSupported(fromCookie)) {
      locale = fromCookie;
    } else {
      const headerStore = await headers();
      const fromHeader = detectFromAcceptLanguage(headerStore.get('accept-language'));
      if (fromHeader) locale = fromHeader;
    }
  } catch {
    // Build-time / static contexts — keep default
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
