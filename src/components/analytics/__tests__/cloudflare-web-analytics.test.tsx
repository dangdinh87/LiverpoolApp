import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

// next/script needs the app router's context to render; a plain <script> keeps the
// attributes this test cares about.
vi.mock("next/script", () => ({
  default: ({ strategy, ...props }: Record<string, unknown>) => <script data-strategy={strategy as string} {...props} />,
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function render() {
  const { CloudflareWebAnalytics } = await import("../cloudflare-web-analytics");
  return renderToStaticMarkup(<CloudflareWebAnalytics />);
}

describe("CloudflareWebAnalytics", () => {
  it("loads Cloudflare's beacon with the site token, after the page is interactive", async () => {
    vi.stubEnv("NEXT_PUBLIC_CF_ANALYTICS_TOKEN", "84ef899bdc3442bdb8e4ba7c611356f4");
    const html = await render();
    expect(html).toContain('src="https://static.cloudflareinsights.com/beacon.min.js"');
    expect(html).toContain('data-strategy="afterInteractive"');
    expect(html).toContain("84ef899bdc3442bdb8e4ba7c611356f4");
    expect(html).toContain("data-cf-beacon");
  });

  it("renders nothing without a token (local dev, forks, previews)", async () => {
    vi.stubEnv("NEXT_PUBLIC_CF_ANALYTICS_TOKEN", "");
    expect(await render()).toBe("");
  });

  it("does not put an odd token into the attribute unescaped", async () => {
    vi.stubEnv("NEXT_PUBLIC_CF_ANALYTICS_TOKEN", 'x"}\'><script>alert(1)</script>');
    expect(await render()).toBe("");
  });
});
