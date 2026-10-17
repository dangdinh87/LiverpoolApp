// Runs after `next build`, before OpenNext bundles the Node middleware (proxy.ts).
//
// Next's tracer does `require('@opentelemetry/api')`. The package is in
// node_modules here (a dependency of `ai`), so OpenNext does not alias it to
// Next's compiled copy; but Next's file trace for the middleware only lists
// `api/build/src`, while esbuild resolves the `module` entry (`api/build/esm`).
// The bundle then fails with: Could not resolve "@opentelemetry/api".
// Adding the esm files to the middleware's trace lets OpenNext copy them.
import { cpSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const traceFile = path.resolve(".next/server/middleware.js.nft.json");
const esmDir = path.resolve("node_modules/@opentelemetry/api/build/esm");

if (!existsSync(traceFile) || !existsSync(esmDir)) {
  console.log("[cf-patch-middleware-trace] nothing to patch");
  process.exit(0);
}

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const trace = JSON.parse(readFileSync(traceFile, "utf8"));
const known = new Set(trace.files);
const extra = [path.resolve("node_modules/@opentelemetry/api/package.json"), ...walk(esmDir)]
  .map((file) => path.relative(path.dirname(traceFile), file))
  .filter((rel) => !known.has(rel));

trace.files.push(...extra);
writeFileSync(traceFile, JSON.stringify(trace));

// OpenNext copies the traced files out of the standalone output, which Next built
// from the original trace (src only), so the esm files must be there too.
const standaloneEsm = path.resolve(".next/standalone/node_modules/@opentelemetry/api/build/esm");
if (existsSync(path.dirname(standaloneEsm))) cpSync(esmDir, standaloneEsm, { recursive: true });
console.log(`[cf-patch-middleware-trace] added ${extra.length} @opentelemetry/api files to the middleware trace`);
