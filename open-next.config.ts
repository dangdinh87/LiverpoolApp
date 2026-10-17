import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

// Same setup as cv-app (proven on this account since 2026-10-15).
const config = defineCloudflareConfig({
  // ISR pages live in R2; hot ones are answered from the data center's Cache API
  // and refreshed from R2 in the background, so a slow R2 read never blocks a reader.
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
  // revalidateTag / revalidatePath bookkeeping (the hourly news sync busts "news").
  tagCache: d1NextTagCache,
  // Time-based ISR refreshes run through a Durable Object queue, deduplicated.
  queue: doQueue,
  // Serve cached ISR pages before loading the Next.js server: a cache hit on a
  // cold isolate skips evaluating the server bundle (the largest CPU saving).
  enableCacheInterception: true,
});

// `next build`, then complete the middleware's file trace before OpenNext bundles
// it (see scripts/cf-patch-middleware-trace.mjs). OpenNext passes its standalone
// build env to this command.
config.buildCommand = "npx next build && node scripts/cf-patch-middleware-trace.mjs";

export default config;
