/**
 * After `opennextjs-cloudflare deploy`: hand every R2 incremental-cache folder older than the
 * previous build to a lifecycle rule, so R2 deletes it within about a day.
 *
 * OpenNext keys the cache `incremental-cache/<buildId>/<hash>.cache|.fetch` and never removes an
 * old build's folder; on 26/10/2026 the bucket held six builds, 8 GB. The REST API deletes one
 * object per request (1200 req / 5 min), hence lifecycle rules instead of deletes. Same approach
 * as cv-app's scripts/cf-prune-r2-cache.ts.
 *
 *   npx tsx scripts/cf-prune-r2-cache.ts --bucket liverpool-app-next-cache            # dry run
 *   npx tsx scripts/cf-prune-r2-cache.ts --bucket liverpool-app-next-cache --apply    # write rules
 *   ... --keep <buildId>   # without a local .open-next build (one-off cleanup from a laptop)
 *
 * Needs CLOUDFLARE_API_TOKEN (Workers R2 Storage: Edit) and CLOUDFLARE_ACCOUNT_ID.
 */
import { readdirSync } from "node:fs";
import path from "node:path";

const API = "https://api.cloudflare.com/client/v4";
const CACHE_ROOT = "incremental-cache/";
const RULE_ID_PREFIX = "prune-build-";
/** Objects in an old build folder are already older than this, so the rule fires on R2's next pass. */
const EXPIRE_AFTER_SECONDS = 86_400;

type BuildFolder = { prefix: string; newestAt: number };
type LifecycleRule = {
  id: string;
  enabled: boolean;
  conditions: { prefix: string };
  [other: string]: unknown;
};
type Envelope<T> = {
  success: boolean;
  errors?: { message: string }[];
  result: T;
  result_info?: { cursor?: string; is_truncated?: boolean; delimited?: string[] };
};

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const bucket = flag("--bucket");
const apply = args.includes("--apply");
const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;

async function cf<T>(urlPath: string, init: RequestInit = {}): Promise<Envelope<T>> {
  const res = await fetch(`${API}/accounts/${account}/r2/buckets/${bucket}${urlPath}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...init.headers },
  });
  const body = (await res.json()) as Envelope<T>;
  if (!res.ok || !body.success) {
    throw new Error(`${init.method ?? "GET"} ${urlPath}: HTTP ${res.status} ${body.errors?.map((e) => e.message).join("; ") ?? ""}`);
  }
  return body;
}

/** The build just uploaded by populate-cache, i.e. the only folder under .open-next/cache/. */
function currentBuildId(): string {
  const explicit = flag("--keep");
  if (explicit) return explicit;
  const dir = path.join(process.cwd(), ".open-next", "cache");
  const ids = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "__fetch")
    .map((d) => d.name);
  if (ids.length !== 1) throw new Error(`expected one build folder in ${dir}, found ${ids.length}: ${ids.join(", ")}`);
  return ids[0];
}

async function buildFolders(): Promise<BuildFolder[]> {
  const prefixes: string[] = [];
  let cursor: string | undefined;
  do {
    const q = new URLSearchParams({ prefix: CACHE_ROOT, delimiter: "/", per_page: "1000", ...(cursor ? { cursor } : {}) });
    const page = await cf<unknown[]>(`/objects?${q}`);
    prefixes.push(...(page.result_info?.delimited ?? []));
    cursor = page.result_info?.is_truncated ? page.result_info.cursor : undefined;
  } while (cursor);
  // A build's prerender set is uploaded together, so its first object dates the folder.
  return Promise.all(
    prefixes.map(async (prefix) => {
      const page = await cf<{ last_modified?: string }[]>(`/objects?${new URLSearchParams({ prefix, per_page: "1" })}`);
      return { prefix, newestAt: Date.parse(page.result[0]?.last_modified ?? "") || 0 };
    }),
  );
}

/** Keep the current build plus the newest other one (a `wrangler rollback` target keeps its cache). */
function planPrune(folders: BuildFolder[], buildId: string): { keep: string[]; expire: string[] } {
  const current = `${CACHE_ROOT}${buildId}/`;
  const others = folders.filter((f) => f.prefix !== current).sort((a, b) => b.newestAt - a.newestAt);
  return { keep: [current, ...others.slice(0, 1).map((f) => f.prefix)], expire: others.slice(1).map((f) => f.prefix) };
}

/** Rules not ours stay untouched (PUT replaces the whole set); each folder to expire gets one rule. */
function mergeRules(existing: LifecycleRule[], expire: string[], live: string[]): LifecycleRule[] {
  const ours = (r: LifecycleRule) => r.id.startsWith(RULE_ID_PREFIX);
  const kept = existing.filter((r) => !ours(r) || (live.includes(r.conditions.prefix) && expire.includes(r.conditions.prefix)));
  const covered = new Set(kept.filter(ours).map((r) => r.conditions.prefix));
  const added = expire
    .filter((prefix) => !covered.has(prefix))
    .map<LifecycleRule>((prefix) => ({
      id: `${RULE_ID_PREFIX}${prefix.slice(CACHE_ROOT.length, -1)}`.slice(0, 64),
      enabled: true,
      conditions: { prefix },
      deleteObjectsTransition: { condition: { type: "Age", maxAge: EXPIRE_AFTER_SECONDS } },
    }));
  return [...kept, ...added];
}

const ruleKey = (rs: LifecycleRule[]) => rs.map((r) => `${r.id}|${r.conditions.prefix}|${r.enabled}`).sort().join("\n");

async function main() {
  if (!bucket || !token || !account) throw new Error("usage: --bucket <name> with CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID set");
  const buildId = currentBuildId();
  const folders = await buildFolders();
  if (!folders.some((f) => f.prefix === `${CACHE_ROOT}${buildId}/`)) {
    throw new Error(`build ${buildId} has no folder in ${bucket}; refusing to expire anything`);
  }
  const { keep, expire } = planPrune(folders, buildId);
  const existing = (await cf<{ rules?: LifecycleRule[] }>("/lifecycle")).result.rules ?? [];
  const next = mergeRules(existing, expire, folders.map((f) => f.prefix));

  console.log(`bucket ${bucket} · current build ${buildId} · ${folders.length} build folders`);
  for (const f of [...folders].sort((a, b) => b.newestAt - a.newestAt)) {
    console.log(`  ${keep.includes(f.prefix) ? "keep  " : "expire"} ${f.prefix}  ${f.newestAt ? new Date(f.newestAt).toISOString() : "?"}`);
  }
  if (ruleKey(existing) === ruleKey(next)) return console.log("lifecycle rules already match, nothing to write");
  if (!apply) return console.log(`(dry run) would write ${next.length} lifecycle rules — add --apply`);
  await cf("/lifecycle", { method: "PUT", body: JSON.stringify({ rules: next }) });
  console.log(`wrote ${next.length} lifecycle rules; R2 removes ${expire.length} old build folders within about a day`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
