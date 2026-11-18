import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import en from "@/messages/en.json";
import vi from "@/messages/vi.json";
import squad from "@/data/squad.json";
import playerBiosVi from "@/data/player-bios.vi.json";

/** Flatten nested message objects to dotted keys: { a: { b: "x" } } → ["a.b"]. */
function keysOf(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === "object"
      ? keysOf(value as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

function flattenStrings(obj: Record<string, unknown>, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") {
      flattenStrings(value as Record<string, unknown>, path, out);
    } else {
      out[path] = String(value);
    }
  }
  return out;
}

/** Extract top-level ICU placeholder names (`{count}`, `{n, plural, ...}`) and rich tags (`<b>`). */
function extractPlaceholders(message: string): Set<string> {
  const names = new Set<string>();
  let depth = 0;
  let i = 0;
  while (i < message.length) {
    const ch = message[i];
    if (ch === "{") {
      if (depth === 0) {
        const match = /^\{(\w+)\s*(?:,|})/.exec(message.slice(i));
        if (match) names.add(match[1]);
      }
      depth++;
    } else if (ch === "}") {
      depth = Math.max(0, depth - 1);
    }
    i++;
  }
  for (const [, tag] of message.matchAll(/<([a-zA-Z][\w-]*)>/g)) {
    names.add(`<${tag}>`);
  }
  return names;
}

/**
 * English-only grammatical inflection helpers where Vietnamese nouns/ordinals are
 * invariable (e.g. the numeric figure is rendered separately in `<dd>`).
 */
const ENGLISH_ONLY_INFLECTION_VARS: Record<string, string[]> = {
  "Squad.count": ["n"],
  "Standings.hero.lfcPosition": ["suffix"],
  "Standings.summary.behindLeader": ["count"],
  "Standings.summary.topFourClear": ["count"],
  "Standings.summary.topFourBehind": ["count"],
  "Standings.summary.aboveDrop": ["count"],
  "Match.countdown.inMonths": ["s"],
};

describe("i18n messages", () => {
  // A key present in one locale only renders as a raw "Namespace.key" string in
  // the other (that is how "BENTO.UNBEATEN" reached the homepage).
  it("defines the same keys in en and vi", () => {
    const enKeys = new Set(keysOf(en));
    const viKeys = new Set(keysOf(vi));
    expect([...enKeys].filter((k) => !viKeys.has(k)), "missing in vi").toEqual([]);
    expect([...viKeys].filter((k) => !enKeys.has(k)), "missing in en").toEqual([]);
  });

  it("keeps ICU placeholder and rich-tag parity between en and vi", () => {
    const flatEn = flattenStrings(en);
    const flatVi = flattenStrings(vi);
    const mismatches: string[] = [];

    for (const key of Object.keys(flatEn)) {
      const allowedEnOnly = new Set(ENGLISH_ONLY_INFLECTION_VARS[key] ?? []);
      const enVars = [...extractPlaceholders(flatEn[key])].filter((v) => !allowedEnOnly.has(v)).sort();
      const viVars = [...extractPlaceholders(flatVi[key] ?? "")].sort();
      if (JSON.stringify(enVars) !== JSON.stringify(viVars)) {
        mismatches.push(`${key}: en=${JSON.stringify(enVars)} vs vi=${JSON.stringify(viVars)}`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("never reintroduces forbidden 'for fans abroad' positioning or deleted chat copy", () => {
    const forbidden =
      /for fans abroad|far from home|outside england|cho fan ở xa|xa nhà|ngoài nước anh|ở đâu cũng là anfield|chat history|lịch sử trò chuyện|reds ai|web search|\b10 sources\b|\b10 nguồn\b/i;

    const checkedFiles = [
      "src/messages/en.json",
      "src/messages/vi.json",
      "src/lib/prompts/site-article-voice.ts",
      "src/lib/prompts/current-facts.ts",
      "src/app/llms.txt/route.ts",
      "src/data/club-info.json",
      "src/data/club-info.vi.json",
      "src/data/history.json",
      "src/data/history.vi.json",
      "src/data/legends.json",
      "src/data/legends.vi.json",
    ];

    const violations: string[] = [];
    for (const rel of checkedFiles) {
      const content = readFileSync(join(process.cwd(), rel), "utf8");
      const match = forbidden.exec(content);
      if (match) violations.push(`${rel}: matched "${match[0]}"`);
    }
    expect(violations).toEqual([]);
  });

  it("provides both English and Vietnamese biographies for every active squad player", () => {
    const viMap = playerBiosVi as Record<string, string>;
    const missingEn = squad.players.filter((p) => !p.bio.trim()).map((p) => p.slug);
    const missingVi = squad.players.filter((p) => !viMap[p.slug]?.trim()).map((p) => p.slug);
    expect(missingEn, "missing English squad bios").toEqual([]);
    expect(missingVi, "missing Vietnamese squad bios").toEqual([]);
  });
});

describe("translation keys used in source", () => {
  // Catches keys missing from BOTH locales, which parity cannot see. Static
  // calls only: `const t = useTranslations("Ns")` / `await getTranslations("Ns")`
  // followed by `t("literal.key")`; template-literal keys are skipped.
  it("all exist in en.json", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
          if (name !== "__tests__") walk(full);
        } else if (/\.(ts|tsx)$/.test(name)) files.push(full);
      }
    };
    walk(join(process.cwd(), "src"));

    const has = (path: string) =>
      path.split(".").reduce<unknown>(
        (o, part) => (o && typeof o === "object" ? (o as Record<string, unknown>)[part] : undefined),
        en,
      ) !== undefined;

    const missing: string[] = [];
    const binding =
      /(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:\{\s*namespace:\s*)?["']([\w.]+)["']/g;
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      const fileNamespaces = [...src.matchAll(/(?:useTranslations|getTranslations)\(\s*["']([\w.]+)["']/g)].map((m) => m[1]);
      const bindings = [...src.matchAll(binding)].map((m) => ({ fn: m[1], ns: m[2], at: m.index! }));
      for (const [i, { fn, ns, at }] of bindings.entries()) {
        // A name like `t` is often re-bound per function (generateMetadata vs the
        // page); a binding's scope runs until the next binding of the same name.
        const next = bindings.slice(i + 1).find((b) => b.fn === fn);
        const scope = src.slice(at, next?.at ?? src.length);
        const call = new RegExp(`\\b${fn}(?:\\.rich|\\.raw|\\.markup)?\\(\\s*["']([\\w.]+)["']`, "g");
        for (const [, key] of scope.matchAll(call)) {
          // Destructured bindings (`const [t] = await Promise.all([getTranslations("X")])`)
          // are not matched above, so accept a key found under any namespace the file loads.
          if (!has(`${ns}.${key}`) && !fileNamespaces.some((n) => has(`${n}.${key}`))) {
            missing.push(`${file.split("/src/")[1]}: ${ns}.${key}`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
