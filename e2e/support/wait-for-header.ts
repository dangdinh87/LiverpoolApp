import type { Page } from "@playwright/test";

/** Locales that appear as a URL prefix. Mirrors src/i18n/routing.ts. */
const PREFIXED_LOCALES = ["vi"];

/** Home-link hrefs the header can render, one per locale. */
const HOME_HREFS = ["/", ...PREFIXED_LOCALES.map((l) => `/${l}`)];

/**
 * Wait until the header has streamed in and hydrated.
 *
 * The header sits behind a Suspense boundary (it awaits the auth session), so
 * it is absent from the initial shell. Its brand link is the marker.
 *
 * The href is matched for every locale: hard-coding "/" stopped matching the
 * moment the header started emitting prefixed hrefs, which is exactly the
 * regression this helper exists to survive.
 */
export function headerBrandLink(page: Page) {
  return page.locator(HOME_HREFS.map((h) => `header a[href='${h}']`).join(", ")).first();
}

/** Resolve the header's brand link, waiting for the header to appear. */
export async function waitForHeader(page: Page, timeout = 20_000): Promise<void> {
  await headerBrandLink(page).waitFor({ timeout });
}
