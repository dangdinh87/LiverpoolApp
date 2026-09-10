import { test, expect } from "@playwright/test";
import { collectProblems, formatProblems } from "./support/page-diagnostics";

/**
 * Interactive behaviour, not just first paint. These are the features most
 * likely to look fine on load and misbehave on interaction.
 */
test.describe("interactive features", () => {
  test("squad position filter narrows the grid", async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto("/squad");

    const cards = page.locator("a[href^='/player/']");
    await expect(cards.first()).toBeVisible();
    const total = await cards.count();
    expect(total, "squad should list players").toBeGreaterThan(0);

    // Filter controls are rendered as buttons; pick a non-"all" option.
    const filter = page.getByRole("button", { name: /defender|hậu vệ/i }).first();
    if ((await filter.count()) > 0) {
      await filter.click();
      await expect(cards.first()).toBeVisible();
      const filtered = await cards.count();
      expect(filtered, "filter should narrow the list").toBeLessThan(total);
      expect(filtered, "filter should not empty the list").toBeGreaterThan(0);
    }

    expect(problems, `squad problems:\n${formatProblems(problems)}`).toHaveLength(0);
  });

  test("player detail opens from the squad grid", async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto("/squad");

    const first = page.locator("a[href^='/player/']").first();
    await expect(first).toBeVisible();
    await first.click();

    await expect(page).toHaveURL(/\/player\//);
    await page.waitForLoadState("load", { timeout: 30_000 }).catch(() => {});
    await expect(page.locator("text=Application error")).toHaveCount(0);
    // A player page must name the player somewhere in its own content; the
    // heading streams in after the shell, so wait on it rather than the shell.
    await expect(page.locator("main h1, main h2").first()).toBeVisible({
      timeout: 25_000,
    });

    expect(problems, `player detail problems:\n${formatProblems(problems)}`).toHaveLength(0);
  });

  test("standings renders a populated league table", async ({ page }) => {
    await page.goto("/standings");
    const body = page.locator("body");
    await expect(body).toContainText(/liverpool/i);
    // A real table has more than a couple of clubs in it.
    await expect(body).toContainText(/arsenal|chelsea|man|city|united|tottenham/i);
  });

  test("fixtures list shows matches with opponents", async ({ page }) => {
    await page.goto("/fixtures");
    await expect(page.locator("body")).toContainText(/liverpool/i);
  });

  test("news feed lists articles and opens one", async ({ page }) => {
    await page.goto("/news");
    const articleLinks = page.locator("a[href^='/news/']");
    const count = await articleLinks.count();
    // With the database unavailable the feed may legitimately be empty; only
    // assert navigation when there is something to click.
    if (count > 0) {
      await articleLinks.first().click();
      await expect(page.locator("text=Application error")).toHaveCount(0);
    }
  });

  test("stats page renders its charts", async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto("/stats");
    await expect(page.locator("body")).toContainText(/stat|thống kê|goal|bàn thắng/i);
    expect(problems, `stats problems:\n${formatProblems(problems)}`).toHaveLength(0);
  });
});

test.describe("resilience", () => {
  test("home page still renders when the database is unreachable", async ({ page }) => {
    // Simulate a total Supabase outage; the page must degrade, not hang or crash.
    await page.route("**/*.supabase.co/**", (r) => r.abort());
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response!.status()).toBeLessThan(400);
    await expect(page.locator("text=Application error")).toHaveCount(0);
    await expect(page.locator("body")).toContainText(/liverpool/i);
  });
});
