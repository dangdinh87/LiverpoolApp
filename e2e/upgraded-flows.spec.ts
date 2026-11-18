import { test, expect, type Page } from "@playwright/test";
import { collectProblems, formatProblems } from "./support/page-diagnostics";
import { waitForHeader, headerBrandLink } from "./support/wait-for-header";

/**
 * Count story article links rendered inside <main> on /news or /vi/news,
 * excluding the daily digest card (/news/digest/...) and self-links to /news.
 */
async function countFeedStoryLinks(page: Page): Promise<number> {
  return page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>("main a[href]"));
    return anchors.filter((a) => {
      const path = a.getAttribute("href") ?? "";
      return (
        /^(\/vi)?\/news\/.+/.test(path) &&
        !/^(\/vi)?\/news\/digest(\/|$)/.test(path)
      );
    }).length;
  });
}

/**
 * Verify that when `html[data-spoiler-free]` is active, every `.spoiler-hide`
 * element inside `<main>` is hidden (`display: none`) and `.spoiler-show`
 * placeholders take its place whenever match/table results are present.
 */
async function assertMainSpoilersMasked(page: Page, label: string): Promise<void> {
  const state = await page.evaluate(() => {
    const hiddenEls = Array.from(document.querySelectorAll<HTMLElement>("main .spoiler-hide"));
    const shownEls = Array.from(document.querySelectorAll<HTMLElement>("main .spoiler-show"));
    const leaked = hiddenEls.filter((el) => getComputedStyle(el).display !== "none").length;
    const revealedPlaceholders = shownEls.filter((el) => getComputedStyle(el).display !== "none").length;
    return {
      htmlAttr: document.documentElement.hasAttribute("data-spoiler-free"),
      storage: localStorage.getItem("spoiler-free"),
      hiddenTotal: hiddenEls.length,
      shownTotal: shownEls.length,
      leaked,
      revealedPlaceholders,
    };
  });

  expect(state.htmlAttr, `${label}: <html data-spoiler-free> should remain set`).toBe(true);
  expect(state.storage, `${label}: localStorage spoiler-free should remain "1"`).toBe("1");
  expect(state.leaked, `${label}: .spoiler-hide elements must have display:none`).toBe(0);
  if (state.shownTotal > 0) {
    expect(
      state.revealedPlaceholders,
      `${label}: .spoiler-show placeholders should become visible`,
    ).toBeGreaterThan(0);
  }
}

test.describe("Vietnamese news feed (/vi/news)", () => {
  test("renders populated news cards whenever global English articles exist, with clean VI shell", async ({
    page,
  }) => {
    const problems = collectProblems(page);

    const enRes = await page.goto("/news", { waitUntil: "domcontentloaded" });
    expect(enRes?.status()).toBeLessThan(400);
    const enStoryLinks = await countFeedStoryLinks(page);

    const viRes = await page.goto("/vi/news", { waitUntil: "domcontentloaded" });
    expect(viRes?.status()).toBeLessThan(400);
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
    await expect(page.locator("text=Application error")).toHaveCount(0);
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator("main h1")).toContainText(/[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệ]/i);

    const viStoryLinks = await countFeedStoryLinks(page);
    if (enStoryLinks > 0) {
      expect(
        viStoryLinks,
        "/vi/news must render populated story cards when global English articles exist",
      ).toBeGreaterThan(0);
      await expect(page.locator('main [role="alert"]')).toHaveCount(0);
    } else {
      // When Supabase is unreachable or empty in an offline build, /vi/news degrades to the calm outage card.
      await expect(page.locator('main [role="alert"]')).toBeVisible();
    }

    expect(problems, `/vi/news problems:\n${formatProblems(problems)}`).toHaveLength(0);
  });
});

test.describe("spoiler-free mode across match cards, standings and home widgets", () => {
  test("hides scores and form across /fixtures, /standings and /, and persists across navigation and reload", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([
      { name: "NEXT_LOCALE", value: "en", url: baseURL ?? "http://127.0.0.1:3100" },
    ]);
    const problems = collectProblems(page);

    await page.goto("/fixtures?view=results", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).not.toHaveAttribute("data-spoiler-free");

    const fixturesToggle = page.getByRole("switch", { name: /spoiler|ẩn tỷ số|che tỷ số/i });
    await expect(fixturesToggle).toBeVisible({ timeout: 20_000 });
    await expect(fixturesToggle).toHaveAttribute("aria-checked", "false");

    // Wait for hydration so clicking the switch flips aria-checked and sets <html data-spoiler-free>.
    await expect(async () => {
      if ((await fixturesToggle.getAttribute("aria-checked")) !== "true") {
        await fixturesToggle.click();
      }
      await expect(fixturesToggle).toHaveAttribute("aria-checked", "true", { timeout: 1_500 });
      await expect(page.locator("html")).toHaveAttribute("data-spoiler-free", "", { timeout: 1_500 });
    }).toPass({ timeout: 20_000 });

    await assertMainSpoilersMasked(page, "match cards (/fixtures?view=results)");

    // Navigate via Match Centre tab link to /standings and verify persistence + masked table cells/form.
    const standingsTab = page.locator("main a[href$='/standings']").first();
    await standingsTab.click();
    await expect(page).toHaveURL(/\/standings$/);
    const standingsToggle = page.getByRole("switch", { name: /spoiler|ẩn tỷ số|che tỷ số/i });
    await expect(standingsToggle).toBeVisible({ timeout: 20_000 });
    await expect(standingsToggle).toHaveAttribute("aria-checked", "true");
    await assertMainSpoilersMasked(page, "standings (/standings)");

    // Navigate via header brand link to Home (/) and verify home widgets stay masked.
    await waitForHeader(page);
    await headerBrandLink(page).click();
    await expect(page).toHaveURL(/\/$/);
    await assertMainSpoilersMasked(page, "home widgets (/)");

    // Full reload: SPOILER_BOOT_SCRIPT must restore data-spoiler-free before paint with zero hydration errors.
    await page.reload({ waitUntil: "domcontentloaded" });
    await assertMainSpoilersMasked(page, "home widgets after reload (/)");

    // Navigate back to /standings and turn spoiler-free mode off.
    await page.goto("/standings", { waitUntil: "domcontentloaded" });
    const toggleAgain = page.getByRole("switch", { name: /spoiler|ẩn tỷ số|che tỷ số/i });
    await expect(async () => {
      if ((await toggleAgain.getAttribute("aria-checked")) !== "false") {
        await toggleAgain.click();
      }
      await expect(toggleAgain).toHaveAttribute("aria-checked", "false", { timeout: 1_500 });
      await expect(page.locator("html")).not.toHaveAttribute("data-spoiler-free", { timeout: 1_500 });
    }).toPass({ timeout: 20_000 });

    const afterOff = await page.evaluate(() => ({
      storage: localStorage.getItem("spoiler-free"),
      visiblePlaceholders: Array.from(document.querySelectorAll<HTMLElement>("main .spoiler-show")).filter(
        (el) => getComputedStyle(el).display !== "none",
      ).length,
    }));
    expect(afterOff.storage).toBeNull();
    expect(afterOff.visiblePlaceholders).toBe(0);

    expect(problems, `spoiler-free flow problems:\n${formatProblems(problems)}`).toHaveLength(0);
  });
});

test.describe("analysis and predictions landmarks, headings and diagnostics", () => {
  const TARGETS = [
    { path: "/analysis", lang: "en" },
    { path: "/vi/analysis", lang: "vi" },
    { path: "/predictions", lang: "en", hasLeaderboardHeading: true },
    { path: "/vi/predictions", lang: "vi", hasLeaderboardHeading: true },
  ] as const;

  for (const target of TARGETS) {
    test(`${target.path} renders clean headings, landmarks and zero console errors`, async ({ page }) => {
      const problems = collectProblems(page);
      const res = await page.goto(target.path, { waitUntil: "domcontentloaded" });
      expect(res, `no response for ${target.path}`).not.toBeNull();
      expect(res!.status()).toBeLessThan(400);

      await waitForHeader(page);
      await expect(page).toHaveTitle(/.+/);
      await expect(page.locator("html")).toHaveAttribute("lang", target.lang);
      await expect(page.locator("text=Application error")).toHaveCount(0);

      // Core landmarks: banner, navigation, main, named section inside main, contentinfo.
      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeVisible();
      expect(await page.getByRole("navigation").count()).toBeGreaterThan(0);
      await expect(
        page.locator("main section[aria-label], main section[aria-labelledby]").first(),
      ).toBeVisible();

      // Clean heading hierarchy: single non-empty h1, no blank headings.
      const h1 = page.locator("h1");
      await expect(h1).toHaveCount(1);
      await expect(h1).toBeVisible();
      expect((await h1.innerText()).trim().length).toBeGreaterThan(0);

      if ("hasLeaderboardHeading" in target && target.hasLeaderboardHeading) {
        const h2 = page.locator("#leaderboard-title");
        await expect(h2).toBeVisible();
        expect((await h2.innerText()).trim().length).toBeGreaterThan(0);
      }

      const emptyHeadings = await page.evaluate(() =>
        Array.from(document.querySelectorAll("h1, h2, h3")).filter((h) => !h.textContent?.trim()).length,
      );
      expect(emptyHeadings, `empty headings on ${target.path}`).toBe(0);

      expect(problems, `problems on ${target.path}:\n${formatProblems(problems)}`).toHaveLength(0);
    });
  }
});
