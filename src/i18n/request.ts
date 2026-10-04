import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

// The locale comes from the [locale] route segment (set via setRequestLocale),
// never from cookies or headers: reading those would force every page to render
// per request. Cookie / Accept-Language detection now happens in the middleware.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
