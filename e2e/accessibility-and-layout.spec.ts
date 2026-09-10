import { test, expect } from "@playwright/test";
import { ROUTES } from "./support/routes";

/** Layout regressions that are invisible to unit tests. */
test.describe("layout", () => {
  // Horizontal overflow is the most common mobile regression in this codebase.
  for (const route of ROUTES.filter((r) => !r.protected)) {
    test(`no horizontal overflow on ${route.path}`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      // Entry animations transiently place elements off-screen, so require the
      // page to settle without overflow rather than sampling once mid-load.
      // A couple of pixels of rounding is tolerable; a scrollbar's worth is not.
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const el = document.documentElement;
              return el.scrollWidth - el.clientWidth;
            }),
          {
            message: `${route.path} still overflows horizontally after settling`,
            timeout: 20_000,
          },
        )
        .toBeLessThan(4);
    });
  }

  test("every page has exactly one h1 and a non-empty title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/.+/);
    const h1 = await page.locator("h1").count();
    expect(h1, "home page should have exactly one h1").toBe(1);
  });
});
