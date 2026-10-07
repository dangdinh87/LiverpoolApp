import { test, expect } from "@playwright/test";
import { collectProblems, formatProblems } from "./support/page-diagnostics";
import { waitForHeader } from "./support/wait-for-header";

/** The primary navigation must actually move between sections. */
test.describe("navigation", () => {
  test("navbar links reach their sections", async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto("/");
    // The navbar streams in behind a Suspense boundary (it awaits the auth
    // session), so it is not in the initial shell.
    await waitForHeader(page);

    // Follow whichever primary links this build exposes, rather than hard-coding
    // labels that differ per locale. Matched by suffix because hrefs carry the
    // locale: "/squad" on Vietnamese pages, "/en/squad" on English ones.
    for (const href of ["/squad", "/fixtures", "/standings", "/news"]) {
      const link = page.locator(`a[href$="${href}"]:visible`).first();
      // Narrow viewports collapse these links into a menu; navigate directly
      // there rather than asserting on a control that is intentionally hidden.
      if ((await link.count()) === 0) {
        await page.goto(href);
        await expect(page).toHaveURL(new RegExp(`${href}$`));
        continue;
      }
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${href}$`));
      await page.goBack();
    }

    expect(problems, `navigation problems:\n${formatProblems(problems)}`).toHaveLength(0);
  });

  test("unknown route returns a 404 page, not a crash", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist");
    expect(response!.status()).toBe(404);
    await expect(page.locator("text=Application error")).toHaveCount(0);
  });
});
