import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// The locale middleware is not under test here; a probe must never reach it.
const intl = vi.hoisted(() => vi.fn(() => new Response(null, { status: 200 })));
vi.mock("next-intl/middleware", () => ({ default: () => intl }));

import { proxy } from "@/proxy";

const call = (path: string) => proxy(new NextRequest(new URL(path, "https://anfielddaily.com")));

describe("proxy answers CMS scanner probes with a bare 404", () => {
  it.each(["/wp", "/wordpress", "/wp/", "/cms", "/blog", "/site", "/press", "/xmlrpc.php", "/wp-login.php", "/index.php", "/news/?rest_route=/"])(
    "%s",
    async (path) => {
      intl.mockClear();
      const res = await call(path);
      expect(res.status).toBe(404);
      expect(intl).not.toHaveBeenCalled();
    },
  );

  it.each(["/", "/news", "/vi/news", "/news/bbc/sport/football/articles/abc", "/players", "/season", "/press-kit-not-a-route"])(
    "lets %s through to the site",
    async (path) => {
      intl.mockClear();
      await call(path);
      expect(intl).toHaveBeenCalledOnce();
    },
  );
});
