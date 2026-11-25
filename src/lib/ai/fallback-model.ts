import type { ChatModel } from "./vietapi";

const FIRST_RESPONSE_TIMEOUT_MS = 15_000;
const GENERATE_TIMEOUT_MS = 30_000;

class ModelTimeoutError extends Error {
  constructor(modelId: string, timeoutMs: number) {
    super(`Model ${modelId} did not respond within ${timeoutMs}ms`);
    this.name = "ModelTimeoutError";
  }
}

async function callWithTimeout<T>(
  model: ChatModel,
  options: { abortSignal?: AbortSignal },
  call: (opts: { abortSignal?: AbortSignal }) => PromiseLike<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const onUpstreamAbort = () => controller.abort(options.abortSignal?.reason);
  options.abortSignal?.addEventListener("abort", onUpstreamAbort, {
    once: true,
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      call({ ...options, abortSignal: controller.signal }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          const timeoutErr = new ModelTimeoutError(model.modelId, timeoutMs);
          controller.abort(timeoutErr);
          reject(timeoutErr);
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    options.abortSignal?.removeEventListener("abort", onUpstreamAbort);
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Wrap a prioritized list of models into a single `ChatModel` that falls back
 * sequentially on open/timeout/upstream failures while respecting upstream aborts.
 */
export function withFallback(
  models: ChatModel[],
  options?: { firstResponseTimeoutMs?: number; generateTimeoutMs?: number },
): ChatModel {
  if (models.length === 0) {
    throw new Error("withFallback requires at least one model");
  }
  const [primary] = models;
  const firstResponseTimeoutMs =
    options?.firstResponseTimeoutMs ?? FIRST_RESPONSE_TIMEOUT_MS;
  const generateTimeoutMs = options?.generateTimeoutMs ?? GENERATE_TIMEOUT_MS;

  async function attempt<T>(
    callOptions: { abortSignal?: AbortSignal },
    call: (
      model: ChatModel,
      opts: { abortSignal?: AbortSignal },
    ) => PromiseLike<T>,
    timeoutMs: number,
  ): Promise<T> {
    let lastError: unknown;
    for (const model of models) {
      if (callOptions.abortSignal?.aborted) {
        throw callOptions.abortSignal.reason ?? new Error("Aborted");
      }
      try {
        const result = await callWithTimeout(
          model,
          callOptions,
          (opts) => call(model, opts),
          timeoutMs,
        );
        console.info(`[ai] answered by ${model.provider} · ${model.modelId}`);
        return result;
      } catch (error) {
        lastError = error;
        console.warn(
          `[ai] model ${model.modelId} failed, trying next:`,
          error,
        );
      }
    }
    throw lastError;
  }

  return {
    specificationVersion: primary.specificationVersion,
    provider: primary.provider,
    modelId: primary.modelId,
    get supportedUrls() {
      return primary.supportedUrls;
    },
    doGenerate: (callOptions) =>
      attempt(
        callOptions,
        (model, opts) => model.doGenerate({ ...callOptions, ...opts }),
        generateTimeoutMs,
      ),
    doStream: (callOptions) =>
      attempt(
        callOptions,
        (model, opts) => model.doStream({ ...callOptions, ...opts }),
        firstResponseTimeoutMs,
      ),
  };
}
