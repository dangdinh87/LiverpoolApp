import { test, expect, type BrowserContext } from "@playwright/test";

/**
 * The app shell: mobile menu, language switch, skip link and keyboard order.
 * Everything here reads static markup (no live football/news data), so the
 * specs are deterministic.
 *
 * The suite runs on two projects ("desktop" 1280px, "mobile" Pixel 7). Specs
 * that only make sense for one of them skip on the other so nothing runs twice.
 */

async function setLocale(context: BrowserContext, baseURL: string | undefined, locale: "en" | "vi") {
  await context.addCookies([{ name: "NEXT_LOCALE", value: locale, url: baseURL ?? "http://127.0.0.1:3100" }]);
}

test.describe("mobile menu", () => {
  test.beforeEach(async ({ context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "the hamburger only exists below the lg breakpoint");
    await setLocale(context, baseURL, "en");
  });

  test("opens as a dialog, traps focus, closes with Esc and returns focus to the trigger", async ({ page }) => {
    await page.goto("/about", { waitUntil: "domcontentloaded" });
    // Before hydration a plain placeholder button stands in; the Radix trigger
    // (aria-haspopup=dialog) replaces it after mount.
    const trigger = page.getByRole("button", { name: "Open menu" });
    await expect(trigger).toHaveAttribute("aria-haspopup", "dialog", { timeout: 20_000 });

    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Focus moved into the dialog.
    await expect(dialog.locator(":focus")).toHaveCount(1);

    // Focus trap: a full lap of Tab presses never leaves the dialog.
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
      expect(inside, `Tab #${i + 1} left the menu dialog`).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("close button closes it and navigation links work", async ({ page }) => {
    await page.goto("/about", { waitUntil: "domcontentloaded" });
    const trigger = page.getByRole("button", { name: "Open menu" });
    await expect(trigger).toHaveAttribute("aria-haspopup", "dialog", { timeout: 20_000 });

    await trigger.click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Close menu" }).click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await dialog.getByRole("link", { name: /^squad$/i }).click();
    await expect(page).toHaveURL(/\/squad$/);
    // The sheet must not stay open over the new page.
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("language switch inside the menu flips the whole page", async ({ page, context }) => {
    await page.goto("/about", { waitUntil: "domcontentloaded" });
    const trigger = page.getByRole("button", { name: "Open menu" });
    await expect(trigger).toHaveAttribute("aria-haspopup", "dialog", { timeout: 20_000 });
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await trigger.click();
    const group = page.getByRole("dialog").getByRole("group", { name: "Toggle Language" });
    await expect(group.getByRole("button", { name: /English/ })).toHaveAttribute("aria-pressed", "true");
    await Promise.all([page.waitForEvent("load"), group.getByRole("button", { name: /Tiếng Việt/ }).click()]);

    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "NEXT_LOCALE")?.value).toBe("vi");
    // The menu trigger is now labelled in Vietnamese.
    await expect(page.getByRole("button", { name: "Mở menu" })).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("desktop header", () => {
  test.beforeEach(async ({ context, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop header layout");
    await setLocale(context, baseURL, "en");
  });

  test("language dropdown: Esc closes it and returns focus; choosing a language persists it", async ({ page, context }) => {
    await page.goto("/about", { waitUntil: "domcontentloaded" });
    const toggle = page.getByRole("button", { name: "Toggle Language" });
    await expect(toggle).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    // The effect that listens for Esc is attached after hydration; retry the
    // open/close pair until the listener is live instead of sleeping.
    await expect(async () => {
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await page.keyboard.press("Escape");
      await expect(toggle).toHaveAttribute("aria-expanded", "false", { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await expect(toggle).toBeFocused();

    await toggle.click();
    await Promise.all([
      page.waitForEvent("load"),
      page.getByRole("button", { name: /Tiếng Việt/ }).click(),
    ]);
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
    expect((await context.cookies()).find((c) => c.name === "NEXT_LOCALE")?.value).toBe("vi");

    // And it sticks on the next page.
    await page.goto("/legal", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  });

  test("skip link is the first tab stop and moves focus to the main landmark", async ({ page }) => {
    await page.goto("/about", { waitUntil: "domcontentloaded" });
    await page.locator("header a[href='/']").first().waitFor({ timeout: 20_000 });

    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("Tab order runs header -> main -> footer with no trap", async ({ page }) => {
    await page.goto("/about", { waitUntil: "domcontentloaded" });
    await page.locator("header a[href='/']").first().waitFor({ timeout: 20_000 });

    const regions: string[] = [];
    for (let i = 0; i < 90; i++) {
      await page.keyboard.press("Tab");
      const region = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return "body";
        return el.closest("header, footer, main")?.tagName.toLowerCase() ?? "other";
      });
      if (regions[regions.length - 1] !== region) regions.push(region);
      if (region === "footer") break;
    }
    // Collapse repeats; the only legal progressions are forward ones.
    const rank: Record<string, number> = { other: 0, header: 1, main: 2, footer: 3, body: 4 };
    const named = regions.filter((r) => r !== "other" && r !== "body");
    expect(named, `region sequence: ${regions.join(" > ")}`).toEqual([...named].sort((a, b) => rank[a] - rank[b]));
    expect(named, "keyboard focus never reached the footer (trap or too many stops)").toContain("footer");
    expect(named).toContain("header");
    expect(named).toContain("main");
  });
});
