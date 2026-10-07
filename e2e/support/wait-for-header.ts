import type { Page } from "@playwright/test";

/**
 * Wait until the header has streamed in and hydrated.
 *
 * The header sits behind a Suspense boundary (it awaits the auth session), so it
 * is absent from the initial shell. Its brand link is the marker.
 *
 * The href is matched locale-agnostically: links are locale-aware, so the brand
 * link is "/" on Vietnamese pages and "/en" on English ones. Hard-coding "/"
 * silently stopped matching the moment the header started emitting prefixed
 * hrefs, which is exactly the regression this helper exists to survive.
 */
export function headerBrandLink(page: Page) {
  return page.locator("header a[href='/'], header a[href='/en']").first();
}

/** Resolve the header's brand link, waiting for the header to appear. */
export async function waitForHeader(page: Page, timeout = 20_000): Promise<void> {
  await headerBrandLink(page).waitFor({ timeout });
}
