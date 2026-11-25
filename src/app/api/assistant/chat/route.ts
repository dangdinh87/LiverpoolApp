import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import {
  convertToModelMessages,
  smoothStream,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { getDefaultSlotModels } from "@/lib/ai/ai-model-slots";
import { getModelChain } from "@/lib/ai/model-settings";
import { hasAnyAiProvider, resolveFallbackModel } from "@/lib/ai/providers";
import { stripForeignScript } from "@/lib/ai/strip-foreign-script";
import { buildAssistantSystemPrompt } from "@/lib/assistant/prompt";
import { shouldStopAfterNavigate } from "@/lib/assistant/stop-conditions";
import { createAssistantTools } from "@/lib/assistant/tools";
import { moderateMessageContent } from "@/lib/community/moderation";
import { isSameOriginRequest } from "@/lib/http-origin";
import {
  acquireStreamLock,
  checkRateLimit,
  getClientIP,
  releaseStreamLock,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_HISTORY = 6;
const MAX_INPUT_CHARS = 3_000;
const MAX_CONVERSATION_CHARS = 16_000;
const MAX_MESSAGES = 24;
const MIN_PROMPT_CHARS = 2;
const MAX_PROMPT_CHARS = 600;
const STREAM_LOCK_TTL_MS = 45_000;

const GLOBAL_RATE_PER_MINUTE = 120;
const BURST_LIMIT = 2;
const BURST_WINDOW_MS = 8_000;
const RATE_PER_MINUTE = 5;
const RATE_PER_HOUR = 25;
const RATE_PER_DAY = 80;

const reqSchema = z.object({
  messages: z.array(z.unknown()).min(1).max(120),
  path: z.string().max(200).optional(),
  locale: z.enum(["en", "vi"]).optional(),
  spoilerFree: z.boolean().optional(),
});

function rateLimitResponse(retryAfterSec: number) {
  return NextResponse.json(
    { error: "too_many_requests" },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "Cache-Control": "no-store",
      },
    },
  );
}

function extractMessageText(message: UIMessage): string {
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter(
        (part): part is { type: "text"; text: string } =>
          Boolean(part) &&
          typeof part === "object" &&
          part.type === "text" &&
          typeof (part as { text?: unknown }).text === "string",
      )
      .map((part) => part.text)
      .join("\n")
      .trim();
  }
  const legacy = (message as unknown as { content?: unknown }).content;
  return typeof legacy === "string" ? legacy.trim() : "";
}

function withStreamRelease(res: Response, onDone: () => void): Response {
  if (!res.body) {
    onDone();
    return res;
  }
  const reader = res.body.getReader();
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          onDone();
          controller.close();
          return;
        }
        controller.enqueue(value);
      } catch (err) {
        onDone();
        controller.error(err);
      }
    },
    cancel(reason) {
      onDone();
      return reader.cancel(reason);
    },
  });
  return new Response(body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!hasAnyAiProvider()) {
    return NextResponse.json({ error: "ai_unconfigured" }, { status: 503 });
  }

  const ip = getClientIP(req);
  if (!checkRateLimit("assistant:global:min", GLOBAL_RATE_PER_MINUTE, 60_000).allowed) {
    return rateLimitResponse(60);
  }
  if (!checkRateLimit(`assistant:burst:${ip}`, BURST_LIMIT, BURST_WINDOW_MS).allowed) {
    return rateLimitResponse(8);
  }
  if (!checkRateLimit(`assistant:min:${ip}`, RATE_PER_MINUTE, 60_000).allowed) {
    return rateLimitResponse(60);
  }
  if (!checkRateLimit(`assistant:hr:${ip}`, RATE_PER_HOUR, 3_600_000).allowed) {
    return rateLimitResponse(3_600);
  }
  if (!checkRateLimit(`assistant:day:${ip}`, RATE_PER_DAY, 86_400_000).allowed) {
    return rateLimitResponse(3_600);
  }

  const parsed = reqSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Never trust client-supplied system messages.
  const uiMessages = (parsed.data.messages as UIMessage[]).filter(
    (m) => m && typeof m === "object" && m.role !== "system",
  );
  if (uiMessages.length === 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (
    uiMessages.length > MAX_MESSAGES ||
    JSON.stringify(uiMessages).length > MAX_CONVERSATION_CHARS
  ) {
    return NextResponse.json(
      { error: "conversation_too_long" },
      { status: 409 },
    );
  }

  const windowed = uiMessages.slice(-MAX_HISTORY);
  const latest = windowed[windowed.length - 1];
  if (!latest || latest.role !== "user") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const userPrompt = extractMessageText(latest);
  if (userPrompt.length < MIN_PROMPT_CHARS) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (userPrompt.length > MAX_PROMPT_CHARS || JSON.stringify(latest).length > MAX_INPUT_CHARS) {
    return NextResponse.json({ error: "input_too_long" }, { status: 413 });
  }

  const promptMod = moderateMessageContent(userPrompt, {
    allowLinks: false,
    minLen: MIN_PROMPT_CHARS,
    maxLen: MAX_PROMPT_CHARS,
    maxLineBreaks: 10,
  });
  if (!promptMod.ok) {
    return NextResponse.json({ error: "invalid_prompt" }, { status: 400 });
  }

  let sendable = windowed;
  while (
    sendable.length > 1 &&
    JSON.stringify(sendable).length > MAX_INPUT_CHARS
  ) {
    sendable = sendable.slice(1);
  }

  const lockKey = `assistant:${ip}`;
  if (!acquireStreamLock(lockKey, STREAM_LOCK_TTL_MS)) {
    return rateLimitResponse(5);
  }

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    releaseStreamLock(lockKey);
  };
  req.signal?.addEventListener("abort", release, { once: true });

  let handedOff = false;
  try {
    const modelMessages = await convertToModelMessages(sendable).catch(() => null);
    if (!modelMessages) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    const locale = parsed.data.locale ?? "en";
    const spoilerFree = Boolean(parsed.data.spoilerFree);
    const system = buildAssistantSystemPrompt({
      locale,
      path: parsed.data.path,
      spoilerFree,
    });
    const tools = createAssistantTools({ locale, spoilerFree });

    const chain = await getModelChain(
      "assistant",
      getDefaultSlotModels("assistant"),
    );
    const model = resolveFallbackModel(chain, { feature: "assistant" });

    const result = streamText({
      model,
      maxRetries: 0,
      abortSignal: req.signal,
      system,
      messages: modelMessages,
      tools,
      // Allow up to 3 steps (lookup tool + navigate + final prose), and stop
      // right after any step that emitted prose plus valid navigate cards.
      stopWhen: [stepCountIs(3), shouldStopAfterNavigate],
      experimental_transform: [
        () =>
          new TransformStream({
            transform(chunk, controller) {
              if (chunk.type === "text-delta") {
                controller.enqueue({
                  ...chunk,
                  text: stripForeignScript(chunk.text),
                });
                return;
              }
              controller.enqueue(chunk);
            },
          }),
        smoothStream({ delayInMs: 12, chunking: "word" }),
      ],
      temperature: 0.3,
      maxOutputTokens: 800,
      onFinish: release,
      onAbort: release,
      onError: ({ error }) => {
        release();
        console.error("[assistant] stream error:", error);
      },
    });

    const streamResponse = result.toUIMessageStreamResponse({
      originalMessages: uiMessages,
      generateMessageId: () => randomUUID(),
      headers: {
        "Cache-Control": "no-store",
      },
    });
    handedOff = true;
    return withStreamRelease(streamResponse, release);
  } catch (err) {
    console.error("[assistant] failed to start stream:", err);
    return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
  } finally {
    if (!handedOff) {
      release();
    }
  }
}
