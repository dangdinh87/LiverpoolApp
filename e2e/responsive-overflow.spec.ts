import { test, expect, type Page } from "@playwright/test";
import { ROUTES } from "./support/routes";

/**
 * Smallest supported phones: 320px (iPhone SE 1st gen / small Androids) and
 * 390px (the primary viewport). No page may scroll sideways at either width,
 * in either language - Vietnamese strings are the longest in the product.
 *
 * One test per width x locale walks every route in a single page, which keeps
 * the whole sweep to a few seconds per route instead of a browser per route.
 */

const WIDTHS = [320, 390] as const;
const LOCALES = ["vi", "en"] as const;

// Detail pages that are reachable without live data: a squad member and the 404.
const EXTRA_PATHS = ["/player/virgil-van-dijk", "/this-route-does-not-exist"];
// /players is a permanent redirect to /squad (navigates again after load), which is covered by /squad itself.
const PATHS = [...ROUTES.filter((r) => !r.protected && r.path !== "/players").map((r) => r.path), ...EXTRA_PATHS];

/** Horizontal overflow in px, measured after entry animations and lazy content settle. */
async function overflowOf(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const measure = () => {
          const el = document.documentElement;
          return Math.max(el.scrollWidth - el.clientWidth, document.body.scrollWidth - el.clientWidth);
        };
        // Two frames after load + a short settle: .reveal animations translate Y only,
        // but images/fonts can still reflow the first paint.
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => resolve(measure()), 400)));
      }),
  );
}

for (const width of WIDTHS) {
  for (const locale of LOCALES) {
    test(`no horizontal overflow at ${width}px (${locale}) on every route`, async ({ browser, baseURL }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop", "viewport is forced here; one project is enough");
      test.setTimeout(180_000);
      const context = await browser.newContext({ viewport: { width, height: 800 }, baseURL });
      await context.addCookies([{ name: "NEXT_LOCALE", value: locale, url: baseURL ?? "http://127.0.0.1:3100" }]);
      const page = await context.newPage();

      const offenders: string[] = [];
      for (const path of PATHS) {
        await page.goto(path, { waitUntil: "load", timeout: 60_000 });
        const over = await overflowOf(page);
        // 1px of sub-pixel rounding is fine; a scrollbar's worth is not.
        if (over > 1) offenders.push(`${path} (+${over}px)`);
      }
      await context.close();
      expect(offenders, `horizontal overflow at ${width}px / ${locale}`).toEqual([]);
    });
  }
}
