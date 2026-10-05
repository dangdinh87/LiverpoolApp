import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import vi from "@/messages/vi.json";

/** Flatten nested message objects to dotted keys: { a: { b: "x" } } → ["a.b"]. */
function keysOf(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === "object"
      ? keysOf(value as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe("i18n messages", () => {
  // A key present in one locale only renders as a raw "Namespace.key" string in
  // the other (that is how "BENTO.UNBEATEN" reached the homepage).
  it("defines the same keys in en and vi", () => {
    const enKeys = new Set(keysOf(en));
    const viKeys = new Set(keysOf(vi));
    expect([...enKeys].filter((k) => !viKeys.has(k)), "missing in vi").toEqual([]);
    expect([...viKeys].filter((k) => !enKeys.has(k)), "missing in en").toEqual([]);
  });
});

describe("translation keys used in source", () => {
  // Catches keys missing from BOTH locales, which parity cannot see. Static
  // calls only: `const t = useTranslations("Ns")` / `await getTranslations("Ns")`
  // followed by `t("literal.key")`; template-literal keys are skipped.
  it("all exist in en.json", async () => {
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
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
