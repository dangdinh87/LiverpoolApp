import type { NewsArticle } from "../types";

export type SourceFetchState = "ok" | "http_error" | "timeout" | "parse_error" | "error";

/** What happened on the last fetch() — adapters swallow errors and return [], so this is the only trace. */
export interface SourceFetchStatus {
  state: SourceFetchState;
  httpStatus?: number;
  error?: string;
}

export interface FeedAdapter {
  readonly name: string;
  /** Set by fetch(); undefined until the adapter has run. */
  status?: SourceFetchStatus;
  fetch(): Promise<NewsArticle[]>;
}

/** Map a thrown fetch/parse error to a status. */
export function statusFromError(err: unknown, kind: "network" | "parse" = "network"): SourceFetchStatus {
  const name = err instanceof Error ? err.name : "";
  const message = err instanceof Error ? err.message : String(err);
  if (name === "TimeoutError" || name === "AbortError" || /timed? ?out|aborted/i.test(message)) {
    return { state: "timeout", error: message.slice(0, 160) };
  }
  return { state: kind === "parse" ? "parse_error" : "error", error: message.slice(0, 160) };
}

/** Worst-first ordering used to merge statuses of several adapters under one source name. */
const SEVERITY: Record<SourceFetchState, number> = {
  ok: 0, parse_error: 1, error: 2, http_error: 3, timeout: 4,
};

export function worseStatus(a: SourceFetchStatus | undefined, b: SourceFetchStatus | undefined): SourceFetchStatus | undefined {
  if (!a) return b;
  if (!b) return a;
  return SEVERITY[b.state] > SEVERITY[a.state] ? b : a;
}
