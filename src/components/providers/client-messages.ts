import type { AbstractIntlMessages } from "next-intl";

/**
 * Exact translation namespaces consumed by `"use client"` components (and any
 * shared modules imported into their client module graph).
 *
 * Passing the entire `messages` JSON (~45–53 KB per locale) to
 * `<NextIntlClientProvider>` duplicated server-only prose (`Legal`, `History`,
 * `About` body copy, `Hero`, `Bento`, `Season`, `Stats`, `Footer`, `Analysis`,
 * `Calendar`, `News.digest`, `PlayerDetail` bios/nationalities) into every
 * page's HTML + RSC flight payload.
 *
 * Kept in sync and enforced at test time by `client-messages.test.ts`, which
 * walks the full TypeScript client import graph across `src/` so zero
 * `MISSING_MESSAGE` runtime errors can ever occur.
 */
export const CLIENT_MESSAGE_NAMESPACES = [
  "About.support",
  "Auth.errors",
  "Auth.login",
  "Auth.register",
  "Common",
  "Fixtures.calendar",
  "Fixtures.detail.empty",
  "Fixtures.nav",
  "Fixtures.timeline",
  "Gallery",
  "Home.match",
  "Language",
  "Match",
  "News.actions",
  "News.article",
  "News.comments",
  "News.feed",
  "News.translate",
  "NextMatch",
  "PlayerDetail.stats",
  "Predict",
  "Profile",
  "Spoiler",
  "Squad",
  "Standings",
] as const;

type MessageRecord = Record<string, unknown>;

function cloneTree(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const copy: MessageRecord = {};
  for (const [k, v] of Object.entries(value as MessageRecord)) {
    copy[k] = cloneTree(v);
  }
  return copy;
}

function mergeInto(target: MessageRecord, source: MessageRecord): void {
  for (const [k, v] of Object.entries(source)) {
    const existing = target[k];
    if (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      existing &&
      typeof existing === "object" &&
      !Array.isArray(existing)
    ) {
      mergeInto(existing as MessageRecord, v as MessageRecord);
    } else {
      target[k] = cloneTree(v);
    }
  }
}

/**
 * Return a minimal `AbstractIntlMessages` tree containing only `namespaces`
 * (dot-separated paths such as `"Common"` or `"About.support"`), never mutating
 * the input `messages` object.
 */
export function pickClientMessages(
  messages: AbstractIntlMessages,
  namespaces: readonly string[] = CLIENT_MESSAGE_NAMESPACES,
): AbstractIntlMessages {
  const out: MessageRecord = {};

  for (const ns of namespaces) {
    const parts = ns.split(".").filter(Boolean);
    if (parts.length === 0) continue;

    let cursor: unknown = messages;
    for (const part of parts) {
      if (!cursor || typeof cursor !== "object" || Array.isArray(cursor)) {
        cursor = undefined;
        break;
      }
      cursor = (cursor as MessageRecord)[part];
    }
    if (cursor === undefined) continue;

    let dest = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const next = dest[part];
      if (!next || typeof next !== "object" || Array.isArray(next)) {
        dest[part] = {};
      }
      dest = dest[part] as MessageRecord;
    }

    const leaf = parts[parts.length - 1];
    const existing = dest[leaf];
    if (
      cursor &&
      typeof cursor === "object" &&
      !Array.isArray(cursor) &&
      existing &&
      typeof existing === "object" &&
      !Array.isArray(existing)
    ) {
      mergeInto(existing as MessageRecord, cursor as MessageRecord);
    } else {
      dest[leaf] = cloneTree(cursor);
    }
  }

  return out as AbstractIntlMessages;
}
