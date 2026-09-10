import { test, expect } from "@playwright/test";

/**
 * The site is bilingual and picks a locale from the NEXT_LOCALE cookie. Both
 * locales must render, and they must not render identically.
 */
test.describe("i18n", () => {
  test("Vietnamese locale renders Vietnamese copy", async ({ page, context }) => {
    await context.addCookies([
      { name: "NEXT_LOCALE", value: "vi", url: "http://127.0.0.1:3100" },
    ]);
    await page.goto("/");
    // Vietnamese diacritics are the reliable tell across any wording changes.
    await expect(page.locator("body")).toContainText(/[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệ]/i);
  });

  test("English locale renders English copy", async ({ page, context }) => {
    await context.addCookies([
      { name: "NEXT_LOCALE", value: "en", url: "http://127.0.0.1:3100" },
    ]);
    await page.goto("/squad");
    await expect(page.locator("body")).toContainText(/squad|player|position/i);
  });
});
