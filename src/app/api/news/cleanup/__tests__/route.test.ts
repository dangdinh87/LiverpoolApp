import { beforeEach, describe, expect, it, vi } from "vitest";

type Result = { count: number | null; error: { message: string } | null };
let results: Record<string, Result>;

function chain(table: string, op: "update" | "delete") {
  let undated = false;
  const result = () => (undated ? results[`${table}:${op}:undated`] : undefined) ?? results[`${table}:${op}`];
  const builder: Record<string, unknown> = {
    lt: () => builder,
    not: () => builder,
    // `.is("published_at", null)` marks the NULL-date purge, a separate step with its own result.
    is: () => {
      undated = true;
      return builder;
    },
    then: (resolve: (r: Result) => unknown) => resolve(result()),
  };
  return builder;
}

vi.mock("@/lib/news/supabase-service", () => ({
  getServiceClient: () => ({
    from: (table: string) => ({
      update: () => chain(table, "update"),
      delete: () => chain(table, "delete"),
    }),
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/lib/cron", () => ({ withCronAuth: (fn: unknown) => fn }));

import { revalidatePath } from "next/cache";
import { GET } from "../route";

const ok: Result = { count: 3, error: null };
const down: Result = { count: null, error: { message: "upstream connect error 522" } };
const call = () => (GET as unknown as () => Promise<Response>)();

beforeEach(() => {
  vi.clearAllMocks();
  results = { "articles:update": ok, "articles:delete": ok, "articles:delete:undated": ok, "sync_logs:delete": ok };
});

describe("GET /api/news/cleanup", () => {
  it("returns 200 with counts when every step succeeds", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, contentCleared: 3, deleted: 3, undatedDeleted: 3, logsDeleted: 3 });
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("returns 503 (not ok:true, deleted:0) when the database is down", async () => {
    results = { "articles:update": down, "articles:delete": down, "articles:delete:undated": down, "sync_logs:delete": down };
    const res = await call();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.failures).toHaveLength(4); // content, articles, undated, sync_logs
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns 503 when only one step fails", async () => {
    results["articles:delete"] = down;
    const res = await call();
    expect(res.status).toBe(503);
    expect((await res.json()).failures).toEqual([{ step: "articles", error: "upstream connect error 522" }]);
  });
});

describe("GET /api/news/cleanup undated rows", () => {
  it("purges NULL published_at rows by fetch time and reports them", async () => {
    results["articles:delete:undated"] = { count: 9, error: null };
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, undatedDeleted: 9 });
  });

  it("fails the run when the undated purge fails", async () => {
    results["articles:delete:undated"] = down;
    const res = await call();
    expect(res.status).toBe(503);
    expect((await res.json()).failures).toEqual([{ step: "articles-undated", error: "upstream connect error 522" }]);
  });
});
