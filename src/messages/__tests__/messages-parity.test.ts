import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import en from "@/messages/en.json";
import vi from "@/messages/vi.json";
import clubInfoEn from "@/data/club-info.json";
import clubInfoVi from "@/data/club-info.vi.json";
import historyEn from "@/data/history.json";
import historyVi from "@/data/history.vi.json";
import legendsEn from "@/data/legends.json";
import legendsVi from "@/data/legends.vi.json";
import trophiesEn from "@/data/trophies.json";
import trophiesVi from "@/data/trophies.vi.json";
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

  it("contains zero empty string values in en.json and vi.json", () => {
    const emptyEn = Object.entries(flattenStrings(en))
      .filter(([, v]) => v.length === 0)
      .map(([k]) => k);
    const emptyVi = Object.entries(flattenStrings(vi))
      .filter(([, v]) => v.length === 0)
      .map(([k]) => k);
    expect(emptyEn, "empty values in en.json").toEqual([]);
    expect(emptyVi, "empty values in vi.json").toEqual([]);
  });

  it("contains zero leading/trailing whitespace, non-breaking spaces, or accidental double spaces inside translation values", () => {
    const issues: string[] = [];
    for (const [locale, map] of [
      ["en", flattenStrings(en)],
      ["vi", flattenStrings(vi)],
    ] as const) {
      for (const [key, value] of Object.entries(map)) {
        if (value !== value.trim()) {
          issues.push(`${locale}:${key} has leading/trailing whitespace: ${JSON.stringify(value)}`);
        }
        if (/  /.test(value)) {
          issues.push(`${locale}:${key} has accidental double spaces: ${JSON.stringify(value)}`);
        }
        if (/[\u00A0\u200B]/.test(value)) {
          issues.push(`${locale}:${key} has NBSP or zero-width space: ${JSON.stringify(value)}`);
        }
      }
    }
    expect(issues).toEqual([]);
  });

  it("maintains British English spelling and calm publication-grade tone in en.json and vi.json", () => {
    const usSpelling =
      /\b(favorites?|honors?|colors?|centers?|defenses?|offenses?|programs?|organized?|organizing|recognizes?|recognized|recognizing|summarizes?|summarized|summarizing|lineups?|shootouts?)\b/i;
    const enViolations = Object.entries(flattenStrings(en))
      .filter(([, v]) => usSpelling.test(v))
      .map(([k, v]) => `${k}: ${v}`);
    expect(enViolations, "US spellings in en.json").toEqual([]);

    const casualVi = /(?<![\p{L}])(nhé|(?<!Bồ Đào |Tây Ban )nha|ạ|cái gì|tụi mình|bọn mình)(?![\p{L}])/iu;
    const viViolations = Object.entries(flattenStrings(vi))
      .filter(([, v]) => casualVi.test(v))
      .map(([k, v]) => `${k}: ${v}`);
    expect(viViolations, "casual particles in vi.json").toEqual([]);

    // Exclamation marks are reserved strictly for the playful 404 headline ("Offside!" / "Việt vị!").
    for (const [locale, map] of [
      ["en", flattenStrings(en)],
      ["vi", flattenStrings(vi)],
    ] as const) {
      const exclamations = Object.entries(map)
        .filter(([k, v]) => k !== "Common.notFoundTitle" && v.includes("!"))
        .map(([k, v]) => `${locale}:${k}: ${v}`);
      expect(exclamations, "unexpected exclamation marks").toEqual([]);
    }
  });

  it("never reintroduces forbidden 'for fans abroad' positioning, legacy brand names, or deleted chat copy", () => {
    const forbidden =
      /for fans abroad|far from home|outside england|cho fan ở xa|xa nhà|ngoài nước anh|ở đâu cũng là anfield|lfcvn|reds abroad|liverpool daily|liverpoolfcvn\.blog|chat history|lịch sử trò chuyện|reds ai|web search|\b10 sources\b|\b10 nguồn\b/i;

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
      "src/data/trophies.json",
      "src/data/trophies.vi.json",
      "src/data/player-bios.vi.json",
      "src/data/squad.json",
    ];

    const violations: string[] = [];
    for (const rel of checkedFiles) {
      const content = readFileSync(join(process.cwd(), rel), "utf8");
      const match = forbidden.exec(content);
      if (match) violations.push(`${rel}: matched "${match[0]}"`);
    }
    expect(violations).toEqual([]);
  });

  it("maintains 100% trophy, legend, history, and club-info parity between .json and .vi.json data files", () => {
    // 1. Trophies parity & internal count consistency
    expect(trophiesVi.length, "trophies length").toBe(trophiesEn.length);
    trophiesEn.forEach((tEn, i) => {
      const tVi = trophiesVi[i];
      expect(tVi.image, `trophy[${i}] image/ID`).toBe(tEn.image);
      expect(tVi.count, `trophy[${i}] count`).toBe(tEn.count);
      expect(tVi.years, `trophy[${i}] years`).toEqual(tEn.years);
      expect(tEn.years.length, `trophy[${i}] (${tEn.name}) count vs years.length`).toBe(tEn.count);
      expect(tEn.name.trim().length).toBeGreaterThan(0);
      expect(tVi.name.trim().length).toBeGreaterThan(0);
    });

    // Club honours object matches trophies.json counts
    expect(clubInfoVi.honours).toEqual(clubInfoEn.honours);
    expect(clubInfoEn.honours).toEqual({
      leagueTitles: trophiesEn[0].count,
      championsLeague: trophiesEn[1].count,
      faCup: trophiesEn[2].count,
      leagueCup: trophiesEn[3].count,
      uefaCup: trophiesEn[4].count,
      superCup: trophiesEn[5].count,
      clubWorldCup: trophiesEn[6].count,
      communityShield: trophiesEn[7].count,
    });

    // 2. Legends parity (name/ID, image, appearances, goals, era years)
    expect(legendsVi.length, "legends length").toBe(legendsEn.length);
    legendsEn.forEach((lEn, i) => {
      const lVi = legendsVi[i];
      expect(lVi.name, `legend[${i}] name`).toBe(lEn.name);
      expect(lVi.image, `legend[${i}] image`).toBe(lEn.image);
      expect(lVi.caps, `legend[${i}] (${lEn.name}) caps`).toBe(lEn.caps);
      expect(lVi.goals, `legend[${i}] (${lEn.name}) goals`).toBe(lEn.goals);
      expect(lVi.years, `legend[${i}] (${lEn.name}) years`).toBe(lEn.years.replace("present", "nay"));
      expect(lEn.bio.trim().length).toBeGreaterThan(0);
      expect(lVi.bio.trim().length).toBeGreaterThan(0);
    });

    // 3. Timeline history parity
    expect(historyVi.length, "history length").toBe(historyEn.length);
    historyEn.forEach((hEn, i) => {
      const hVi = historyVi[i];
      expect(hVi.year, `history[${i}] year`).toBe(hEn.year);
      expect(hVi.image, `history[${i}] image`).toBe(hEn.image);
      expect((hVi as { era?: string }).era, `history[${i}] era`).toBe((hEn as { era?: string }).era);
      expect(hEn.title.trim().length).toBeGreaterThan(0);
      expect(hVi.title.trim().length).toBeGreaterThan(0);
      expect(hEn.description.trim().length).toBeGreaterThan(0);
      expect(hVi.description.trim().length).toBeGreaterThan(0);
    });

    // 4. Club info stadium, records, and managers parity
    expect(clubInfoVi.captain).toBe(clubInfoEn.captain);
    expect(clubInfoVi.manager).toBe(clubInfoEn.manager);
    expect(clubInfoVi.stadium.capacity).toBe(clubInfoEn.stadium.capacity);
    expect(clubInfoVi.stadium.opened).toBe(clubInfoEn.stadium.opened);
    expect(clubInfoVi.stadium.stands.map((s) => ({ name: s.name, capacity: s.capacity }))).toEqual(
      clubInfoEn.stadium.stands.map((s) => ({ name: s.name, capacity: s.capacity })),
    );
    expect(clubInfoVi.records.topScorer).toEqual(clubInfoEn.records.topScorer);
    expect(clubInfoVi.records.mostAppearances).toEqual(clubInfoEn.records.mostAppearances);
    expect(clubInfoVi.managers.length).toBe(clubInfoEn.managers.length);
    clubInfoEn.managers.forEach((mEn, i) => {
      const mVi = clubInfoVi.managers[i];
      expect(mVi.name).toBe(mEn.name);
      expect(mVi.image).toBe(mEn.image);
      expect(mVi.years).toBe(mEn.years.replace("present", "nay"));
    });
  });

  it("provides clean, non-empty English and Vietnamese biographies for every active squad player", () => {
    const viMap = playerBiosVi as Record<string, string>;
    const squadSlugs = new Set(squad.players.map((p) => p.slug));
    const missingEn = squad.players.filter((p) => !p.bio.trim()).map((p) => p.slug);
    const missingVi = squad.players.filter((p) => !viMap[p.slug]?.trim()).map((p) => p.slug);
    const orphanVi = Object.keys(viMap).filter((slug) => !squadSlugs.has(slug));
    const doubleSpacedVi = Object.entries(viMap)
      .filter(([, bio]) => /  /.test(bio) || bio !== bio.trim())
      .map(([slug]) => slug);

    expect(missingEn, "missing English squad bios").toEqual([]);
    expect(missingVi, "missing Vietnamese squad bios").toEqual([]);
    expect(orphanVi, "orphan slugs in player-bios.vi.json").toEqual([]);
    expect(doubleSpacedVi, "whitespace issues in player-bios.vi.json").toEqual([]);
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
