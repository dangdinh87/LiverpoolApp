import { getRequestConfig } from 'next-intl/server';

const DEFAULT_LOCALE = 'vi';

export default getRequestConfig(async () => {
  // Default to Vietnamese for ISR-cached pages.
  // Client-side locale switching sets NEXT_LOCALE cookie and reloads —
  // dynamic pages (profile) read it via middleware.
  return {
    locale: DEFAULT_LOCALE,
    messages: (await import(`../messages/${DEFAULT_LOCALE}.json`)).default,
  };
});
