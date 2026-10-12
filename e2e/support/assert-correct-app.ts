import { request } from "@playwright/test";
import { BRAND } from "../../src/lib/brand";

/**
 * Fail loudly if the port is serving somebody else's app.
 *
 * `webServer.reuseExistingServer` is on, which is what makes local runs fast —
 * but it means Playwright will happily attach to whatever is already listening
 * on the port and run the whole suite against it. On a machine with more than
 * one Next.js project that is not hypothetical: a `next-server` from an
 * unrelated app was found holding 3100, and the suite would have sweeped its
 * routes and reported on a site that is not this one.
 *
 * The check is one request for the home page, matching the site name that the
 * header, metadata and share image all read from `BRAND`.
 */
export default async function assertCorrectApp(): Promise<void> {
  const baseURL = `http://127.0.0.1:${Number(process.env.E2E_PORT ?? 3100)}`;
  const ctx = await request.newContext({ baseURL });

  try {
    const res = await ctx.get("/", { timeout: 30_000 });
    const body = await res.text();
    if (!body.includes(BRAND.name)) {
      const title = /<title>([\s\S]*?)<\/title>/.exec(body)?.[1]?.trim() ?? "(no <title>)";
      throw new Error(
        `${baseURL} is serving a different application — "${BRAND.name}" does not appear in its home page.\n` +
          `  Its <title> is: ${title}\n` +
          `  Playwright reuses an existing server on this port, so the suite would have run against that app.\n` +
          `  Stop it, or run with E2E_PORT set to a free port.`,
      );
    }
  } finally {
    await ctx.dispose();
  }
}
