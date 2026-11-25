import { generateText, tool } from "ai";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import type { AiModelCheck } from "./ai-model-slots";
import {
  GOOGLE_BASE_URL,
  isGoogleModel,
  isModelConfigured,
  resolveChatModel,
} from "./providers";
import { FOREIGN_SCRIPT, hasForeignScript } from "./strip-foreign-script";
import { VIETAPI_BASE_URL } from "./vietapi";
import { isWorkersAiModel, workersAiBaseUrl } from "./workers-ai";

const CHECK_TIMEOUT_MS = 30_000;
const CHECK_MAX_OUTPUT_TOKENS = 1500;

const VIETNAMESE_DIACRITIC =
  /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;

export interface CheckOutcome {
  check: AiModelCheck;
  ok: boolean;
  detail: string;
  ms: number;
}

export interface ModelCheckResult {
  model: string;
  ok: boolean;
  outcomes: CheckOutcome[];
}

function unconfiguredMessage(model: string): string {
  if (isWorkersAiModel(model)) {
    return "CF_AIG_ACCOUNT_ID / CF_AIG_TOKEN not configured for Workers AI";
  }
  if (isGoogleModel(model)) {
    return "GEMINI_API_KEY not configured for Google Gemini";
  }
  return "VIETAPI_KEY not configured";
}

function firstForeignChar(text: string): string | null {
  FOREIGN_SCRIPT.lastIndex = 0;
  const match = FOREIGN_SCRIPT.exec(text);
  FOREIGN_SCRIPT.lastIndex = 0;
  return match ? match[0] : null;
}

/** Return failure reason or null if Vietnamese output is clean and accented. */
export function judgeVietnamese(text: string): string | null {
  const t = text.trim();
  if (t.length < 20) return `reply too short: "${t.slice(0, 60)}"`;
  if (hasForeignScript(t)) {
    return `unexpected foreign script "${firstForeignChar(t) ?? ""}"`;
  }
  if (!VIETNAMESE_DIACRITIC.test(t)) return "missing Vietnamese diacritics";
  return null;
}

/** Return failure reason or null if English output is clean and substantive. */
export function judgeEnglish(text: string): string | null {
  const t = text.trim();
  if (t.length < 20) return `reply too short: "${t.slice(0, 60)}"`;
  if (hasForeignScript(t)) {
    return `unexpected foreign script "${firstForeignChar(t) ?? ""}"`;
  }
  if (!/[a-z]{3,}/i.test(t)) return "no English words in reply";
  return null;
}

/** Return failure reason or null if JSON output contains the expected test shape. */
export function judgeJson(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return `no JSON object found: "${text.trim().slice(0, 60)}"`;
  }
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as {
      ok?: unknown;
      items?: unknown;
    };
    if (
      parsed.ok !== true ||
      !Array.isArray(parsed.items) ||
      parsed.items.length !== 3
    ) {
      return "JSON does not match required schema";
    }
    return null;
  } catch {
    return "JSON could not be parsed";
  }
}

export function errorDetail(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (
    (err instanceof Error &&
      (err.name === "AbortError" || err.name === "TimeoutError")) ||
    /abort|timed? ?out/i.test(message)
  ) {
    return `timed out after ${CHECK_TIMEOUT_MS / 1000}s`;
  }
  if (/no available channel/i.test(message)) {
    return "VietAPI has no available channel for this model with the app key";
  }
  if (/\b401\b|api key required/i.test(message)) {
    return "app key lacks permission for this model (401)";
  }
  return message
    .replace(/^Failed after \d+ attempts?\. Last error: /i, "")
    .replace(/\s*\(request id:[^)]*\)/i, "")
    .slice(0, 160);
}

async function timed(
  check: AiModelCheck,
  run: (signal: AbortSignal) => Promise<string | null>,
): Promise<CheckOutcome> {
  const started = Date.now();
  const signal = AbortSignal.timeout(CHECK_TIMEOUT_MS);
  try {
    const failure = await run(signal);
    return {
      check,
      ok: failure === null,
      detail: failure ?? "ok",
      ms: Date.now() - started,
    };
  } catch (err) {
    return {
      check,
      ok: false,
      detail: errorDetail(err),
      ms: Date.now() - started,
    };
  }
}

const RUNNERS: Record<
  AiModelCheck,
  (model: string, signal: AbortSignal) => Promise<string | null>
> = {
  vietnamese: async (model, abortSignal) => {
    if (!isModelConfigured(model)) return unconfiguredMessage(model);
    const { text } = await generateText({
      model: resolveChatModel(
        model,
        { feature: "check-model" },
        { useGateway: false },
      ),
      abortSignal,
      maxOutputTokens: CHECK_MAX_OUTPUT_TOKENS,
      maxRetries: 1,
      system:
        "Bạn là biên tập viên bóng đá viết cho chuyên trang Liverpool FC. Luôn trả lời bằng tiếng Việt có dấu, tự nhiên và không chèn chữ thuộc hệ chữ khác.",
      prompt:
        "Trong 2 câu, tóm tắt vì sao pressing tầm cao giúp kiểm soát nhịp trận đấu.",
    });
    return judgeVietnamese(text);
  },
  english: async (model, abortSignal) => {
    if (!isModelConfigured(model)) return unconfiguredMessage(model);
    const { text } = await generateText({
      model: resolveChatModel(
        model,
        { feature: "check-model" },
        { useGateway: false },
      ),
      abortSignal,
      maxOutputTokens: CHECK_MAX_OUTPUT_TOKENS,
      maxRetries: 1,
      system:
        "You are a concise football editor writing in British English. Reply in plain prose only.",
      prompt:
        "In two sentences, explain how midfield control shapes a Premier League match.",
    });
    return judgeEnglish(text);
  },
  json: async (model, abortSignal) => {
    if (!isModelConfigured(model)) return unconfiguredMessage(model);
    const onCf = isWorkersAiModel(model);
    const onGoogle = !onCf && isGoogleModel(model);
    const baseUrl = onCf
      ? workersAiBaseUrl()
      : onGoogle
        ? GOOGLE_BASE_URL
        : VIETAPI_BASE_URL;
    const bearer = onCf
      ? (getEnv("CF_AIG_TOKEN") ?? "")
      : onGoogle
        ? (getEnv("GEMINI_API_KEY") ?? "")
        : (getEnv("VIETAPI_KEY") ?? "");
    const gateway = getEnv("CF_AIG_GATEWAY_ID");

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
        ...(onCf && gateway
          ? {
              "cf-aig-gateway-id": gateway,
              "cf-aig-metadata": JSON.stringify({ feature: "check-model" }),
            }
          : {}),
      },
      body: JSON.stringify({
        ...(onCf ? { chat_template_kwargs: { enable_thinking: false } } : {}),
        model,
        messages: [
          {
            role: "system",
            content: "Return ONLY valid JSON with no extra explanation.",
          },
          {
            role: "user",
            content:
              'Return JSON matching {"ok": true, "items": [...]} where items has 3 short strings naming football midfield roles.',
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: CHECK_MAX_OUTPUT_TOKENS,
      }),
      signal: abortSignal,
    });
    if (!res.ok) {
      return `HTTP ${res.status}: ${(await res.text()).slice(0, 120)}`;
    }
    type Msg = { content?: string | null; reasoning_content?: string | null };
    const data = (await res.json()) as { choices?: { message?: Msg }[] };
    const msg = data.choices?.[0]?.message;
    return judgeJson(msg?.content || msg?.reasoning_content || "");
  },
  tools: async (model, abortSignal) => {
    if (!isModelConfigured(model)) return unconfiguredMessage(model);
    const { toolCalls } = await generateText({
      model: resolveChatModel(
        model,
        { feature: "check-model" },
        { useGateway: false },
      ),
      abortSignal,
      maxOutputTokens: CHECK_MAX_OUTPUT_TOKENS,
      maxRetries: 1,
      system:
        "You are Anfield Daily's site assistant. When a reader asks to open a page, call the navigate tool with the route path (for example /fixtures).",
      prompt: "Open Liverpool's fixtures and schedule page for me.",
      tools: {
        navigate: tool({
          description: "Display a clickable navigation card to a route on the site.",
          inputSchema: z.object({ path: z.string() }),
        }),
      },
    });
    const called = toolCalls.some((c) => c.toolName === "navigate");
    return called ? null : "did not invoke navigate tool";
  },
};

/** Run capability probes on `model` in parallel and report pass/fail with timings. */
export async function checkModel(
  model: string,
  checks: AiModelCheck[],
): Promise<ModelCheckResult> {
  const outcomes = await Promise.all(
    checks.map((c) => timed(c, (signal) => RUNNERS[c](model, signal))),
  );
  return { model, ok: outcomes.every((o) => o.ok), outcomes };
}
