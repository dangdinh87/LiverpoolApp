import { test, expect, type BrowserContext } from "@playwright/test";

/**
 * Interaction behaviour of the rebuilt pages. Assertions are structural
 * (counts agree with each other, state attributes flip, focus moves) so they
 * hold whatever the live football data happens to be that day.
 */

async function setLocale(context: BrowserContext, baseURL: string | undefined, locale: "en" | "vi") {
  await context.addCookies([{ name: "NEXT_LOCALE", value: locale, url: baseURL ?? "http://127.0.0.1:3100" }]);
}

test.beforeEach(async ({ context, baseURL }) => {
  await setLocale(context, baseURL, "en");
});

test.describe("fixtures filter chips", () => {
  test("view chips switch the list and their counts match what is shown", async ({ page }) => {
    await page.goto("/fixtures", { waitUntil: "domcontentloaded" });
    const views = page.getByRole("group", { name: "Fixtures view" });
    await expect(views).toBeVisible({ timeout: 20_000 });
    const chips = views.getByRole("button");
    await expect(chips).toHaveCount(2);

    // Wait for hydration: clicking the inactive chip must flip aria-current.
    const [first, second] = [chips.nth(0), chips.nth(1)];
    await expect(async () => {
      await second.click();
      await expect(second).toHaveAttribute("aria-current", "true", { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await expect(first).not.toHaveAttribute("aria-current", "true");

    // The number printed on the chip equals the number of match cards listed.
    const printed = Number((await second.innerText()).replace(/\D+/g, ""));
    const cards = page.locator("main section[aria-label] ul > li");
    await expect(cards).toHaveCount(printed);

    // Back to the first view.
    await first.click();
    await expect(first).toHaveAttribute("aria-current", "true");
    const printedFirst = Number((await first.innerText()).replace(/\D+/g, ""));
    await expect(cards).toHaveCount(printedFirst);
  });

  test("competition chips narrow the list and never exceed the unfiltered count", async ({ page }) => {
    await page.goto("/fixtures", { waitUntil: "domcontentloaded" });
    const comps = page.getByRole("group", { name: "Filter by competition" });
    // With a single competition in the data the group is (correctly) not rendered.
    test.skip(!(await comps.isVisible({ timeout: 20_000 }).catch(() => false)), "only one competition in the data");

    const chips = comps.getByRole("button");
    const cards = page.locator("main section[aria-label] ul > li");
    await expect(cards.first()).toBeVisible();
    const all = await cards.count();

    const target = chips.nth(1);
    await expect(async () => {
      await target.click();
      await expect(target).toHaveAttribute("aria-current", "true", { timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await expect(chips.nth(0)).not.toHaveAttribute("aria-current", "true");
    // Count is stable (or the empty state shows) and never larger than "All".
    const filtered = await page.locator("main section[aria-label] ul > li").count();
    expect(filtered).toBeLessThanOrEqual(all);
  });
});

test.describe("standings table on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("rank and club columns are sticky and the page itself does not scroll sideways", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "viewport is forced; one project is enough");
    await page.goto("/standings", { waitUntil: "domcontentloaded" });
    const table = page.locator("main table").first();
    test.skip(!(await table.isVisible({ timeout: 20_000 }).catch(() => false)), "standings provider returned no table (outage state)");

    const sticky = await table.evaluate((t) => {
      const cell = (sel: string) => {
        const el = t.querySelector(sel) as HTMLElement | null;
        return el ? getComputedStyle(el).position : null;
      };
      return {
        thRank: cell("thead th:nth-child(1)"),
        thClub: cell("thead th:nth-child(2)"),
        tdRank: cell("tbody tr:first-child td:nth-child(1)"),
        tdClub: cell("tbody tr:first-child td:nth-child(2)"),
        rows: t.querySelectorAll("tbody tr").length,
      };
    });
    expect(sticky).toMatchObject({ thRank: "sticky", thClub: "sticky", tdRank: "sticky", tdClub: "sticky" });
    expect(sticky.rows).toBeGreaterThanOrEqual(18);

    // If the table is wider than its scroller, the club column must stay put while scrolled.
    const result = await table.evaluate((t) => {
      let scroller: HTMLElement | null = t.parentElement;
      while (scroller && getComputedStyle(scroller).overflowX === "visible") scroller = scroller.parentElement;
      const club = t.querySelector("tbody tr:first-child td:nth-child(2)") as HTMLElement;
      const before = club.getBoundingClientRect().left;
      let scrolled = false;
      if (scroller && scroller.scrollWidth > scroller.clientWidth + 1) {
        scroller.scrollLeft = scroller.scrollWidth;
        scrolled = scroller.scrollLeft > 0;
      }
      const after = club.getBoundingClientRect().left;
      const de = document.documentElement;
      return { scrolled, before, after, pageOverflow: de.scrollWidth - de.clientWidth };
    });
    expect(result.pageOverflow).toBeLessThan(2);
    if (result.scrolled) expect(Math.abs(result.after - result.before)).toBeLessThan(2);
  });
});

test.describe("gallery lightbox", () => {
  test("opens from a tile, steps with the arrow keys, closes with Esc and returns focus", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "keyboard behaviour; one project is enough");
    await page.goto("/gallery", { waitUntil: "domcontentloaded" });
    const tile = page.locator("main ul li button[aria-label]").first();
    await expect(tile).toBeVisible({ timeout: 20_000 });
    await tile.scrollIntoViewIfNeeded();

    // The lightbox is a lazy chunk and the click handler needs hydration: retry the open.
    const root = page.locator(".yarl__root");
    await expect(async () => {
      await tile.click();
      await expect(root).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });

    const counter = page.locator(".yarl__counter");
    const position = async () => {
      const m = (await counter.innerText()).match(/(\d+)\s*\/\s*(\d+)/);
      return m ? { at: Number(m[1]), of: Number(m[2]) } : null;
    };
    await expect(counter).toBeVisible();
    const start = await position();
    expect(start).not.toBeNull();
    expect(start!.at).toBe(1);

    await page.keyboard.press("ArrowRight");
    await expect.poll(async () => (await position())?.at).toBe(start!.of > 1 ? 2 : 1);
    await page.keyboard.press("ArrowLeft");
    await expect.poll(async () => (await position())?.at).toBe(1);

    await page.keyboard.press("Escape");
    await expect(root).toBeHidden();
    await expect(tile).toBeFocused();
  });
});

test.describe("chat widget", () => {
  test("is not rendered for a signed-out visitor, and the chat page hides the site chrome", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "signed-out behaviour is viewport independent");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Let the header's auth check settle (it decides whether the widget shows).
    await page.locator("header a[href='/']").first().waitFor({ timeout: 20_000 });
    await page.waitForLoadState("load");
    await expect(page.getByRole("button", { name: /open liverbird ai chat/i })).toHaveCount(0);

    // /chat is a full-screen app on top of the site: header and footer must not
    // stay reachable by keyboard behind it.
    await page.goto("/chat", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".chat-shell")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("header.site-header")).toBeHidden();
    await expect(page.locator("body > footer")).toBeHidden();
  });
});

test.describe("reduced motion", () => {
  test("no decorative animation or smooth scroll runs when the user asks for less motion", async ({ browser, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "media query behaviour; one project is enough");

    const probe = async (reducedMotion: "reduce" | "no-preference") => {
      const context = await browser.newContext({ reducedMotion, baseURL });
      await setLocale(context, baseURL, "en");
      const page = await context.newPage();
      await page.goto("/about", { waitUntil: "load" });
      await page.locator("header a[href='/']").first().waitFor({ timeout: 20_000 });
      await page.waitForTimeout(600); // let entry animations finish or loop
      const out = await page.evaluate(() => {
        const animations = document.getAnimations().filter((a) => a.playState === "running");
        const longOrLooping = animations.filter((a) => {
          const t = a.effect?.getComputedTiming();
          return !!t && (t.iterations === Infinity || (typeof t.duration === "number" && t.duration > 50));
        });
        return {
          scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
          looping: longOrLooping.map((a) => (a as CSSAnimation).animationName ?? a.constructor.name),
        };
      });
      await context.close();
      return out;
    };

    const normal = await probe("no-preference");
    const reduced = await probe("reduce");

    // Positive control: with motion allowed the page really does animate, so an
    // empty list under "reduce" is meaningful.
    expect(normal.scrollBehavior).toBe("smooth");
    expect(normal.looping.length, "expected the footer marquee to loop with motion allowed").toBeGreaterThan(0);

    expect(reduced.scrollBehavior).toBe("auto");
    expect(reduced.looping, `still animating under reduced motion: ${reduced.looping.join(", ")}`).toEqual([]);
  });
});
