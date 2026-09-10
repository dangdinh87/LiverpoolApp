import type { ConsoleMessage, Page, Request, Response } from "@playwright/test";

/** A problem observed in the browser while a page was exercised. */
export interface PageProblem {
  kind: "console" | "pageerror" | "requestfailed" | "httperror";
  detail: string;
}

/**
 * Noise that is not worth failing a build over: third-party embeds, cancelled
 * navigations, and browser-level warnings we do not control.
 */
const IGNORED = [
  /favicon/i,
  /net::ERR_ABORTED/i,
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /googletagmanager|google-analytics|vercel\.live|doubleclick/i,
  // Vercel Analytics/Speed Insights are injected by the platform at the edge and
  // 404 on any non-Vercel host, including a local production server.
  /\/_vercel\/(insights|speed-insights)\//i,
];

function ignored(text: string): boolean {
  return IGNORED.some((re) => re.test(text));
}

/**
 * Attach listeners that record browser-side failures for the lifetime of a page.
 *
 * Returns the live array; read it after the interactions under test complete.
 */
export function collectProblems(page: Page): PageProblem[] {
  const problems: PageProblem[] = [];

  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    // A failed subresource logs a generic message; only its location names the
    // URL, so both must be checked against the ignore list.
    const url = msg.location()?.url ?? "";
    if (ignored(text) || (url && ignored(url))) return;
    problems.push({ kind: "console", detail: url ? `${text} (${url})` : text });
  });

  page.on("pageerror", (err: Error) => {
    if (ignored(err.message)) return;
    problems.push({ kind: "pageerror", detail: `${err.name}: ${err.message}` });
  });

  page.on("requestfailed", (req: Request) => {
    const detail = `${req.method()} ${req.url()} — ${req.failure()?.errorText ?? "failed"}`;
    if (ignored(detail)) return;
    problems.push({ kind: "requestfailed", detail });
  });

  page.on("response", (res: Response) => {
    // Only flag server-side failures; third-party 4xx is out of scope.
    if (res.status() < 500) return;
    const url = res.url();
    if (ignored(url)) return;
    problems.push({ kind: "httperror", detail: `${res.status()} ${url}` });
  });

  return problems;
}

/** Render problems as a readable assertion message. */
export function formatProblems(problems: PageProblem[]): string {
  if (problems.length === 0) return "none";
  return problems.map((p) => `  [${p.kind}] ${p.detail}`).join("\n");
}
