# i18n Implementation Walkthrough

Multi-language support (English and Vietnamese) has been successfully added to the LiverpoolApp.

## Key Accomplishments

- **Dependency Integration**: Installed `next-intl` and `js-cookie`.
- **Infrastructure**: Created `src/i18n/request.ts` to load translations based on the `NEXT_LOCALE` cookie.
- **Language Switcher**: Added a header component to toggle between EN and VI.
- **Localized Content**: Refactored Squad, Home, Header, and Footer to use translation keys.

## How to Test

1. **Header Toggle**: Use the globe icon to switch languages.
2. **Persistence**: The selected language persists via cookies.
3. **URL**: The URL remains unchanged (e.g., `/squad` stays `/squad`).
