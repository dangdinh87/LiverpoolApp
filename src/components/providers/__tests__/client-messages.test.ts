import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import type { AbstractIntlMessages } from "next-intl";
import en from "@/messages/en.json";
import vi from "@/messages/vi.json";
import {
  CLIENT_MESSAGE_NAMESPACES,
  pickClientMessages,
} from "../client-messages";

const SRC_ROOT = join(process.cwd(), "src");

function getAtPath(obj: unknown, dotPath: string): unknown {
  return dotPath.split(".").reduce<unknown>((acc, part) => {
    if (!acc || typeof acc !== "object" || Array.isArray(acc)) return undefined;
    return (acc as Record<string, unknown>)[part];
  }, obj);
}

function listSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "__tests__") continue;
      results.push(...listSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      results.push(full);
    }
  }
  return results;
}

function getTopDirective(sf: ts.SourceFile): "use client" | "use server" | null {
  for (const stmt of sf.statements) {
    if (!ts.isExpressionStatement(stmt) || !ts.isStringLiteral(stmt.expression)) {
      break;
    }
    const text = stmt.expression.text;
    if (text === "use client" || text === "use server") return text;
  }
  return null;
}

function resolveInternalModule(fromFile: string, specifier: string): string | null {
  let base: string | null = null;
  if (specifier.startsWith("@/")) {
    base = join(SRC_ROOT, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    base = resolve(dirname(fromFile), specifier);
  } else {
    return null;
  }

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ];
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

function collectRuntimeSpecifiers(sf: ts.SourceFile): string[] {
  const specifiers: string[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node)) {
      if (!node.importClause?.isTypeOnly && ts.isStringLiteral(node.moduleSpecifier)) {
        specifiers.push(node.moduleSpecifier.text);
      }
      return;
    }
    if (ts.isExportDeclaration(node)) {
      if (!node.isTypeOnly && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        specifiers.push(node.moduleSpecifier.text);
      }
      return;
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
      return;
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sf, visit);
  return specifiers;
}

describe("pickClientMessages", () => {
  it("deep-clones picked namespaces without mutating the source messages", () => {
    const source = {
      Auth: {
        login: { title: "Sign in" },
        register: { title: "Register" },
        metadata: { loginTitle: "Unused on client" },
      },
      Legal: { title: "Server only" },
    } as unknown as AbstractIntlMessages;

    const picked = pickClientMessages(source, ["Auth.login", "Auth.register", "Missing.ns"]);
    expect(picked).toEqual({
      Auth: {
        login: { title: "Sign in" },
        register: { title: "Register" },
      },
    });

    (picked.Auth as Record<string, Record<string, string>>).login.title = "Mutated";
    expect((source.Auth as Record<string, Record<string, string>>).login.title).toBe("Sign in");
  });

  it("merges overlapping parent and child namespaces cleanly", () => {
    const source = {
      Match: {
        live: "LIVE",
        liveCard: { venue: "Anfield" },
      },
    } as unknown as AbstractIntlMessages;

    expect(pickClientMessages(source, ["Match.liveCard", "Match"])).toEqual(source);
    expect(pickClientMessages(source, ["Match", "Match.liveCard"])).toEqual(source);
  });

  it("excludes heavy server-only namespaces and cuts serialized payload by >45%", () => {
    const clientEn = pickClientMessages(en as unknown as AbstractIntlMessages);
    const clientVi = pickClientMessages(vi as unknown as AbstractIntlMessages);

    for (const serverOnly of [
      "Legal",
      "History",
      "Footer",
      "Hero",
      "Bento",
      "Season",
      "Stats",
      "Analysis",
      "Calendar",
      "News.digest",
      "About.whatIs",
      "PlayerDetail.nationalities",
    ]) {
      expect(getAtPath(clientEn, serverOnly), `${serverOnly} in clientEn`).toBeUndefined();
      expect(getAtPath(clientVi, serverOnly), `${serverOnly} in clientVi`).toBeUndefined();
    }

    const fullEnBytes = Buffer.byteLength(JSON.stringify(en), "utf8");
    const pickedEnBytes = Buffer.byteLength(JSON.stringify(clientEn), "utf8");
    const fullViBytes = Buffer.byteLength(JSON.stringify(vi), "utf8");
    const pickedViBytes = Buffer.byteLength(JSON.stringify(clientVi), "utf8");

    expect(pickedEnBytes).toBeLessThan(fullEnBytes * 0.55);
    expect(pickedViBytes).toBeLessThan(fullViBytes * 0.55);
  });

  it("includes 100% of useTranslations namespaces and static keys across the transitive client module graph", () => {
    const allFiles = listSourceFiles(SRC_ROOT);
    const parsed = new Map<string, ts.SourceFile>();
    for (const file of allFiles) {
      const code = readFileSync(file, "utf8");
      parsed.set(
        file,
        ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS),
      );
    }

    // Seed BFS with every `"use client"` file and walk all runtime imports,
    // stopping only at `"use server"` action boundaries.
    const clientGraph = new Set<string>();
    const queue: string[] = [];
    for (const [file, sf] of parsed) {
      if (getTopDirective(sf) === "use client") {
        clientGraph.add(file);
        queue.push(file);
      }
    }
    expect(clientGraph.size).toBeGreaterThan(20);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const sf = parsed.get(current);
      if (!sf) continue;
      for (const spec of collectRuntimeSpecifiers(sf)) {
        const target = resolveInternalModule(current, spec);
        if (!target || clientGraph.has(target)) continue;
        const targetSf = parsed.get(target);
        if (!targetSf || getTopDirective(targetSf) === "use server") continue;
        clientGraph.add(target);
        queue.push(target);
      }
    }

    const clientEn = pickClientMessages(en as unknown as AbstractIntlMessages);
    const clientVi = pickClientMessages(vi as unknown as AbstractIntlMessages);

    const dynamicCalls: string[] = [];
    const missingNamespaces: string[] = [];
    const missingStaticKeys: string[] = [];
    const usedNamespaces = new Set<string>();

    for (const file of clientGraph) {
      const sf = parsed.get(file)!;
      const rel = file.slice(SRC_ROOT.length + 1);

      const walkScope = (node: ts.Node, env: Map<string, string>) => {
        let localEnv = env;

        if (ts.isBlock(node) || ts.isSourceFile(node)) {
          localEnv = new Map(env);
          for (const stmt of node.statements) {
            if (ts.isVariableStatement(stmt)) {
              for (const decl of stmt.declarationList.declarations) {
                if (
                  ts.isIdentifier(decl.name) &&
                  decl.initializer &&
                  ts.isCallExpression(decl.initializer) &&
                  ts.isIdentifier(decl.initializer.expression) &&
                  decl.initializer.expression.text === "useTranslations"
                ) {
                  const arg = decl.initializer.arguments[0];
                  if (arg && ts.isStringLiteral(arg)) {
                    localEnv.set(decl.name.text, arg.text);
                  }
                }
              }
            }
          }
        }

        if (ts.isCallExpression(node)) {
          if (ts.isIdentifier(node.expression)) {
            const fnName = node.expression.text;
            if (fnName === "useMessages") {
              dynamicCalls.push(`${rel}: useMessages() requires full messages object`);
            } else if (fnName === "useTranslations") {
              const arg = node.arguments[0];
              if (!arg || !ts.isStringLiteral(arg)) {
                dynamicCalls.push(`${rel}: useTranslations() must pass a string literal namespace`);
              } else {
                const ns = arg.text;
                usedNamespaces.add(ns);
                if (getAtPath(clientEn, ns) === undefined) {
                  missingNamespaces.push(`${rel}: ${ns} missing in pickClientMessages(en)`);
                }
                if (getAtPath(clientVi, ns) === undefined) {
                  missingNamespaces.push(`${rel}: ${ns} missing in pickClientMessages(vi)`);
                }
              }
            } else if (localEnv.has(fnName)) {
              const ns = localEnv.get(fnName)!;
              const keyArg = node.arguments[0];
              if (keyArg && ts.isStringLiteral(keyArg)) {
                const fullKey = `${ns}.${keyArg.text}`;
                if (getAtPath(clientEn, fullKey) === undefined) {
                  missingStaticKeys.push(`${rel}: ${fullKey} missing in pickClientMessages(en)`);
                }
                if (getAtPath(clientVi, fullKey) === undefined) {
                  missingStaticKeys.push(`${rel}: ${fullKey} missing in pickClientMessages(vi)`);
                }
              }
            }
          } else if (
            ts.isPropertyAccessExpression(node.expression) &&
            ts.isIdentifier(node.expression.expression) &&
            ["rich", "raw", "markup", "has"].includes(node.expression.name.text) &&
            localEnv.has(node.expression.expression.text)
          ) {
            const ns = localEnv.get(node.expression.expression.text)!;
            const keyArg = node.arguments[0];
            if (keyArg && ts.isStringLiteral(keyArg)) {
              const fullKey = `${ns}.${keyArg.text}`;
              if (getAtPath(clientEn, fullKey) === undefined) {
                missingStaticKeys.push(`${rel}: ${fullKey} missing in pickClientMessages(en)`);
              }
              if (getAtPath(clientVi, fullKey) === undefined) {
                missingStaticKeys.push(`${rel}: ${fullKey} missing in pickClientMessages(vi)`);
              }
            }
          }
        }

        ts.forEachChild(node, (child) => walkScope(child, localEnv));
      };

      walkScope(sf, new Map());
    }

    expect(dynamicCalls).toEqual([]);
    expect(missingNamespaces).toEqual([]);
    expect(missingStaticKeys).toEqual([]);

    // Also guard against stale entries in CLIENT_MESSAGE_NAMESPACES that aren't
    // actually used by any module in the client graph.
    const unusedAllowlistEntries = CLIENT_MESSAGE_NAMESPACES.filter(
      (entry) =>
        ![...usedNamespaces].some(
          (used) => used === entry || used.startsWith(`${entry}.`),
        ),
    );
    expect(unusedAllowlistEntries).toEqual([]);
  });
});
