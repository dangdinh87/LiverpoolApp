import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config.
 *
 * Tests run against a production build (`next build` + `next start`) so they
 * exercise the same rendering path as deployment. Reusing an already-running
 * server locally keeps the iteration loop fast.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Pages fan out to several third-party APIs; allow for a slow cold render.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  // Deliberately modest. Every page fans out to Supabase and two football APIs,
  // so a single local server cannot serve many cold renders at once; higher
  // concurrency produced timeouts and mid-animation layout reads that looked
  // like product bugs but were purely load artifacts.
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
