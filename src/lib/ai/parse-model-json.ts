/**
 * Turn a model's reply into an object.
 *
 * Models wrap JSON in code fences, surround it with prose, leave trailing
 * commas, and put raw newlines inside long strings. Each of those is repaired
 * here rather than costing a whole generation, because a reply that is correct
 * apart from a stray newline is not worth discarding.
 *
 * Shared by the daily digest and the site's own articles: both ask a model for
 * structured text, and both used to need their own copy of this.
 */

/** Escape control characters inside strings and drop trailing commas. */
export function repairJson(body: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (const ch of body) {
    if (inString) {
      if (escaped) {
        escaped = false;
        out += ch;
      } else if (ch === "\\") {
        escaped = true;
        out += ch;
      } else if (ch === '"') {
        inString = false;
        out += ch;
      } else if (ch === "\n") out += "\\n";
      else if (ch === "\r") out += "\\r";
      else if (ch === "\t") out += "\\t";
      else out += ch;
    } else {
      if (ch === '"') inString = true;
      out += ch;
    }
  }
  return out.replace(/,\s*([}\]])/g, "$1");
}

/**
 * Parse the first JSON object in a model reply.
 *
 * @throws when the reply contains no object, or none that parses even repaired.
 */
export function parseModelJson<T = unknown>(text: string): T {
  const stripped = text.replace(/^\s*```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in model output");
  const body = stripped.slice(start, end + 1);

  let lastError: unknown;
  for (const candidate of [body, repairJson(body)]) {
    try {
      return JSON.parse(candidate) as T;
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `model output was not JSON: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}
