import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

const SUPPORTED_LOCALES = ['en', 'vi'];

function detectLocaleFromHeader(acceptLang: string | null): string {
  if (!acceptLang) return 'en';
  const parts = acceptLang.toLowerCase().split(',');
  for (const part of parts) {
    const lang = part.split(';')[0].trim().split('-')[0];
    if (SUPPORTED_LOCALES.includes(lang)) return lang;
  }
  return 'en';
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  // 1. Cookie (user explicitly chose) → 2. Browser Accept-Language
  const raw =
    cookieStore.get('NEXT_LOCALE')?.value ||
    detectLocaleFromHeader(headerStore.get('accept-language'));
  const locale = SUPPORTED_LOCALES.includes(raw) ? raw : 'en';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
