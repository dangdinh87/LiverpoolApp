import { test, expect } from "@playwright/test";
import { ROUTES } from "./support/routes";
import { collectProblems, formatProblems } from "./support/page-diagnostics";

/**
 * Every public route must render its own content without server errors or
 * uncaught client exceptions — including while third-party data sources are
 * degraded, which is the normal steady state for this app.
 */
test.describe("route smoke sweep", () => {
  for (const route of ROUTES) {
    test(`renders ${route.path}`, async ({ page }) => {
      const problems = collectProblems(page);

      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
      expect(response, `no response for ${route.path}`).not.toBeNull();
      expect(response!.status(), `HTTP status for ${route.path}`).toBeLessThan(400);

      // A protected route is expected to land on the login screen instead.
      if (route.protected) {
        await expect(page).toHaveURL(/\/auth\/login/);
      }

      // The Next.js error boundary replaces the page on an unhandled throw.
      await expect(page.locator("text=Application error")).toHaveCount(0);
      await expect(page.locator("text=This page could not be found")).toHaveCount(0);

      // Proves real content rendered, not just an empty shell.
      await expect(page.locator("body")).toContainText(route.expects);

      expect(problems, `browser problems on ${route.path}:\n${formatProblems(problems)}`)
        .toHaveLength(0);
    });
  }
});
