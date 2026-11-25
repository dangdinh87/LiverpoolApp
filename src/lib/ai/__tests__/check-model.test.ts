import { afterEach, describe, expect, it, vi } from "vitest";
import { MODEL_ID } from "../ai-model-slots";
import { checkModel, errorDetail, judgeEnglish, judgeJson, judgeVietnamese } from "../check-model";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("check-model judges & error formatting", () => {
  it("validates accented Vietnamese and rejects foreign scripts or unaccented replies", () => {
    expect(judgeVietnamese("Pressing tầm cao giúp Liverpool đoạt bóng sớm hơn ở phần sân đối phương.")).toBeNull();
    expect(judgeVietnamese("Pressing tầm cao giúp Liverpool 它以前 đoạt bóng.")).toContain("foreign script");
    expect(judgeVietnamese("Pressing tam cao giup Liverpool doat bong som hon o san doi phuong.")).toBe(
      "missing Vietnamese diacritics",
    );
    expect(judgeVietnamese("ok")).toContain("too short");
  });

  it("validates English prose and rejects foreign script leakage", () => {
    expect(judgeEnglish("Midfield control dictates tempo and limits dangerous transitions.")).toBeNull();
    expect(judgeEnglish("Midfield control 想知道 dictates tempo.")).toContain("foreign script");
    expect(judgeEnglish("12345 67890 12345 67890")).toBe("no English words in reply");
  });

  it("validates JSON probe responses including fenced blocks", () => {
    expect(judgeJson('```json\n{"ok": true, "items": ["6", "8", "10"]}\n```')).toBeNull();
    expect(judgeJson("No json here")).toContain("no JSON object");
    expect(judgeJson('{"ok": true, "items": ["6"]}')).toBe("JSON does not match required schema");
    expect(judgeJson('{"ok": true, "items": [}')).toBe("JSON could not be parsed");
  });

  it("formats upstream and timeout errors cleanly", () => {
    expect(
      errorDetail(new Error("Failed after 2 attempts. Last error: No available channel for model x (request id: 123)")),
    ).toContain("no available channel");

    const timeout = new Error("Aborted");
    timeout.name = "TimeoutError";
    expect(errorDetail(timeout)).toBe("timed out after 30s");

    expect(errorDetail(new Error("Failed after 3 attempts. Last error: Bad gateway (request id: abc)"))).toBe(
      "Bad gateway",
    );
  });

  it("validates MODEL_ID patterns", () => {
    expect(MODEL_ID.test("deepseek-v4-pro")).toBe(true);
    expect(MODEL_ID.test("gemini-2.5-flash")).toBe(true);
    expect(MODEL_ID.test("@cf/google/gemma-4-26b-a4b-it")).toBe(true);
    expect(MODEL_ID.test("")).toBe(false);
    expect(MODEL_ID.test("@cf/../secret")).toBe(false);
    expect(MODEL_ID.test("bad space")).toBe(false);
  });

  it("runs json probe using reasoning_content fallback when content is empty", async () => {
    vi.stubEnv("VIETAPI_KEY", "vk");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "",
                  reasoning_content: '{"ok": true, "items": ["holding", "box-to-box", "playmaker"]}',
                },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const res = await checkModel("deepseek-v4-flash", ["json"]);
    expect(res.ok).toBe(true);
    expect(res.outcomes[0]).toMatchObject({ check: "json", ok: true, detail: "ok" });
  });

  it("fails tools check cleanly when credentials are missing", async () => {
    vi.stubEnv("VIETAPI_KEY", "");
    const res = await checkModel("deepseek-v4-flash", ["tools"]);
    expect(res.ok).toBe(false);
    expect(res.outcomes[0]).toMatchObject({
      check: "tools",
      ok: false,
      detail: "VIETAPI_KEY not configured",
    });
  });
});
